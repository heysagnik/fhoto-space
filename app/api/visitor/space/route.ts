import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { spaces, photos, analyticsEvents } from "@/lib/db/schema"
import { and, eq, ne, count } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 })

  const rows = await db
    .select({
      id: spaces.id,
      name: spaces.name,
      slug: spaces.slug,
      status: spaces.status,
      coverImageUrl: spaces.coverImageUrl,
      welcomeMessage: spaces.welcomeMessage,
      photoCount: count(photos.id),
    })
    .from(spaces)
    .leftJoin(photos, eq(photos.spaceId, spaces.id))
    .where(and(eq(spaces.slug, slug), ne(spaces.status, "deleted")))
    .groupBy(spaces.id)

  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const space = rows[0]

  void db.insert(analyticsEvents).values({
    spaceId: space.id,
    eventType: "space_view",
  })

  return NextResponse.json(space)
}
