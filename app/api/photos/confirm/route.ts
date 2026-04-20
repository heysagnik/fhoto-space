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

  // Index faces with Rekognition (typically 200–600ms)
  try {
    const faces = await indexFaces(spaceId, photoId, thumbBuffer)
    await db.update(photos)
      .set({
        faceIndexed: true,
        faceCount: faces.length,
        rekognitionFaceIds: faces.map((f) => f.faceId),
        faceBoundingBoxes: JSON.stringify(
          faces.map((f) => ({ faceId: f.faceId, ...f.boundingBox }))
        ),
      })
      .where(eq(photos.id, photoId))
  } catch (err) {
    console.error("[confirm] rekognition indexFaces failed:", err)
    await db.update(photos).set({ faceIndexed: true, faceCount: 0 }).where(eq(photos.id, photoId))
  }

  return NextResponse.json({ ok: true })
}
