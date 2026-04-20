"use client"

import { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

interface GridPhoto {
  id: string
  thumbnailUrl: string
  width: number | null
  height: number | null
  faceIndexed: boolean
  faceCount: number
}

interface Props {
  spaceId: string
  filterPhotoIds: string[] | null
}

export interface ImageGridHandle {
  refresh: () => void
}

export const ImageGrid = forwardRef<ImageGridHandle, Props>(function ImageGrid(
  { spaceId, filterPhotoIds },
  ref
) {
  const [photos, setPhotos] = useState<GridPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [lightbox, setLightbox] = useState<GridPhoto | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const url = filterPhotoIds
      ? `/api/spaces/${spaceId}/photos?photoIds=${filterPhotoIds.join(",")}`
      : `/api/spaces/${spaceId}/photos`
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setPhotos(data.photos ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [spaceId, filterPhotoIds])

  useEffect(() => { load() }, [load])

  useImperativeHandle(ref, () => ({ refresh: load }), [load])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === photos.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(photos.map((p) => p.id)))
    }
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
  }

  async function deleteSelected() {
    if (selected.size === 0 || deleting) return
    setDeleting(true)
    await fetch("/api/photos/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoIds: [...selected] }),
    })
    exitSelectMode()
    setDeleting(false)
    load()
  }

  async function deleteSingle(photoId: string) {
    if (deleting) return
    setDeleting(true)
    await fetch(`/api/photos/${photoId}`, { method: "DELETE" })
    setLightbox(null)
    setDeleting(false)
    load()
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
            <rect x="3" y="3" width="18" height="18" rx="2.5"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-700">No photos yet</p>
        <p className="text-xs text-slate-400 mt-1">Upload photos above to get started.</p>
      </div>
    )
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        {selectMode ? (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAll}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                {selected.size === photos.length ? "Deselect all" : "Select all"}
              </button>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 tabular-nums">{selected.size} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={exitSelectMode}>Cancel</Button>
              {selected.size > 0 && (
                <Button variant="destructive" size="sm" onClick={deleteSelected} disabled={deleting}>
                  {deleting ? "Deleting…" : `Delete ${selected.size}`}
                </Button>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => setSelectMode(true)}
            className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            Select
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {photos.map((photo) => {
          const isSelected = selected.has(photo.id)
          return (
            <div
              key={photo.id}
              className={`aspect-square rounded-xl overflow-hidden bg-slate-100 relative cursor-pointer transition-all duration-150 ${isSelected ? "ring-2 ring-blue-500 ring-offset-2" : "ring-2 ring-transparent"}`}
              onClick={() => {
                if (selectMode) {
                  toggleSelect(photo.id)
                } else {
                  setLightbox(photo)
                }
              }}
            >
              <Image
                src={photo.thumbnailUrl}
                fill
                sizes="(max-width:640px) 50vw, (max-width:768px) 33vw, 20vw"
                className="object-cover"
                alt=""
              />

              {/* Checkbox — always visible in select mode, hover-visible otherwise */}
              {(selectMode || isSelected) && (
                <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${isSelected ? "bg-blue-600 border-blue-600" : "bg-white/80 border-white/80"}`}>
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
              )}

              {/* Face badge */}
              {photo.faceCount > 0 && (
                <div className="absolute bottom-1.5 right-1.5 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span className="text-[10px] text-white font-bold">{photo.faceCount}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative w-full h-full max-w-5xl p-4 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
              onClick={() => setLightbox(null)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <button
              className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50 z-10"
              onClick={() => deleteSingle(lightbox.id)}
              disabled={deleting}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              {deleting ? "Deleting…" : "Delete photo"}
            </button>
            <div className="relative w-full h-full">
              <Image src={lightbox.thumbnailUrl} fill sizes="100vw" className="object-contain" alt="" />
            </div>
          </div>
        </div>
      )}
    </>
  )
})
