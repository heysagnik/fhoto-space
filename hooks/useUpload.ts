"use client"

import { useState, useCallback } from "react"
import type { UploadFileState, UploadStatus } from "@/types"

// R2 upload concurrency — no rate limit on object storage
const MAX_CONCURRENT_UPLOADS = 4

// Rekognition IndexFaces limit is 5 TPS; stay well under it
const FACE_INDEX_PER_SECOND = 3
const FACE_INDEX_INTERVAL_MS = Math.ceil(1000 / FACE_INDEX_PER_SECOND)

type FaceIndexJob = { photoId: string; spaceId: string }

// Module-level queue shared across all hook instances on the page.
// Drains at FACE_INDEX_PER_SECOND calls/sec using a setInterval ticker.
let faceQueue: FaceIndexJob[] = []
let faceQueueTimer: ReturnType<typeof setInterval> | null = null

function enqueueFaceIndex(job: FaceIndexJob) {
  faceQueue.push(job)
  if (faceQueueTimer) return
  faceQueueTimer = setInterval(async () => {
    const next = faceQueue.shift()
    if (!next) {
      clearInterval(faceQueueTimer!)
      faceQueueTimer = null
      return
    }
    try {
      await fetch("/api/photos/face-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      })
    } catch {
      // fire-and-forget; server logs errors
    }
  }, FACE_INDEX_INTERVAL_MS)
}

export function useUpload(spaceId: string) {
  const [files, setFiles] = useState<UploadFileState[]>([])

  const updateFile = useCallback((index: number, patch: Partial<UploadFileState>) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }, [])

  const uploadOne = useCallback(async (file: File, index: number) => {
    updateFile(index, { status: "uploading" as UploadStatus, progress: 0 })

    try {
      const presignRes = await fetch(
        `/api/upload/presign?spaceId=${encodeURIComponent(spaceId)}&filename=${encodeURIComponent(file.name)}`
      )
      if (!presignRes.ok) throw new Error("Failed to get upload URL")

      const { uploadUrl, key, photoId, contentType } = (await presignRes.json()) as {
        uploadUrl: string
        key: string
        photoId: string
        contentType: string
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("PUT", uploadUrl)
        xhr.setRequestHeader("Content-Type", contentType)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            updateFile(index, { progress: Math.round((e.loaded / e.total) * 100) })
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) { resolve(); return }
          if (xhr.status === 0) {
            reject(new Error("Upload blocked before reaching storage. Configure R2 CORS for this origin."))
            return
          }
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error("Upload blocked before reaching storage. Configure R2 CORS for this origin."))
        xhr.send(file)
      })

      const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image()
        img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(img.src) }
        img.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(img.src) }
        img.src = URL.createObjectURL(file)
      })

      // confirm: generates thumbnail and stores metadata — fast, no Rekognition
      await fetch("/api/photos/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, spaceId, sizeBytes: file.size, width, height }),
      })

      // face indexing is throttled separately so we never exceed Rekognition TPS
      enqueueFaceIndex({ photoId, spaceId })

      updateFile(index, { status: "done" as UploadStatus, progress: 100, photoId, key })
    } catch (err) {
      updateFile(index, {
        status: "error" as UploadStatus,
        error: err instanceof Error ? err.message : "Upload failed",
      })
    }
  }, [spaceId, updateFile])

  const startUpload = useCallback(
    async (newFiles: File[]) => {
      const startIndex = files.length
      const entries: UploadFileState[] = newFiles.map((file) => ({
        file,
        status: "queued" as UploadStatus,
        progress: 0,
        error: null,
      }))

      setFiles((prev) => [...prev, ...entries])

      for (let i = 0; i < newFiles.length; i += MAX_CONCURRENT_UPLOADS) {
        const batch = newFiles.slice(i, i + MAX_CONCURRENT_UPLOADS)
        await Promise.all(batch.map((file, j) => uploadOne(file, startIndex + i + j)))
      }
    },
    [files.length, uploadOne]
  )

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const totalProgress =
    files.length === 0
      ? 0
      : Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)

  return { files, startUpload, removeFile, totalProgress }
}
