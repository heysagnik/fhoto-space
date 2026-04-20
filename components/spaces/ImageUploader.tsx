"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useUpload } from "@/hooks/useUpload"
import type { UploadStatus } from "@/types"

const STATUS_CONFIG: Record<UploadStatus, { variant: "secondary" | "default" | "success" | "warning"; label: string }> = {
  queued:    { variant: "secondary", label: "Queued" },
  uploading: { variant: "default",   label: "Uploading" },
  done:      { variant: "success",   label: "Done" },
  indexing:  { variant: "warning",   label: "Indexing…" },
  error:     { variant: "destructive" as never, label: "Error" },
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface ImageUploaderProps {
  spaceId: string
  onUploadsComplete?: () => void
}

export function ImageUploader({ spaceId, onUploadsComplete }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { files, startUpload, removeFile, totalProgress } = useUpload(spaceId)
  const [isDragging, setIsDragging] = useState(false)

  // After upload batch finishes, poll until face indexing completes, then notify parent
  const prevHasActive = useRef(false)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const hasActive = files.some((f) => f.status === "uploading" || f.status === "queued")

    if (prevHasActive.current && !hasActive && files.length > 0) {
      // Batch just finished uploading — show grid immediately, then poll for indexing
      onUploadsComplete?.()

      const doneIds = files.filter((f) => f.status === "done" && f.photoId).map((f) => f.photoId!)
      if (doneIds.length === 0) return

      // Mark all done files as "indexing"
      // (this is cosmetic — the grid already shows them)
      let cancelled = false

      async function pollIndexing() {
        while (!cancelled) {
          await new Promise((r) => setTimeout(r, 3000))
          if (cancelled) break
          const res = await fetch(`/api/photos/status?ids=${doneIds.join(",")}`)
          if (!res.ok) break
          const { statuses } = await res.json()
          const allDone = statuses.every((s: { faceIndexed: boolean }) => s.faceIndexed)
          if (allDone) {
            onUploadsComplete?.() // refresh grid again now that faces are indexed
            break
          }
        }
      }

      pollIndexing()
      return () => { cancelled = true }
    }

    prevHasActive.current = hasActive
  }, [files, onUploadsComplete])

  function handleFiles(fileList: FileList | null) {
    const selected = Array.from(fileList ?? []).filter(
      (f) => f.type === "image/jpeg" || f.type === "image/png"
    )
    if (selected.length > 0) startUpload(selected)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const doneCount = files.filter((f) => f.status === "done").length
  const hasActive = files.some((f) => f.status === "uploading")
  const errorCount = files.filter((f) => f.status === "error").length

  return (
    <div className="flex flex-col gap-5">

      {/* Drop zone */}
      <div
        className="drop-zone flex flex-col items-center gap-4 py-16 text-center select-none"
        data-dragging={isDragging ? "true" : undefined}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-150 ${isDragging ? "bg-blue-100" : "bg-slate-100"}`}>
          <svg
            width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.75"
            className={`transition-colors duration-150 ${isDragging ? "text-blue-600" : "text-slate-400"}`}
            stroke="currentColor"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div>
          <p className={`font-semibold text-sm transition-colors duration-150 ${isDragging ? "text-blue-600" : "text-slate-700"}`}>
            {isDragging ? "Release to upload" : "Drop photos here or click to browse"}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">JPEG & PNG · up to 50 MB each · batch upload supported</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-1"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
        >
          Browse files
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = "" }}
      />

      {/* Overall progress */}
      {hasActive && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="font-medium">Uploading {files.filter(f => f.status === "uploading").length} photo{files.filter(f => f.status === "uploading").length !== 1 ? "s" : ""}…</span>
            <span className="font-bold text-slate-700 tabular-nums">{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="h-1.5" />
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="rounded-xl bg-white border border-slate-200/80 overflow-hidden"
          style={{ boxShadow: "0 1px 3px oklch(15% 0.03 264 / 0.06)" }}>
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-800 tabular-nums">
                {doneCount} / {files.length} uploaded
              </span>
              {errorCount > 0 && (
                <Badge variant="destructive">{errorCount} error{errorCount !== 1 ? "s" : ""}</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
              Add more
            </Button>
          </div>

          <div className="divide-y divide-slate-100">
            {files.map((f, i) => {
              const { variant, label } = STATUS_CONFIG[f.status]
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors duration-100">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-slate-400">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{f.file.name}</p>
                    <p className="text-xs text-slate-400 tabular-nums">{formatSize(f.file.size)}</p>
                  </div>

                  {f.status === "uploading" && (
                    <div className="w-20 shrink-0">
                      <Progress value={f.progress} className="h-1" />
                    </div>
                  )}

                  <Badge variant={variant as "secondary" | "default" | "success" | "warning"} className="shrink-0">
                    {label}
                  </Badge>

                  {(f.status === "done" || f.status === "error") && (
                    <button
                      onClick={() => removeFile(i)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-100 shrink-0"
                      aria-label="Remove"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
