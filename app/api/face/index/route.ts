import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { photos, faceEmbeddings } from "@/lib/db/schema"
import { getObject } from "@/lib/r2"
import { extractEmbeddings } from "@/lib/face/pipeline"
import { eq } from "drizzle-orm"

const bodySchema = z.object({
  photoId: z.string().uuid(),
  spaceId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  if (req.headers.get("x-face-secret") !== process.env.FACE_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { photoId, spaceId } = parsed.data

  const [photo] = await db.select().from(photos).where(eq(photos.id, photoId))
  if (!photo || !photo.thumbnailKey) {
    return NextResponse.json({ error: "Photo or thumbnail not found" }, { status: 404 })
  }

  const buffer = await getObject(photo.thumbnailKey)
  const embeddingsList = await extractEmbeddings(buffer)

  if (embeddingsList.length === 0) {
    await db.update(photos)
      .set({ faceIndexed: true, faceCount: 0 })
      .where(eq(photos.id, photoId))
    return NextResponse.json({ indexed: 0 })
  }

  const rows = embeddingsList.map((embedding) => ({
    photoId,
    spaceId,
    embedding,
  }))

  await db.insert(faceEmbeddings).values(rows)

  await db.update(photos)
    .set({ faceIndexed: true, faceCount: embeddingsList.length })
    .where(eq(photos.id, photoId))

  return NextResponse.json({ indexed: embeddingsList.length })
}
