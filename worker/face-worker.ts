/**
 * Standalone face-indexing worker.
 * Deploy on Render as a Background Worker (free tier).
 * Start command: npm run worker
 *
 * Env vars needed (same .env.local as main app):
 *   DATABASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 *   R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 */

import "dotenv/config"
import { PgBoss } from "pg-boss"
import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { eq } from "drizzle-orm"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import * as ort from "onnxruntime-node"
import sharp from "sharp"
import path from "path"

// ─── DB ───────────────────────────────────────────────────────────────────────

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

import { photos, faceEmbeddings } from "../lib/db/schema"

// ─── R2 ───────────────────────────────────────────────────────────────────────

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
})

async function getObject(key: string): Promise<Buffer> {
  const res = await r2.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }))
  const chunks = await res.Body!.transformToByteArray()
  return Buffer.from(chunks)
}

// ─── ONNX face pipeline ───────────────────────────────────────────────────────

const REFERENCE_LANDMARKS: [number, number][] = [
  [38.3, 51.7], [73.5, 51.5], [56.0, 71.7], [41.6, 92.4], [70.8, 92.2],
]

let _sessions: { detector: ort.InferenceSession; recognizer: ort.InferenceSession } | null = null

async function getSessions() {
  if (_sessions) return _sessions
  const modelsDir = path.resolve(process.cwd(), "public", "models")
  const [detector, recognizer] = await Promise.all([
    ort.InferenceSession.create(path.join(modelsDir, "det_500m.onnx"), { executionProviders: ["cpu"] }),
    ort.InferenceSession.create(path.join(modelsDir, "w600k_mbf.onnx"), { executionProviders: ["cpu"] }),
  ])
  _sessions = { detector, recognizer }
  return _sessions
}

function buildCHW(data: Buffer, w: number, h: number, ch: number): Float32Array {
  const pixels = w * h
  const chw = new Float32Array(ch * pixels)
  for (let i = 0; i < pixels; i++)
    for (let c = 0; c < ch; c++)
      chw[c * pixels + i] = (data[i * ch + c] - 127.5) / 128.0
  return chw
}

function l2normalize(vec: Float32Array): number[] {
  let sum = 0
  for (const v of vec) sum += v * v
  const norm = Math.sqrt(sum)
  return Array.from(vec).map((v) => v / norm)
}

function computeAffineCoeffs(src: [number, number][], dst: [number, number][]): number[] {
  const n = src.length
  let sx = 0, sy = 0, dx = 0, dy = 0, sxx = 0, sxy = 0, syx = 0, syy = 0
  for (let i = 0; i < n; i++) {
    sx += src[i][0]; sy += src[i][1]; dx += dst[i][0]; dy += dst[i][1]
    sxx += src[i][0] * dst[i][0]; sxy += src[i][0] * dst[i][1]
    syx += src[i][1] * dst[i][0]; syy += src[i][1] * dst[i][1]
  }
  const w2 = (sxx + syy - (sx * dx + sy * dy) / n) / ((sxx * sxx + syy * syy - (sx * sx + sy * sy) / n) + 1e-8)
  const b = (sxy - syx) / n - w2 * (sx * sy - sy * sx) / n
  const tx = dx / n - w2 * sx / n - b * sy / n
  const ty = dy / n - w2 * sy / n + b * sx / n
  return [w2, b, tx, ty]
}

function parseSCRFDOutputs(
  scores8: Float32Array, scores16: Float32Array, scores32: Float32Array,
  _b8: Float32Array, _b16: Float32Array, _b32: Float32Array,
  kps8: Float32Array, kps16: Float32Array, kps32: Float32Array,
  inputSize: number, threshold: number
): Array<{ landmarks: [number, number][] }> {
  const strides = [8, 16, 32]
  const scoreArrays = [scores8, scores16, scores32]
  const kpsArrays = [kps8, kps16, kps32]
  const faces: Array<{ score: number; landmarks: [number, number][] }> = []
  for (let si = 0; si < strides.length; si++) {
    const stride = strides[si], scores = scoreArrays[si], kps = kpsArrays[si]
    const fh = Math.floor(inputSize / stride), fw = fh
    for (let h = 0; h < fh; h++) for (let w = 0; w < fw; w++) for (let a = 0; a < 2; a++) {
      const idx = (h * fw + w) * 2 + a
      if (scores[idx] < threshold) continue
      const kpsOffset = idx * 10
      const landmarks: [number, number][] = []
      for (let k = 0; k < 5; k++)
        landmarks.push([(kps[kpsOffset + k * 2] + w) * stride, (kps[kpsOffset + k * 2 + 1] + h) * stride])
      faces.push({ score: scores[idx], landmarks })
    }
  }
  return faces
}

async function extractEmbeddings(imageBuffer: Buffer): Promise<number[][]> {
  const { detector, recognizer } = await getSessions()

  const resized = await sharp(imageBuffer)
    .resize(640, 640, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
    .removeAlpha().toFormat("png").toBuffer()

  const { data, info } = await sharp(resized).raw().toBuffer({ resolveWithObject: true })
  const chw = buildCHW(data, info.width, info.height, info.channels)
  const inputTensor = new ort.Tensor("float32", chw, [1, 3, 640, 640])
  const det = await detector.run({ "input.1": inputTensor })
  const k = detector.outputNames

  const faces = parseSCRFDOutputs(
    det[k[0]].data as Float32Array, det[k[1]].data as Float32Array, det[k[2]].data as Float32Array,
    det[k[3]].data as Float32Array, det[k[4]].data as Float32Array, det[k[5]].data as Float32Array,
    det[k[6]].data as Float32Array, det[k[7]].data as Float32Array, det[k[8]].data as Float32Array,
    640, 0.5
  )

  const embeddings: number[][] = []
  for (const face of faces) {
    const [w2, b, tx, ty] = computeAffineCoeffs(face.landmarks, REFERENCE_LANDMARKS)
    const affineBuf = await sharp(resized)
      .affine([w2, -b, b, w2], { odx: tx, ody: ty, background: { r: 0, g: 0, b: 0 } })
      .toFormat("png").toBuffer()
    const faceData = await sharp(affineBuf)
      .resize(112, 112, { fit: "fill" }).removeAlpha().raw().toBuffer()
    const faceTensor = new ort.Tensor("float32", buildCHW(faceData, 112, 112, 3), [1, 3, 112, 112])
    const rec = await recognizer.run({ "input.1": faceTensor })
    embeddings.push(l2normalize(rec[Object.keys(rec)[0]].data as Float32Array))
  }
  return embeddings
}

// ─── Worker ───────────────────────────────────────────────────────────────────

interface FaceIndexJob { photoId: string; spaceId: string; thumbnailKey: string }

async function processJobs(jobs: Array<{ data: FaceIndexJob }>) {
  for (const job of jobs) {
    const { photoId, spaceId, thumbnailKey } = job.data
    console.log(`[worker] indexing photo ${photoId}`)
    try {
      const buffer = await getObject(thumbnailKey)
      const embeddingsList = await extractEmbeddings(buffer)

      if (embeddingsList.length > 0) {
        await db.insert(faceEmbeddings).values(
          embeddingsList.map((embedding) => ({ photoId, spaceId, embedding }))
        )
      }

      await db.update(photos)
        .set({ faceIndexed: true, faceCount: embeddingsList.length })
        .where(eq(photos.id, photoId))

      console.log(`[worker] done — ${embeddingsList.length} face(s) for photo ${photoId}`)
    } catch (err) {
      console.error(`[worker] error for photo ${photoId}:`, err)
      await db.update(photos).set({ faceIndexed: true, faceCount: 0 }).where(eq(photos.id, photoId))
      throw err
    }
  }
}

async function main() {
  console.log("[worker] starting face-index worker")
  const boss = new PgBoss(process.env.DATABASE_URL!)
  await boss.start()
  console.log("[worker] pg-boss started, waiting for jobs…")

  await boss.work<FaceIndexJob>("face-index", { localConcurrency: 2 }, processJobs)

  process.on("SIGTERM", async () => {
    console.log("[worker] SIGTERM — stopping")
    await boss.stop()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error("[worker] fatal:", err)
  process.exit(1)
})
