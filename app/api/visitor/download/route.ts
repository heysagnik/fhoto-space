import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { spaces, photos, analyticsEvents } from "@/lib/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { getObject } from "@/lib/r2"
import archiver from "archiver"
import { PassThrough } from "stream"

const bodySchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1).max(200),
  spaceId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { photoIds, spaceId } = parsed.data

  const [space] = await db.select({ status: spaces.status }).from(spaces).where(eq(spaces.id, spaceId))
  if (!space || space.status !== "active") {
    return NextResponse.json({ error: "Space not available" }, { status: 403 })
  }

  const photoRows = await db
    .select({ id: photos.id, originalKey: photos.originalKey })
    .from(photos)
    .where(and(inArray(photos.id, photoIds), eq(photos.spaceId, spaceId)))

  void db.insert(analyticsEvents).values({
    spaceId,
    eventType: "bulk_download",
    meta: String(photoRows.length),
  })

  const archive = archiver("zip", { zlib: { level: 1 } })
  const passThrough = new PassThrough()
  archive.pipe(passThrough)

  const CONCURRENCY = 5
  async function fetchAndAppend(photo: { id: string; originalKey: string }, index: number) {
    const buf = await getObject(photo.originalKey)
    archive.append(buf, { name: `photo-${index + 1}.jpg` })
  }

  const pool: Promise<void>[] = []
  for (let i = 0; i < photoRows.length; i++) {
    const p = fetchAndAppend(photoRows[i], i)
    pool.push(p)
    if (pool.length >= CONCURRENCY) await Promise.race(pool).then(() => pool.splice(0, pool.length, ...pool.filter(x => x !== p)))
  }
  await Promise.all(pool)
  archive.finalize()

  return new Response(passThrough as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="fotospace-photos.zip"`,
      "Transfer-Encoding": "chunked",
    },
  })
}
