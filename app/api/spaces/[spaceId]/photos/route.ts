import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { spaces, photos } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { eq, inArray, desc } from "drizzle-orm"
import { getPresignedDownloadUrl } from "@/lib/r2"

type Params = { params: Promise<{ spaceId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { spaceId } = await params
  const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId))
  if (!space || space.photographerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Optional filter: ?photoIds=id1,id2,...
  const photoIdsParam = req.nextUrl.searchParams.get("photoIds")
  const filterIds = photoIdsParam ? photoIdsParam.split(",").filter(Boolean) : null

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
      filterIds
        ? inArray(photos.id, filterIds)
        : eq(photos.spaceId, spaceId)
    )
    .orderBy(desc(photos.createdAt))

  const result = await Promise.all(
    rows
      .filter((r) => r.thumbnailKey)
      .map(async (r) => ({
        ...r,
        thumbnailUrl: await getPresignedDownloadUrl(r.thumbnailKey!),
      }))
  )

  return NextResponse.json({ photos: result })
}
