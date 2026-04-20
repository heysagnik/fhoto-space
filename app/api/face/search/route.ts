import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { searchFaces } from "@/lib/rekognition"

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

  try {
    const photoIds = await searchFaces(spaceId, buffer, 80)
    if (photoIds.length === 0) {
      return NextResponse.json({ photoIds: [], error: "no_match" })
    }
    return NextResponse.json({ photoIds })
  } catch (err: unknown) {
    const name = (err as { name?: string }).name
    if (name === "InvalidParameterException") {
      // Rekognition couldn't detect a face in the selfie
      return NextResponse.json({ photoIds: [], error: "no_face_detected" })
    }
    console.error("[face/search] rekognition error:", err)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
