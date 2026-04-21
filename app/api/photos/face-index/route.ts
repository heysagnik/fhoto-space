import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { photos, spaces } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { getObject, putObject } from "@/lib/r2"
import { indexFaces } from "@/lib/rekognition"
import sharp from "sharp"

const bodySchema = z.object({
  photoId: z.string().uuid(),
  spaceId: z.string().uuid(),
})

const MAX_RETRIES = 6
const BASE_DELAY_MS = 400

async function indexFacesWithRetry(
  spaceId: string,
  photoId: string,
  thumbBuffer: Buffer,
) {
  let lastErr: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await indexFaces(spaceId, photoId, thumbBuffer)
    } catch (err: any) {
      lastErr = err
      const isThrottle =
        err.name === "ProvisionedThroughputExceededException" ||
        err.name === "ThrottlingException"
      if (!isThrottle || attempt === MAX_RETRIES - 1) break
      // Exponential backoff + full jitter to avoid thundering herd
      const cap = BASE_DELAY_MS * 2 ** attempt
      await new Promise((r) => setTimeout(r, Math.random() * cap))
    }
  }
  throw lastErr
}

async function runFaceIndex(photoId: string, spaceId: string): Promise<NextResponse> {
  const [photo] = await db.select().from(photos).where(eq(photos.id, photoId))
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!photo.thumbnailKey) return NextResponse.json({ error: "Thumbnail not ready" }, { status: 409 })

  try {
    const thumbBuffer = await getObject(photo.thumbnailKey)
    const faces = await indexFacesWithRetry(spaceId, photoId, thumbBuffer)

    let faceCropKey: string | undefined
    if (faces.length > 0) {
      const box = faces[0].boundingBox
      const { width: imgW, height: imgH } = await sharp(thumbBuffer).metadata()
      if (imgW && imgH) {
        const pad = 0.4
        const faceW = box.width * imgW
        const faceH = box.height * imgH
        const cx = (box.left + box.width / 2) * imgW
        const cy = (box.top + box.height / 2) * imgH
        const cropW = Math.round(faceW * (1 + pad))
        const cropH = Math.round(faceH * (1 + pad))
        const left = Math.max(0, Math.round(cx - cropW / 2))
        const top = Math.max(0, Math.round(cy - cropH / 2))
        const width = Math.min(imgW - left, cropW)
        const height = Math.min(imgH - top, cropH)
        const cropBuffer = await sharp(thumbBuffer)
          .extract({ left, top, width, height })
          .resize(112, 112, { fit: "cover", position: "centre" })
          .jpeg({ quality: 90 })
          .toBuffer()
        faceCropKey = `spaces/${spaceId}/crops/${photoId}.jpg`
        await putObject(faceCropKey, cropBuffer, "image/jpeg")
      }
    }

    await db.update(photos)
      .set({
        faceIndexed: true,
        faceCount: faces.length,
        rekognitionFaceIds: faces.map((f) => f.faceId),
        faceBoundingBoxes: JSON.stringify(
          faces.map((f) => ({ faceId: f.faceId, ...f.boundingBox }))
        ),
        ...(faceCropKey ? { faceCropKey } : {}),
      })
      .where(eq(photos.id, photoId))
  } catch (err) {
    console.error("[face-index] rekognition failed:", err)
    await db.update(photos).set({ faceIndexed: true, faceCount: 0 }).where(eq(photos.id, photoId))
  }

  await db.update(spaces).set({ clustersCachedAt: null }).where(eq(spaces.id, spaceId))

  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const isCron =
    !!process.env.CRON_SECRET &&
    req.headers.get("x-cron-secret") === process.env.CRON_SECRET

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { photoId, spaceId } = parsed.data

  if (!isCron) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId))
    if (!space || space.photographerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  return runFaceIndex(photoId, spaceId)
}
