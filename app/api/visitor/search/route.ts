import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { spaces, photos, faceEmbeddings, analyticsEvents } from "@/lib/db/schema"
import { extractEmbeddings } from "@/lib/face/pipeline"
import { publicUrl } from "@/lib/r2"
import { cosineDistance, lt, eq, and, inArray } from "drizzle-orm"

const bodySchema = z.object({
  spaceId: z.string().uuid(),
  selfieBase64: z.string().max(10_000_000),
})

const rateLimitMap = new Map<string, number>()

function checkRateLimit(ip: string, spaceId: string): boolean {
  const now = Date.now()
  for (const [key, time] of rateLimitMap) {
    if (now - time > 60_000) rateLimitMap.delete(key)
  }
  const key = `${ip}-${spaceId}`
  const last = rateLimitMap.get(key)
  if (last && now - last < 10_000) return false
  rateLimitMap.set(key, now)
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"

  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { spaceId, selfieBase64 } = parsed.data

  if (!checkRateLimit(ip, spaceId)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const [space] = await db.select({ status: spaces.status }).from(spaces).where(eq(spaces.id, spaceId))
  if (!space || space.status !== "active") {
    return NextResponse.json({ error: "Space not available" }, { status: 403 })
  }

  const buffer = Buffer.from(selfieBase64.replace(/^data:image\/\w+;base64,/, ""), "base64")
  const embeddingsList = await extractEmbeddings(buffer)

  if (embeddingsList.length === 0) {
    return NextResponse.json({ photos: [], error: "no_face_detected" })
  }

  const queryEmbedding = embeddingsList[0]
  const distance = cosineDistance(faceEmbeddings.embedding, queryEmbedding)

  const matchedRows = await db
    .selectDistinct({ photoId: faceEmbeddings.photoId })
    .from(faceEmbeddings)
    .where(and(eq(faceEmbeddings.spaceId, spaceId), lt(distance, 0.4)))
    .orderBy(distance)
    .limit(200)

  if (matchedRows.length === 0) {
    return NextResponse.json({ photos: [] })
  }

  const photoRows = await db
    .select({ id: photos.id, thumbnailKey: photos.thumbnailKey, originalKey: photos.originalKey })
    .from(photos)
    .where(inArray(photos.id, matchedRows.map((r) => r.photoId)))

  const result = photoRows.map((p) => ({
    id: p.id,
    thumbnailUrl: publicUrl(p.thumbnailKey ?? p.originalKey),
  }))

  void db.insert(analyticsEvents).values({
    spaceId,
    eventType: "selfie_search",
    meta: String(matchedRows.length),
  })

  return NextResponse.json({ photos: result })
}
