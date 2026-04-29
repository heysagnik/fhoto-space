import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { spaces, photos } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { eq, inArray, desc, lt, and } from "drizzle-orm"
import { publicUrl } from "@/lib/r2"

type Params = { params: Promise<{ spaceId: string }> }

const PAGE_SIZE = 100

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { spaceId } = await params
  const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId))
  if (!space || space.photographerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Optional filter: ?photoIds=id1,id2,... (face filter — returns all matching, no pagination)
  const photoIdsParam = req.nextUrl.searchParams.get("photoIds")
  const filterIds = photoIdsParam ? photoIdsParam.split(",").filter(Boolean) : null

  if (filterIds) {
    const rows = await db
      .select({
        id: photos.id,
        thumbnailKey: photos.thumbnailKey,
        originalKey: photos.originalKey,
        width: photos.width,
        height: photos.height,
        faceIndexed: photos.faceIndexed,
        faceCount: photos.faceCount,
        createdAt: photos.createdAt,
      })
      .from(photos)
      .where(inArray(photos.id, filterIds))
      .orderBy(desc(photos.createdAt))

    const result = rows
      .filter((r) => r.thumbnailKey)
      .map((r) => ({ ...r, thumbnailUrl: publicUrl(r.thumbnailKey!) }))

    return NextResponse.json({ photos: result, nextCursor: null })
  }

  // Cursor-based pagination: ?cursor=<createdAt ISO string of last item>
  const cursorParam = req.nextUrl.searchParams.get("cursor")
  const cursor = cursorParam ? new Date(cursorParam) : null

  const rows = await db
    .select({
      id: photos.id,
      thumbnailKey: photos.thumbnailKey,
      originalKey: photos.originalKey,
      width: photos.width,
      height: photos.height,
      faceIndexed: photos.faceIndexed,
      faceCount: photos.faceCount,
      createdAt: photos.createdAt,
    })
    .from(photos)
    .where(
      cursor
        ? and(eq(photos.spaceId, spaceId), lt(photos.createdAt, cursor))
        : eq(photos.spaceId, spaceId)
    )
    .orderBy(desc(photos.createdAt))
    .limit(PAGE_SIZE + 1)

  const hasMore = rows.length > PAGE_SIZE
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const nextCursor = hasMore ? page[page.length - 1].createdAt?.toISOString() ?? null : null

  const result = page
    .filter((r) => r.thumbnailKey)
    .map((r) => ({ ...r, thumbnailUrl: publicUrl(r.thumbnailKey!) }))

  return NextResponse.json({ photos: result, nextCursor })
}
