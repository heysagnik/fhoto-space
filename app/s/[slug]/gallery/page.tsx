"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { PhotoGallery } from "@/components/visitor/PhotoGallery"
import { NoResultsCard } from "@/components/visitor/NoResultsCard"
import { DownloadButton } from "@/components/visitor/DownloadButton"
import type { MatchedPhoto } from "@/types"

export default function GalleryPage() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const [photos, setPhotos] = useState<MatchedPhoto[] | null>(null)
  const [spaceId, setSpaceId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const res = await fetch(`/api/visitor/space?slug=${params.slug}`)
      if (!res.ok) { router.replace(`/s/${params.slug}`); return }
      const space = await res.json()
      setSpaceId(space.id)
      const stored = sessionStorage.getItem(`results-${space.id}`)
      if (!stored) { router.replace(`/s/${params.slug}`); return }
      setPhotos(JSON.parse(stored) as MatchedPhoto[])
    }
    init()
  }, [params.slug, router])

  if (photos === null || spaceId === null) return null

  if (photos.length === 0) {
    return <NoResultsCard onRetake={() => router.push(`/s/${params.slug}`)} />
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD] font-sans">
      <header className="sticky top-0 z-10 bg-white/60 backdrop-blur-md border-b border-black/[0.05] flex items-center justify-between px-4 py-3 sm:px-6 shadow-sm pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          onClick={() => router.push(`/s/${params.slug}`)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-900 hover:bg-black/[0.03] active:scale-95 transition-all border border-transparent hover:border-black/[0.05]"
        >
          <ChevronLeft className="w-5 h-5 absolute ml-[-2px]" />
        </button>
        <p className="font-bold text-[14px] text-zinc-900 tracking-tight">{photos.length} photos found</p>
        <DownloadButton photoIds={photos.map((p) => p.id)} spaceId={spaceId} />
      </header>
      <PhotoGallery photos={photos} />
    </div>
  )
}
