import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { spaces } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { eq } from "drizzle-orm"
import { putObject, deleteObject, publicUrl } from "@/lib/r2"
import { v4 as uuid } from "uuid"
import sharp from "sharp"

type Params = { params: Promise<{ spaceId: string }> }

async function getOwnedSpace(spaceId: string, userId: string) {
  const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId))
  if (!space || space.photographerId !== userId) return null
  return space
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { spaceId } = await params
  const space = await getOwnedSpace(spaceId, session.user.id)
  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }

  if (!["image/jpeg", "image/png"].includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG or PNG allowed" }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const processed = await sharp(buffer)
    .resize(1200, 630, { fit: "cover" })
    .jpeg({ quality: 90 })
    .toBuffer()

  const key = `spaces/${spaceId}/cover/${uuid()}.jpg`
  await putObject(key, processed, "image/jpeg")

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
