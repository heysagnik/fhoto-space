import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { spaces, photos } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { getPresignedUploadUrl } from "@/lib/r2"
import { presignQuerySchema } from "@/lib/validations"
import { eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const parsed = presignQuerySchema.safeParse({
    spaceId: searchParams.get("spaceId"),
    filename: searchParams.get("filename"),
  })

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { spaceId, filename } = parsed.data
  const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId))

  if (!space || space.photographerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const ext = filename.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg"
  const contentType = ext === "png" ? "image/png" : "image/jpeg"
  const photoId = uuidv4()
  const key = `spaces/${spaceId}/originals/${photoId}.${ext}`

  await db.insert(photos).values({ id: photoId, spaceId, originalKey: key })

  const uploadUrl = await getPresignedUploadUrl(key, contentType)

  return NextResponse.json({ uploadUrl, key, photoId, contentType })
}
