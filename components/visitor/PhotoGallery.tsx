"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
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
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-4">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="aspect-square overflow-hidden rounded-xl cursor-pointer bg-slate-100 relative group"
            onClick={() => setLightboxIndex(i)}
          >
            <Image
              src={photo.thumbnailUrl}
              fill
              sizes="(max-width:640px) 50vw, (max-width:768px) 33vw, 25vw"
              className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              alt={`Photo ${i + 1}`}
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
    </>
  )
}

function LightboxModal({
  photo, index, total, onClose, onPrev, onNext,
}: {
  photo: MatchedPhoto; index: number; total: number
  onClose: () => void; onPrev: () => void; onNext: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-4xl p-2 bg-black/90 border-white/10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center">
            <Image
              src={photo.thumbnailUrl}
              width={900}
              height={900}
              className="max-h-[80vh] w-auto object-contain rounded-xl"
              alt={`Photo ${index + 1}`}
              priority
            />
          </div>
          <div className="flex items-center justify-between px-2 pb-1">
            <Button size="icon" variant="ghost" disabled={index === 0} onClick={onPrev} className="text-white hover:bg-white/10">
              <ChevronLeft size={20} />
            </Button>
            <span className="text-sm text-white/70">{index + 1} of {total}</span>
            <Button size="icon" variant="ghost" disabled={index === total - 1} onClick={onNext} className="text-white hover:bg-white/10">
              <ChevronRight size={20} />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
