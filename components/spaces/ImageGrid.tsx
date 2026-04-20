"use client"

import { useEffect, useState, useCallback, forwardRef, useImperativeHandle, useRef } from "react"
import Image from "next/image"
import { X, Trash2, CheckCircle2, Square, Image as ImageIcon, Loader2, Focus } from "lucide-react"

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
  const [visibleCount, setVisibleCount] = useState(50)
  const observerTarget = useRef<HTMLDivElement>(null)

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

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 50, photos.length))
        }
      },
      { rootMargin: "200px" } // trigger slightly before hitting bottom
    )
    if (observerTarget.current) observer.observe(observerTarget.current)
    return () => observer.disconnect()
  }, [photos.length])

  useImperativeHandle(ref, () => ({ refresh: load }), [load])

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightbox) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [lightbox])

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
    const confirmDelete = window.confirm(`Are you sure you want to delete ${selected.size} photo(s)?`)
    if (!confirmDelete) return
    
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
    const confirmDelete = window.confirm("Are you sure you want to delete this photo?")
    if (!confirmDelete) return

    setDeleting(true)
    await fetch(`/api/photos/${photoId}`, { method: "DELETE" })
    setLightbox(null)
    setDeleting(false)
    load()
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl bg-zinc-100/80 border border-black/[0.04] animate-pulse" />
        ))}
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-zinc-50/50 rounded-2xl border border-black/[0.03] shadow-sm">
        <div className="w-16 h-16 rounded-[18px] bg-white border border-black/[0.04] shadow-sm flex items-center justify-center mb-5 shrink-0">
          <ImageIcon className="w-8 h-8 text-zinc-300" strokeWidth={1.5} />
        </div>
        <p className="text-[15px] font-semibold text-zinc-900 tracking-tight">No photos yet</p>
        <p className="text-[13px] text-zinc-500 mt-1 font-light max-w-xs">Upload your event photos here using the controls above to start cataloging faces.</p>
      </div>
    )
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 bg-white/60 backdrop-blur-md rounded-xl p-2 border border-black/[0.04] sticky top-[72px] z-30 shadow-sm">
        {selectMode ? (
          <>
            <div className="flex items-center gap-3 pl-2">
              <button
                onClick={toggleAll}
                className="text-[13px] font-medium text-zinc-900 hover:text-zinc-600 transition-colors uppercase tracking-widest flex items-center gap-1.5"
              >
                {selected.size === photos.length && photos.length > 0 ? <CheckCircle2 className="w-4 h-4"/> : <Square className="w-4 h-4"/>}
                {selected.size === photos.length && photos.length > 0 ? "Deselect all" : "Select all"}
              </button>
              <div className="w-[1px] h-4 bg-black/10" />
              <span className="text-[13px] text-zinc-500 tracking-wide font-medium tabular-nums shadow-sm bg-black/[0.03] px-2.5 py-0.5 rounded-full">{selected.size} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exitSelectMode} className="px-4 py-2 text-[13px] font-semibold text-zinc-600 hover:bg-black/[0.04] rounded-lg transition-colors">
                Cancel
              </button>
              {selected.size > 0 && (
                <button
                  onClick={deleteSelected}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-all rounded-lg disabled:opacity-50 shadow-sm"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>}
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSelectMode(true)}
              className="px-4 py-2 text-[13px] font-semibold bg-white border border-black/[0.06] text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all rounded-lg shadow-sm"
            >
              Select Photos
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {photos.slice(0, visibleCount).map((photo) => {
          const isSelected = selected.has(photo.id)
          return (
            <div
              key={photo.id}
              className={`aspect-square rounded-[1.25rem] overflow-hidden bg-zinc-100 relative cursor-pointer outline outline-2 outline-offset-2 transition-all duration-150 ${isSelected ? "outline-zinc-900 scale-[0.96] shadow-sm" : "outline-transparent hover:outline-black/[0.04]"}`}
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
                unoptimized
              />

              {/* Checkbox — always visible in select mode, hover-visible otherwise */}
              {(selectMode || isSelected) && (
                <div className={`absolute top-2 left-2 transition-all ${isSelected ? "scale-100 opacity-100" : "scale-90 opacity-60 hover:opacity-100"}`}>
                  {isSelected ? (
                    <CheckCircle2 className="w-6 h-6 text-zinc-900 bg-white rounded-full" />
                  ) : (
                    <Square className="w-6 h-6 text-white drop-shadow-md" />
                  )}
                </div>
              )}

              {/* Face badge */}
              {photo.faceCount > 0 && (
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1.5 border border-white/10 shadow-sm">
                  <Focus className="w-3 h-3 text-white" />
                  <span className="text-[11px] text-white font-semibold tabular-nums">{photo.faceCount}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Intersection Target for Infinite Scroll */}
      {visibleCount < photos.length && (
        <div ref={observerTarget} className="h-10 w-full flex items-center justify-center mt-4">
          <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
        </div>
      )}

      {/* Modern Lightbox UI */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          {/* Top Navigation Bar floating over image */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 sm:p-6 z-10 bg-gradient-to-b from-black/80 to-transparent">
             <div className="flex items-center gap-3">
               <span className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-[12px] font-medium tracking-wide">
                 Preview Mode
               </span>
               {lightbox.faceCount > 0 && (
                 <span className="px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[12px] font-medium flex items-center gap-1.5 backdrop-blur-md">
                   <Focus className="w-3.5 h-3.5"/>
                   {lightbox.faceCount} mapped faces
                 </span>
               )}
             </div>

             <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSingle(lightbox.id)
                  }}
                  disabled={deleting}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 text-[13px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg backdrop-blur-md"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>}
                  <span className="hidden sm:inline">{deleting ? "Deleting…" : "Delete"}</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightbox(null)
                  }}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all active:scale-[0.98] backdrop-blur-md"
                >
                  <X className="w-4 h-4" />
                </button>
             </div>
          </div>

          <div
            className="relative w-full h-full max-w-7xl flex gap-4 p-4 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full flex items-center justify-center">
                <Image 
                  src={lightbox.thumbnailUrl} 
                  fill 
                  sizes="100vw" 
                  className="object-contain filter drop-shadow-2xl" 
                  alt="" 
                  unoptimized 
                />
            </div>
          </div>
        </div>
      )}
    </>
  )
})
