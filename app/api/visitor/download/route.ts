import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { spaces, photos } from "@/lib/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { getPresignedDownloadUrl } from "@/lib/r2"

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

  const [spaceRow] = await db.select({ status: spaces.status }).from(spaces).where(eq(spaces.id, spaceId))
  if (!spaceRow || spaceRow.status !== "active") {
    return NextResponse.json({ error: "Space not available" }, { status: 403 })
  }

  const photoRows = await db
    .select({ id: photos.id, originalKey: photos.originalKey })
    .from(photos)
    .where(and(inArray(photos.id, photoIds), eq(photos.spaceId, spaceId)))

  // Return presigned URLs — client downloads directly from R2, no server proxying
  const urls = await Promise.all(
    photoRows.map(async (p) => ({
      id: p.id,
      url: await getPresignedDownloadUrl(p.originalKey!, 900), // 15 min
    }))
  )

  return NextResponse.json({ urls })
}
