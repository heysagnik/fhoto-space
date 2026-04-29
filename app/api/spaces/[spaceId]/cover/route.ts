import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { spaces } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { eq } from "drizzle-orm"
import { getPresignedUploadUrl, deleteObject, publicUrl } from "@/lib/r2"
import { v4 as uuid } from "uuid"

type Params = { params: Promise<{ spaceId: string }> }

async function getOwnedSpace(spaceId: string, userId: string) {
  const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId))
  if (!space || space.photographerId !== userId) return null
  return space
}

// Step 1: get a presigned PUT URL to upload the cover directly to R2
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { spaceId } = await params
  const space = await getOwnedSpace(spaceId, session.user.id)
  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const key = `spaces/${spaceId}/cover/${uuid()}.jpg`
  const uploadUrl = await getPresignedUploadUrl(key, "image/jpeg")

  return NextResponse.json({ uploadUrl, key })
}

// Step 2: after direct R2 upload, confirm and save to DB
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { spaceId } = await params
  const space = await getOwnedSpace(spaceId, session.user.id)
  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { key } = await req.json() as { key: string }
  if (!key || !key.startsWith(`spaces/${spaceId}/cover/`)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 })
  }

  // Delete old cover if present
  if (space.coverImageKey) {
    await deleteObject(space.coverImageKey).catch(() => {})
  }

  const coverImageUrl = publicUrl(key)

  await db.update(spaces)
    .set({ coverImageKey: key, coverImageUrl, updatedAt: new Date() })
    .where(eq(spaces.id, spaceId))

  return NextResponse.json({ coverImageUrl })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { spaceId } = await params
  const space = await getOwnedSpace(spaceId, session.user.id)
  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (space.coverImageKey) {
    await deleteObject(space.coverImageKey)
  }

  await db.update(spaces)
    .set({ coverImageKey: null, coverImageUrl: null, updatedAt: new Date() })
    .where(eq(spaces.id, spaceId))

  return NextResponse.json({ ok: true })
}
