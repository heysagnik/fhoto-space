import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { photos } from "@/lib/db/schema"
import { eq, and, isNotNull } from "drizzle-orm"

const BATCH_SIZE = 50
const DELAY_MS = Math.ceil(1000 / 3) // 3 per second

export async function GET(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find photos that have a thumbnail but never got face-indexed (e.g. tab was closed mid-batch)
  const pending = await db
    .select({ id: photos.id, spaceId: photos.spaceId })
    .from(photos)
    .where(and(eq(photos.faceIndexed, false), isNotNull(photos.thumbnailKey)))
    .limit(BATCH_SIZE)

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  const baseUrl = new URL(req.url).origin

  let processed = 0
  for (const photo of pending) {
    try {
      await fetch(`${baseUrl}/api/photos/face-index`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // forward the session-less call — face-index route checks ownership,
          // so we use a service-to-service header instead
          "x-cron-secret": process.env.CRON_SECRET!,
        },
        body: JSON.stringify({ photoId: photo.id, spaceId: photo.spaceId }),
      })
      processed++
    } catch (err) {
      console.error("[cron/face-index] failed for photo", photo.id, err)
    }
    // Throttle to 3 req/sec
    await new Promise((r) => setTimeout(r, DELAY_MS))
  }

  return NextResponse.json({ ok: true, processed })
}
