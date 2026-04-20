import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { photos } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { inArray } from "drizzle-orm"

// GET /api/photos/status?ids=id1,id2,...
// Returns faceIndexed status for a list of photo IDs.
// Used by the frontend to poll until all photos are indexed.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const idsParam = req.nextUrl.searchParams.get("ids") ?? ""
  const ids = idsParam.split(",").filter(Boolean)
  if (ids.length === 0) return NextResponse.json({ statuses: [] })

  const rows = await db
    .select({ id: photos.id, faceIndexed: photos.faceIndexed, faceCount: photos.faceCount })
    .from(photos)
    .where(inArray(photos.id, ids))

  return NextResponse.json({ statuses: rows })
}
