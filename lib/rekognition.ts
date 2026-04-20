import {
  RekognitionClient,
  CreateCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
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

// Search for faces matching a selfie within a space collection.
// Returns photoIds of matching photos (via ExternalImageId).
export async function searchFaces(
  spaceId: string,
  selfieBytes: Buffer,
  threshold = 80, // minimum match confidence %
): Promise<string[]> {
  try {
    const res = await client.send(
      new SearchFacesByImageCommand({
        CollectionId: spaceId,
        Image: { Bytes: selfieBytes },
        FaceMatchThreshold: threshold,
        MaxFaces: 200,
      })
    )

    const photoIds = new Set<string>()
    for (const match of res.FaceMatches ?? []) {
      if (match.Face?.ExternalImageId) {
        photoIds.add(match.Face.ExternalImageId)
      }
    }
    return [...photoIds]
  } catch (err: unknown) {
    // Collection doesn't exist yet — no photos indexed
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
