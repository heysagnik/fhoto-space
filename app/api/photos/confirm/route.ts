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
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

const MAX_RETRIES = 4
const BASE_DELAY_MS = 500

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
      // Exponential backoff: 500ms, 1000ms, 2000ms
      await new Promise((r) => setTimeout(r, BASE_DELAY_MS * 2 ** attempt))
    }
  }
  throw lastErr
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { photoId, spaceId, sizeBytes, width, height } = parsed.data

  const [photo] = await db.select().from(photos).where(eq(photos.id, photoId))
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId))
  if (!space || space.photographerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await db.update(photos).set({ sizeBytes, width, height }).where(eq(photos.id, photoId))

  // Generate thumbnail
  const original = await getObject(photo.originalKey)
  const thumbBuffer = await sharp(original)
    .resize(1200, 1200, { fit: "inside" })
    .jpeg({ quality: 85 })
    .toBuffer()

  const thumbnailKey = `spaces/${spaceId}/thumbs/${photoId}.jpg`
  await putObject(thumbnailKey, thumbBuffer, "image/jpeg")
  await db.update(photos).set({ thumbnailKey }).where(eq(photos.id, photoId))

  // Index faces — retry on Rekognition throttle (bulk uploads hit 5 TPS limit)
  try {
    const faces = await indexFacesWithRetry(spaceId, photoId, thumbBuffer)

    // Pre-generate the primary face crop and store in R2 to avoid per-request sharp processing
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
    console.error("[confirm] rekognition indexFaces failed after retries:", err)
    await db.update(photos).set({ faceIndexed: true, faceCount: 0 }).where(eq(photos.id, photoId))
  }

  // Invalidate the cluster cache so the next faces load recomputes
  await db
    .update(spaces)
    .set({ clustersCachedAt: null })
    .where(eq(spaces.id, spaceId))

  return NextResponse.json({ ok: true })
}
