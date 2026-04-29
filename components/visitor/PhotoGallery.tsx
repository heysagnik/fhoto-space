"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import type { MatchedPhoto } from "@/types"

interface Props {
  photos: MatchedPhoto[]
}

export function PhotoGallery({ photos }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (lightboxIndex === null) return
      if (e.key === "ArrowLeft") setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1))
      if (e.key === "ArrowRight") setLightboxIndex((i) => Math.min(photos.length - 1, (i ?? 0) + 1))
      if (e.key === "Escape") setLightboxIndex(null)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [lightboxIndex, photos.length])

  return (
    <div className="w-full h-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-3 md:gap-4 p-2 sm:p-4 md:p-6">
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              className="aspect-square overflow-hidden rounded-xl sm:rounded-2xl cursor-pointer bg-zinc-100 relative group shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all active:scale-[0.98] border border-black/[0.03]"
              onClick={() => setLightboxIndex(i)}
            >
              <Image
                src={photo.thumbnailUrl}
                fill
                sizes="(max-width:640px) 50vw, (max-width:768px) 33vw, (max-width:1024px) 25vw, 20vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                alt={`Photo ${i + 1}`}
                unoptimized
              />
            </div>
          ))}
        </div>

      {lightboxIndex !== null && (
        <LightboxModal
          photo={photos[lightboxIndex]}
          index={lightboxIndex}
          total={photos.length}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setLightboxIndex((i) => Math.min(photos.length - 1, (i ?? 0) + 1))}
        />
      )}
    </div>
  )
}

function LightboxModal({
  photo, index, total, onClose, onPrev, onNext,
}: {
  photo: MatchedPhoto; index: number; total: number
  onClose: () => void; onPrev: () => void; onNext: () => void
}) {
  const touchStart = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart.current === null) return
    const delta = touchStart.current - e.changedTouches[0].clientX
    touchStart.current = null
    if (Math.abs(delta) < 50) return
    if (delta > 0) onNext()
    else onPrev()
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="left-1/2 top-1/2 h-[100svh] w-screen max-w-none -translate-x-1/2 -translate-y-1/2 rounded-none border-0 bg-black p-0 gap-0 overflow-hidden data-[state=open]:!animate-none data-[state=closed]:!animate-none sm:h-[85vh] sm:w-[min(90vw,64rem)] sm:max-w-4xl sm:rounded-2xl sm:border sm:border-white/10 sm:bg-black/90 sm:p-4"
        aria-describedby={undefined}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Photo Lightbox</DialogTitle>
          <DialogDescription>Viewing full size photo</DialogDescription>
        </DialogHeader>
        
        <div className="relative flex h-full flex-col justify-between pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-0">
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center p-0 sm:p-2"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <Image
              src={photo.thumbnailUrl}
              fill
              className="object-contain"
              alt={`Photo ${index + 1}`}
              priority
              unoptimized
            />
          </div>
          
          {/* Close button explicitly for mobile so they see it easily on top of the black background */}
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={onClose} 
            className="absolute right-4 top-[max(0.75rem,env(safe-area-inset-top))] sm:hidden z-50 text-white bg-black/30 hover:bg-black/50 rounded-full"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            <span className="sr-only">Close</span>
          </Button>
          
          <div className="absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] mx-auto flex w-full max-w-md items-center justify-between px-4 bg-transparent shrink-0 z-10 sm:relative sm:inset-auto sm:bottom-auto sm:px-0">
            <Button size="icon" variant="ghost" disabled={index === 0} onClick={onPrev} className="rounded-full shadow-lg h-12 w-12 sm:h-10 sm:w-10 bg-white/20 hover:bg-white/30 text-white border-0">
              <ChevronLeft size={24} />
            </Button>
            <span className="text-sm font-medium text-white/90 bg-black/60 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
              {index + 1} / {total}
            </span>
            <Button size="icon" variant="ghost" disabled={index === total - 1} onClick={onNext} className="rounded-full shadow-lg h-12 w-12 sm:h-10 sm:w-10 bg-white/20 hover:bg-white/30 text-white border-0">
              <ChevronRight size={24} />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
