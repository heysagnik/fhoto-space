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
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-100 flex items-center justify-between px-4 py-3">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => router.push(`/s/${params.slug}`)}
        >
          <ChevronLeft size={20} />
        </Button>
        <p className="font-bold text-sm text-slate-900">{photos.length} photos found</p>
        <DownloadButton photoIds={photos.map((p) => p.id)} spaceId={spaceId} />
      </header>
      <PhotoGallery photos={photos} />
    </div>
  )
}
