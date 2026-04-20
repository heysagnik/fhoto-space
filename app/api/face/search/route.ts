import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { faceEmbeddings } from "@/lib/db/schema"
import { extractEmbeddings } from "@/lib/face/pipeline"
import { cosineDistance, lt, eq, and } from "drizzle-orm"

const bodySchema = z.object({
  spaceId: z.string().uuid(),
  selfieBase64: z.string().max(5 * 1024 * 1024),
})

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { spaceId, selfieBase64 } = parsed.data
  const buffer = Buffer.from(selfieBase64, "base64")
  const embeddingsList = await extractEmbeddings(buffer)

  if (embeddingsList.length === 0) {
    return NextResponse.json({ photoIds: [], error: "no_face_detected" })
  }

  const queryEmbedding = embeddingsList[0]
  const distance = cosineDistance(faceEmbeddings.embedding, queryEmbedding)

  const rows = await db
    .selectDistinct({ photoId: faceEmbeddings.photoId })
    .from(faceEmbeddings)
    .where(and(eq(faceEmbeddings.spaceId, spaceId), lt(distance, 0.4)))
    .orderBy(distance)
    .limit(200)

  return NextResponse.json({ photoIds: rows.map((r) => r.photoId) })
}
