import {
  RekognitionClient,
  CreateCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  SearchFacesCommand,
  ListFacesCommand,
  DeleteFacesCommand,
  type FaceRecord,
} from "@aws-sdk/client-rekognition"

const client = new RekognitionClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// One Rekognition collection per space — collection ID = spaceId
export async function ensureCollection(spaceId: string): Promise<void> {
  try {
    await client.send(new CreateCollectionCommand({ CollectionId: spaceId }))
  } catch (err: unknown) {
    // ResourceAlreadyExistsException is fine
    if ((err as { name?: string }).name !== "ResourceAlreadyExistsException") throw err
  }
}

// Index a photo's thumbnail into the space collection.
// Returns the Rekognition FaceId assigned to each detected face.
export async function indexFaces(
  spaceId: string,
  photoId: string,
  imageBytes: Buffer,
): Promise<{ faceId: string; confidence: number; boundingBox: { left: number; top: number; width: number; height: number } }[]> {
  await ensureCollection(spaceId)

  const res = await client.send(
    new IndexFacesCommand({
      CollectionId: spaceId,
      Image: { Bytes: imageBytes },
      ExternalImageId: photoId, // lets us map FaceId → photoId later
      DetectionAttributes: [],
      MaxFaces: 10,
      QualityFilter: "AUTO",
    })
  )

  return (res.FaceRecords ?? []).map((r: FaceRecord) => ({
    faceId: r.Face!.FaceId!,
    confidence: r.Face!.Confidence ?? 0,
    boundingBox: {
      left: r.Face!.BoundingBox!.Left!,
      top: r.Face!.BoundingBox!.Top!,
      width: r.Face!.BoundingBox!.Width!,
      height: r.Face!.BoundingBox!.Height!,
    },
  }))
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
  let delay = 200
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const name = (err as { name?: string }).name
      if (name === "ProvisionedThroughputExceededException" && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delay + Math.random() * 100))
        delay *= 2
        continue
      }
      throw err
    }
  }
  throw new Error("retryWithBackoff: unreachable")
}

// Search for faces matching a selfie within a space collection.
// Returns photoIds of matching photos (via ExternalImageId).
//
// Two-phase search so we don't miss photos:
//   1. SearchFacesByImageCommand (max 4096) — matches against the selfie.
//   2. SearchFacesCommand on a sample of matched faceIds (max 3) to catch
//      photos not returned in phase 1 without overloading provisioned TPS.
export async function searchFaces(
  spaceId: string,
  selfieBytes: Buffer,
  threshold = 80,
): Promise<string[]> {
  try {
    // Phase 1: find faces that match the selfie
    const phase1 = await retryWithBackoff(() =>
      client.send(
        new SearchFacesByImageCommand({
          CollectionId: spaceId,
          Image: { Bytes: selfieBytes },
          FaceMatchThreshold: threshold,
          MaxFaces: 4096,
        })
      )
    )

    const photoIds = new Set<string>()
    const matchedFaceIds: string[] = []

    for (const match of phase1.FaceMatches ?? []) {
      if (match.Face?.ExternalImageId) photoIds.add(match.Face.ExternalImageId)
      if (match.Face?.FaceId) matchedFaceIds.push(match.Face.FaceId)
    }

    // Phase 2: use up to 3 representative face IDs to find additional photos
    // of the same person that fell outside the phase-1 result window.
    // Capped at 3 to stay within provisioned TPS.
    const sampleIds = matchedFaceIds.slice(0, 3)
    for (const faceId of sampleIds) {
      const res = await retryWithBackoff(() =>
        client.send(
          new SearchFacesCommand({
            CollectionId: spaceId,
            FaceId: faceId,
            FaceMatchThreshold: threshold,
            MaxFaces: 4096,
          })
        )
      )
      for (const match of res.FaceMatches ?? []) {
        if (match.Face?.ExternalImageId) photoIds.add(match.Face.ExternalImageId)
      }
    }

    return [...photoIds]
  } catch (err: unknown) {
    if ((err as { name?: string }).name === "ResourceNotFoundException") return []
    throw err
  }
}

// List all faces in a collection, grouped by ExternalImageId (photoId).
// Used by the admin face cluster bar.
export async function listFacesByPhoto(
  spaceId: string,
): Promise<Map<string, { faceId: string; confidence: number }[]>> {
  const map = new Map<string, { faceId: string; confidence: number }[]>()
  let nextToken: string | undefined

  try {
    do {
      const res = await client.send(
        new ListFacesCommand({ CollectionId: spaceId, MaxResults: 4096, NextToken: nextToken })
      )
      for (const face of res.Faces ?? []) {
        const photoId = face.ExternalImageId!
        if (!map.has(photoId)) map.set(photoId, [])
        map.get(photoId)!.push({ faceId: face.FaceId!, confidence: face.Confidence ?? 0 })
      }
      nextToken = res.NextToken
    } while (nextToken)
  } catch (err: unknown) {
    if ((err as { name?: string }).name === "ResourceNotFoundException") return map
    throw err
  }

  return map
}

// Delete all faces belonging to a photo from its collection
export async function deleteFacesForPhoto(
  spaceId: string,
  faceIds: string[],
): Promise<void> {
  if (faceIds.length === 0) return
  // Rekognition allows max 1000 per call
  for (let i = 0; i < faceIds.length; i += 1000) {
    await client.send(
      new DeleteFacesCommand({
        CollectionId: spaceId,
        FaceIds: faceIds.slice(i, i + 1000),
      })
    )
  }
}
