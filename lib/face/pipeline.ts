import sharp from "sharp"
import * as ort from "onnxruntime-node"
import { getSessions } from "./model"

const REFERENCE_LANDMARKS = [
  [38.3, 51.7],
  [73.5, 51.5],
  [56.0, 71.7],
  [41.6, 92.4],
  [70.8, 92.2],
]

function buildCHW(data: Buffer, width: number, height: number, channels: number): Float32Array {
  const pixels = width * height
  const chw = new Float32Array(channels * pixels)
  for (let i = 0; i < pixels; i++) {
    for (let c = 0; c < channels; c++) {
      chw[c * pixels + i] = (data[i * channels + c] - 127.5) / 128.0
    }
  }
  return chw
}

function l2normalize(vec: Float32Array): number[] {
  let sum = 0
  for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i]
  const norm = Math.sqrt(sum)
  const out: number[] = new Array(vec.length)
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm
  return out
}

type Landmark = [number, number]

function computeAffineCoeffs(src: Landmark[], dst: Landmark[]): number[] {
  const n = src.length
  let sx = 0, sy = 0, dx = 0, dy = 0, sxx = 0, sxy = 0, syx = 0, syy = 0

  for (let i = 0; i < n; i++) {
    sx += src[i][0]; sy += src[i][1]
    dx += dst[i][0]; dy += dst[i][1]
    sxx += src[i][0] * dst[i][0]
    sxy += src[i][0] * dst[i][1]
    syx += src[i][1] * dst[i][0]
    syy += src[i][1] * dst[i][1]
  }

  const w = (sxx + syy - (sx * dx + sy * dy) / n) / (sxx * sxx + syy * syy - (sx * sx + sy * sy) / n + 1e-8)
  const a = (sxx + syy) / n - w * (sx * sx + sy * sy) / n
  const b = (sxy - syx) / n - w * (sx * sy - sy * sx) / n
  const tx = dx / n - w * sx / n - b * sy / n
  const ty = dy / n - w * sy / n + b * sx / n

  return [w, b, tx, ty]
}

function parseSCRFDOutputs(
  scores8: Float32Array, scores16: Float32Array, scores32: Float32Array,
  bboxes8: Float32Array, bboxes16: Float32Array, bboxes32: Float32Array,
  kps8: Float32Array, kps16: Float32Array, kps32: Float32Array,
  inputSize: number,
  threshold: number,
): Array<{ landmarks: Landmark[] }> {
  const strides = [8, 16, 32]
  const scoreArrays = [scores8, scores16, scores32]
  const bboxArrays = [bboxes8, bboxes16, bboxes32]
  const kpsArrays = [kps8, kps16, kps32]

  const faces: Array<{ score: number; landmarks: Landmark[] }> = []

  for (let si = 0; si < strides.length; si++) {
    const stride = strides[si]
    const scores = scoreArrays[si]
    const bboxes = bboxArrays[si]
    const kps = kpsArrays[si]
    const fh = Math.floor(inputSize / stride)
    const fw = Math.floor(inputSize / stride)
    const numAnchors = 2

    for (let h = 0; h < fh; h++) {
      for (let w = 0; w < fw; w++) {
        for (let a = 0; a < numAnchors; a++) {
          const idx = (h * fw + w) * numAnchors + a
          const score = scores[idx]
          if (score < threshold) continue

          const kpsOffset = idx * 5 * 2
          const landmarks: Landmark[] = []
          for (let k = 0; k < 5; k++) {
            const lx = (kps[kpsOffset + k * 2] + w) * stride
            const ly = (kps[kpsOffset + k * 2 + 1] + h) * stride
            landmarks.push([lx, ly])
          }

          faces.push({ score, landmarks })
        }
      }
    }
  }

  return faces
}

export async function extractEmbeddings(imageBuffer: Buffer): Promise<number[][]> {
  const { detector, recognizer } = await getSessions()

  // Keep the raw 640×640 RGB buffer — reused for face crops so the affine
  // transform operates on a bounded canvas regardless of original image size.
  const resized640 = await sharp(imageBuffer)
    .resize(640, 640, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
    .removeAlpha()
    .toFormat("png")
    .toBuffer()

  const { data: rawData, info } = await sharp(resized640)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const chw = buildCHW(rawData, info.width, info.height, info.channels)
  const inputTensor = new ort.Tensor("float32", chw, [1, 3, 640, 640])

  const detResults = await detector.run({ "input.1": inputTensor })

  // Output tensor names are model-specific numeric IDs (not symbolic names).
  // Actual order (confirmed by shape inspection):
  //   [0] scores8 [12800,1]  [1] scores16 [3200,1]  [2] scores32 [800,1]
  //   [3] bboxes8 [12800,4]  [4] bboxes16 [3200,4]  [5] bboxes32 [800,4]
  //   [6] kps8    [12800,10] [7] kps16    [3200,10]  [8] kps32    [800,10]
  const k = detector.outputNames
  const faces = parseSCRFDOutputs(
    detResults[k[0]].data as Float32Array,  // scores  stride 8
    detResults[k[1]].data as Float32Array,  // scores  stride 16
    detResults[k[2]].data as Float32Array,  // scores  stride 32
    detResults[k[3]].data as Float32Array,  // bboxes  stride 8
    detResults[k[4]].data as Float32Array,  // bboxes  stride 16
    detResults[k[5]].data as Float32Array,  // bboxes  stride 32
    detResults[k[6]].data as Float32Array,  // kps     stride 8
    detResults[k[7]].data as Float32Array,  // kps     stride 16
    detResults[k[8]].data as Float32Array,  // kps     stride 32
    640,
    0.5,
  )

  const embeddings: number[][] = []

  for (const face of faces) {
    const srcLandmarks = face.landmarks
    const dstLandmarks = REFERENCE_LANDMARKS as Landmark[]
    const [w, b, tx, ty] = computeAffineCoeffs(srcLandmarks, dstLandmarks)

    // Run affine on the already-normalized 640×640 buffer so the output canvas
    // is bounded, then force exactly 112×112 with { fit: "fill" }.
    // Affine then encode to PNG so the next sharp instance has a valid header,
    // then resize to exactly 112×112 with no aspect-ratio constraint.
    const affineBuf = await sharp(resized640)
      .affine([w, -b, b, w], { odx: tx, ody: ty, background: { r: 0, g: 0, b: 0 } })
      .toFormat("png")
      .toBuffer()

    const faceData = await sharp(affineBuf)
      .resize(112, 112, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer()

    const faceCHW = buildCHW(faceData, 112, 112, 3)
    const faceTensor = new ort.Tensor("float32", faceCHW, [1, 3, 112, 112])

    const recResults = await recognizer.run({ "input.1": faceTensor })
    const embeddingRaw = recResults[Object.keys(recResults)[0]].data as Float32Array
    const normalized = l2normalize(embeddingRaw)
    embeddings.push(normalized)
  }

  return embeddings
}
