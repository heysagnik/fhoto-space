import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { photos, spaces } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { updateSpaceSchema } from "@/lib/validations"
import { and, eq, ne } from "drizzle-orm"
import { deleteObject } from "@/lib/r2"
import { deleteFacesForPhoto } from "@/lib/rekognition"

type Params = { params: Promise<{ spaceId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { spaceId } = await params
  const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId))

  if (!space || space.photographerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(space)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { spaceId } = await params
  const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId))

  if (!space || space.photographerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSpaceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  if (parsed.data.slug && parsed.data.slug !== space.slug) {
    const [existing] = await db
      .select()
      .from(spaces)
      .where(and(eq(spaces.slug, parsed.data.slug), ne(spaces.id, spaceId)))

    if (existing) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 })
    }
  }

  const [updated] = await db
    .update(spaces)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(spaces.id, spaceId))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { spaceId } = await params
  const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId))

  if (!space || space.photographerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const spacePhotos = await db.select().from(photos).where(eq(photos.spaceId, spaceId))

  await Promise.allSettled([
    // Delete all photo R2 objects
    ...spacePhotos.flatMap((p) => [
      deleteObject(p.originalKey),
      p.thumbnailKey ? deleteObject(p.thumbnailKey) : Promise.resolve(),
      p.faceCropKey ? deleteObject(p.faceCropKey) : Promise.resolve(),
    ]),
    // Delete Rekognition face index entries
    ...spacePhotos
      .filter((p) => p.rekognitionFaceIds?.length)
      .map((p) => deleteFacesForPhoto(p.spaceId, p.rekognitionFaceIds as string[])),
    // Delete cover image
    space.coverImageKey ? deleteObject(space.coverImageKey) : Promise.resolve(),
  ])

  await db.delete(photos).where(eq(photos.spaceId, spaceId))
  await db.delete(spaces).where(eq(spaces.id, spaceId))

  return new NextResponse(null, { status: 204 })
}
