import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { photos } from "@/lib/db/schema"
import { eq, and, isNotNull } from "drizzle-orm"

// Stay safely under the 5 TPS Rekognition default (applies to all regions except the big 3)
// Major regions (us-east-1, us-west-2, eu-west-1) get 50 TPS — 3/sec is safe everywhere
const BATCH_SIZE = 30
const DELAY_MS = Math.ceil(1000 / 3) // 3 per second = one every 334ms

export async function GET(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const pending = await db
    .select({ id: photos.id, spaceId: photos.spaceId })
    .from(photos)
    .where(and(eq(photos.faceIndexed, false), isNotNull(photos.thumbnailKey)))
    .limit(BATCH_SIZE)

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, queued: 0 })
  }

  const baseUrl = new URL(req.url).origin

  // Fire each face-index request with throttle delay but don't await the indexing work —
  // each /api/photos/face-index call runs independently so this route returns well within
  // Vercel's function timeout while the indexing happens in parallel serverless invocations.
  ;(async () => {
    for (const photo of pending) {
      fetch(`${baseUrl}/api/photos/face-index`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": process.env.CRON_SECRET!,
        },
        body: JSON.stringify({ photoId: photo.id, spaceId: photo.spaceId }),
      }).catch((err) => console.error("[cron/face-index] dispatch failed for", photo.id, err))

      await new Promise((r) => setTimeout(r, DELAY_MS))
    }
  })()

  return NextResponse.json({ ok: true, queued: pending.length })
}
