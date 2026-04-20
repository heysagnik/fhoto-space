import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { photos } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getObject } from "@/lib/r2"
import sharp from "sharp"

type Params = { params: Promise<{ photoId: string }> }

// GET /api/photos/[photoId]/face-crop?faceId=xxx
// Returns a cropped JPEG of the face region, padded 40% for context.
export async function GET(req: NextRequest, { params }: Params) {
  const { photoId } = await params
  const faceId = req.nextUrl.searchParams.get("faceId")

  const [photo] = await db.select().from(photos).where(eq(photos.id, photoId))
  if (!photo?.thumbnailKey || !photo.faceBoundingBoxes) {
    return new NextResponse(null, { status: 404 })
  }

  const boxes: { faceId: string; left: number; top: number; width: number; height: number }[] =
    JSON.parse(photo.faceBoundingBoxes)

  const box = faceId ? boxes.find((b) => b.faceId === faceId) : boxes[0]
  if (!box) return new NextResponse(null, { status: 404 })

  const imgBuffer = await getObject(photo.thumbnailKey)
  const { width: imgW, height: imgH } = await sharp(imgBuffer).metadata()
  if (!imgW || !imgH) return new NextResponse(null, { status: 500 })

  // Convert relative bounding box to pixels, add 40% padding for context
  const pad = 0.4
  const faceW = box.width * imgW
  const faceH = box.height * imgH
  const cx = (box.left + box.width / 2) * imgW
  const cy = (box.top + box.height / 2) * imgH
  const cropW = Math.round(faceW * (1 + pad))
  const cropH = Math.round(faceH * (1 + pad))

  const left = Math.max(0, Math.round(cx - cropW / 2))
  const top = Math.max(0, Math.round(cy - cropH / 2))
  const width = Math.min(imgW - left, cropW)
  const height = Math.min(imgH - top, cropH)

  const cropped = await sharp(imgBuffer)
    .extract({ left, top, width, height })
    .resize(112, 112, { fit: "cover", position: "centre" })
    .jpeg({ quality: 90 })
    .toBuffer()

  return new NextResponse(new Uint8Array(cropped), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
