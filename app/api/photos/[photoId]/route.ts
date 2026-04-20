import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { photos, spaces } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { eq } from "drizzle-orm"
import { deleteObject } from "@/lib/r2"
import { deleteFacesForPhoto } from "@/lib/rekognition"

type Params = { params: Promise<{ photoId: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { photoId } = await params
  const [photo] = await db.select().from(photos).where(eq(photos.id, photoId))
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [space] = await db.select().from(spaces).where(eq(spaces.id, photo.spaceId))
  if (!space || space.photographerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await Promise.allSettled([
    deleteObject(photo.originalKey),
    photo.thumbnailKey ? deleteObject(photo.thumbnailKey) : Promise.resolve(),
    photo.rekognitionFaceIds?.length
      ? deleteFacesForPhoto(photo.spaceId, photo.rekognitionFaceIds as string[])
      : Promise.resolve(),
  ])

  await db.delete(photos).where(eq(photos.id, photoId))

  return NextResponse.json({ ok: true })
}
