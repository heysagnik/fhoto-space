export type SpaceStatus = "draft" | "active" | "closed" | "deleted"

export interface Space {
  id: string
  photographerId: string
  name: string
  slug: string
  status: SpaceStatus
  coverImageKey: string | null
  coverImageUrl: string | null
  welcomeMessage: string | null
  createdAt: Date
  updatedAt: Date
}

export interface MatchedPhoto {
  id: string
  thumbnailUrl: string
}

export interface Photo {
  id: string
  spaceId: string
  originalKey: string
  thumbnailKey: string | null
  originalSizeBytes: number | null
  faceIndexed: boolean
  rekognitionFaceIds: string[]
  createdAt: Date
}

export type UploadStatus = "queued" | "uploading" | "done" | "indexing" | "error"

export interface UploadFileState {
  file: File
  status: UploadStatus
  progress: number
  error: string | null
  photoId?: string
  key?: string
}
