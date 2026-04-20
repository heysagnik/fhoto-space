import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { photos, spaces, faceEmbeddings } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { eq, inArray } from "drizzle-orm"
import { deleteObject } from "@/lib/r2"
import { z } from "zod"

const bodySchema = z.object({ photoIds: z.array(z.string().uuid()).min(1) })

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { photoIds } = parsed.data

  const rows = await db.select().from(photos).where(inArray(photos.id, photoIds))
  if (rows.length === 0) return NextResponse.json({ ok: true })

  // Verify ownership via first photo's space
  const spaceId = rows[0].spaceId
  const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId))
  if (!space || space.photographerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await Promise.allSettled(
    rows.flatMap((p) => [
      deleteObject(p.originalKey),
      p.thumbnailKey ? deleteObject(p.thumbnailKey) : Promise.resolve(),
    ])
  )

  await db.delete(faceEmbeddings).where(inArray(faceEmbeddings.photoId, photoIds))
  await db.delete(photos).where(inArray(photos.id, photoIds))

  return NextResponse.json({ ok: true })
}
