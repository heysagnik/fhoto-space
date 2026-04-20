import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { spaces, faceEmbeddings, photos } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { eq, inArray } from "drizzle-orm"
import { getPresignedDownloadUrl } from "@/lib/r2"

type Params = { params: Promise<{ spaceId: string }> }

function cosineDistance(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10)
}

export interface FaceCluster {
  clusterId: number
  representativePhotoId: string
  thumbnailUrl: string
  photoCount: number
  photoIds: string[]
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { spaceId } = await params
  const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId))
  if (!space || space.photographerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const rows = await db
    .select({ photoId: faceEmbeddings.photoId, embedding: faceEmbeddings.embedding })
    .from(faceEmbeddings)
    .where(eq(faceEmbeddings.spaceId, spaceId))

  if (rows.length === 0) return NextResponse.json({ clusters: [] })

  // Greedy clustering with cosine distance threshold
  const THRESHOLD = 0.45
  const clusters: { centroid: number[]; photoIds: string[]; representativePhotoId: string }[] = []

  for (const row of rows) {
    const emb = row.embedding as unknown as number[]
    let bestIdx = -1, bestDist = Infinity

    for (let i = 0; i < clusters.length; i++) {
      const d = cosineDistance(emb, clusters[i].centroid)
      if (d < bestDist) { bestIdx = i; bestDist = d }
    }

    if (bestIdx >= 0 && bestDist < THRESHOLD) {
      const c = clusters[bestIdx]
      const n = c.photoIds.length
      c.centroid = c.centroid.map((v, i) => (v * n + emb[i]) / (n + 1))
      if (!c.photoIds.includes(row.photoId)) c.photoIds.push(row.photoId)
    } else {
      clusters.push({ centroid: emb, photoIds: [row.photoId], representativePhotoId: row.photoId })
    }
  }

  // Fetch thumbnails for representative photos
  const repIds = clusters.map((c) => c.representativePhotoId)
  const thumbRows = await db
    .select({ id: photos.id, thumbnailKey: photos.thumbnailKey })
    .from(photos)
    .where(inArray(photos.id, repIds))

  const thumbMap = new Map(thumbRows.map((r) => [r.id, r.thumbnailKey]))

  const result: FaceCluster[] = await Promise.all(
    clusters
      .map(async (c, i) => {
        const thumbKey = thumbMap.get(c.representativePhotoId)
        return {
          clusterId: i,
          representativePhotoId: c.representativePhotoId,
          thumbnailUrl: thumbKey ? await getPresignedDownloadUrl(thumbKey) : "",
          photoCount: c.photoIds.length,
          photoIds: c.photoIds,
        }
      })
  )
  const filteredResult = result.filter((c) => c.thumbnailUrl)

  return NextResponse.json({ clusters: filteredResult })
}
