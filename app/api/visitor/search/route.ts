import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { spaces, photos, analyticsEvents } from "@/lib/db/schema"
import { searchFaces } from "@/lib/rekognition"
import { getPresignedDownloadUrl } from "@/lib/r2"
import { eq, inArray } from "drizzle-orm"

const bodySchema = z.object({
  spaceId: z.string().uuid(),
  selfieBase64: z.string().max(10_000_000),
})

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { spaceId, selfieBase64 } = parsed.data

  const [space] = await db.select({ status: spaces.status }).from(spaces).where(eq(spaces.id, spaceId))
  if (!space || space.status !== "active") {
    return NextResponse.json({ error: "Space not available" }, { status: 403 })
  }

  const buffer = Buffer.from(selfieBase64.replace(/^data:image\/\w+;base64,/, ""), "base64")

  let matchedPhotoIds: string[] = []
  try {
    matchedPhotoIds = await searchFaces(spaceId, buffer)
  } catch (error: any) {
    if (error.name === "InvalidParameterException" || error.message?.includes("face not detected")) {
      return NextResponse.json({ photos: [], error: "no_face_detected" })
    }
    console.error("[visitor/search] Rekognition search error:", error)
    return NextResponse.json({ photos: [], error: "search_failed" }, { status: 500 })
  }

  if (matchedPhotoIds.length === 0) {
    return NextResponse.json({ photos: [] })
  }

  const photoRows = await db
    .select({ id: photos.id, thumbnailKey: photos.thumbnailKey, originalKey: photos.originalKey })
    .from(photos)
    .where(inArray(photos.id, matchedPhotoIds))

  const result = await Promise.all(
    photoRows.map(async (p) => ({
      id: p.id,
      thumbnailUrl: await getPresignedDownloadUrl(p.thumbnailKey ?? p.originalKey!, 3600),
    }))
  )

  void db.insert(analyticsEvents).values({
    spaceId,
    eventType: "selfie_search",
    meta: String(matchedPhotoIds.length),
  })

  return NextResponse.json({ photos: result })
}
