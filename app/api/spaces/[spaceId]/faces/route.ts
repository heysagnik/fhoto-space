import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { spaces, photos } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { eq, inArray } from "drizzle-orm"
import { publicUrl } from "@/lib/r2"
import { listFacesByPhoto } from "@/lib/rekognition"
import { RekognitionClient, SearchFacesCommand } from "@aws-sdk/client-rekognition"

type Params = { params: Promise<{ spaceId: string }> }

export interface FaceCluster {
  clusterId: number
  representativePhotoId: string
  representativeFaceId: string
  thumbnailUrl: string
  faceCropUrl: string
  photoCount: number
  photoIds: string[]
}

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// Union-Find (path-compressed)
class UnionFind {
  private parent: Map<string, string> = new Map()

  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x)
    if (this.parent.get(x) !== x) this.parent.set(x, this.find(this.parent.get(x)!))
    return this.parent.get(x)!
  }

  union(x: string, y: string) {
    const rx = this.find(x), ry = this.find(y)
    if (rx !== ry) this.parent.set(rx, ry)
  }

  groups(): Map<string, string[]> {
    const g = new Map<string, string[]>()
    for (const key of this.parent.keys()) {
      const root = this.find(key)
      if (!g.has(root)) g.set(root, [])
      g.get(root)!.push(key)
    }
    return g
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { spaceId } = await params
  const [space] = await db.select().from(spaces).where(eq(spaces.id, spaceId))
  if (!space || space.photographerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // faceId → photoId map
  const facesByPhoto = await listFacesByPhoto(spaceId)
  if (facesByPhoto.size === 0) return NextResponse.json({ clusters: [] })

  // Filter to only photos that actually exist in DB (removes stale Rekognition entries)
  const rekogPhotoIds = [...facesByPhoto.keys()]
  const existingPhotos = await db
    .select({ id: photos.id })
    .from(photos)
    .where(inArray(photos.id, rekogPhotoIds))
  const existingPhotoIdSet = new Set(existingPhotos.map((p) => p.id))

  const faceToPhoto = new Map<string, string>()
  const allFaceIds: string[] = []
  for (const [photoId, faces] of facesByPhoto) {
    if (!existingPhotoIdSet.has(photoId)) continue
    for (const f of faces) {
      faceToPhoto.set(f.faceId, photoId)
      allFaceIds.push(f.faceId)
    }
  }

  // Build similarity graph using Rekognition SearchFaces, then Union-Find cluster
  const uf = new UnionFind()
  for (const faceId of allFaceIds) uf.find(faceId) // initialize all nodes

  // Run SearchFaces for every face — sequential to avoid rate limits
  // AWS Rekognition SearchFaces default rate limit is 50 TPS, but can be much lower (5-10 TPS) on newer accounts.
  for (const faceId of allFaceIds) {
    let retries = 3
    while (retries > 0) {
      try {
        const res = await rekognition.send(
          new SearchFacesCommand({
            CollectionId: spaceId,
            FaceId: faceId,
            FaceMatchThreshold: 70, // lower = more matches = fewer false negatives
            MaxFaces: 1000,
          })
        )
        for (const match of res.FaceMatches ?? []) {
          if (match.Face?.FaceId) uf.union(faceId, match.Face.FaceId)
        }
        break // success, exit retry loop
      } catch (err: any) {
        if (err.name === 'ProvisionedThroughputExceededException' && retries > 1) {
          retries--
          // exponential backoff delay: 1000ms, 2000ms
          await new Promise(r => setTimeout(r, (4 - retries) * 1000))
        } else {
          console.error('[faces] SearchFaces failed for', faceId, err)
          break
        }
      }
    }
  }

  // Group faceIds → person clusters → collect photoIds per cluster
  const faceGroups = uf.groups() // root → [faceIds]
  const personClusters: { representativeFaceId: string; photoIds: Set<string> }[] = []

  for (const [, faceIds] of faceGroups) {
    const photoIds = new Set(faceIds.map((f) => faceToPhoto.get(f)!).filter(Boolean))
    personClusters.push({ representativeFaceId: faceIds[0], photoIds })
  }

  // Sort largest clusters first
  personClusters.sort((a, b) => b.photoIds.size - a.photoIds.size)

  // Fetch thumbnails for representative photos
  const repPhotoIds = personClusters.map((c) => [...c.photoIds][0])
  const thumbRows = await db
    .select({ id: photos.id, thumbnailKey: photos.thumbnailKey })
    .from(photos)
    .where(inArray(photos.id, repPhotoIds))

  const thumbMap = new Map(thumbRows.map((r) => [r.id, r.thumbnailKey]))

  const clusters: FaceCluster[] = await Promise.all(
    personClusters
      .filter((c) => thumbMap.get([...c.photoIds][0]))
      .map(async (c, i) => {
        const repPhotoId = [...c.photoIds][0]
        return {
          clusterId: i,
          representativePhotoId: repPhotoId,
          representativeFaceId: c.representativeFaceId,
          thumbnailUrl: publicUrl(thumbMap.get(repPhotoId)!),
          faceCropUrl: `/api/photos/${repPhotoId}/face-crop?faceId=${c.representativeFaceId}`,
          photoCount: c.photoIds.size,
          photoIds: [...c.photoIds],
        }
      })
  )

  return NextResponse.json({ clusters })
}
