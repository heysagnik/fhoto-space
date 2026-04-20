"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { SelfieCapture } from "./SelfieCapture"
import { Camera, Search, User, Lock, Images } from "lucide-react"
import type { MatchedPhoto } from "@/types"

interface SpaceInfo {
  id: string
  name: string
  slug: string
  coverImageUrl: string | null
  photoCount: number
  welcomeMessage?: string | null
}

export function LandingHero({ space }: { space: SpaceInfo }) {
  const router = useRouter()
  const [selfieOpen, setSelfieOpen] = useState(false)
  const photoLabel = `${space.photoCount} ${space.photoCount === 1 ? "photo" : "photos"}`

  function handleResults(photos: MatchedPhoto[]) {
    setSelfieOpen(false)
    sessionStorage.setItem(`results-${space.id}`, JSON.stringify(photos))
    router.push(`/s/${space.slug}/gallery`)
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-sans">

      {/* Cover / hero */}
      <section className="relative h-[22rem] sm:h-[28rem] md:h-[32rem] shrink-0 overflow-hidden">
        {space.coverImageUrl ? (
          <>
            <Image src={space.coverImageUrl} fill className="object-cover" alt={space.name} priority />
            <div className="absolute inset-0 bg-black/40" />
          </>
        ) : (
          <div className="relative w-full h-full bg-zinc-900 overflow-hidden">
            <div className="absolute -left-20 -top-16 h-72 w-72 rounded-full bg-white/10 blur-[80px]" />
            <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-white/10 blur-[80px]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top badge */}
        <div className="absolute top-6 left-6">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-md text-white border border-white/20 uppercase tracking-widest shadow-sm">
            <Lock className="w-3.5 h-3.5" />
            Private gallery
          </span>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight truncate filter drop-shadow-sm">
              {space.name}
            </h1>
            <p className="text-[15px] sm:text-base text-white/90 mt-2 line-clamp-2 max-w-xl font-light">
              {space.welcomeMessage ?? "Shared by your photographer. Find your photos using facial recognition."}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 rounded-full bg-black/40 border border-white/20 px-4 py-2 text-[13px] font-medium text-white backdrop-blur-md whitespace-nowrap self-start sm:self-end">
            <Images className="w-4 h-4" />
            {photoLabel}
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 relative px-4 sm:px-6 pb-16 py-8 flex flex-col gap-6 items-center">
        <div className="w-full max-w-[640px] flex flex-col gap-6">

          {/* CTA card */}
          <div className="bg-white rounded-[1.5rem] border border-black/[0.04] shadow-xl shadow-black/[0.02] p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-2 mb-2">
              <div className="w-12 h-12 rounded-[14px] bg-zinc-50 border border-black/[0.04] flex items-center justify-center mb-1">
                <Camera className="w-5 h-5 text-zinc-800" />
              </div>
              <p className="font-bold text-zinc-900 text-xl tracking-tight">Find your photos</p>
              <p className="text-[14px] text-zinc-500 font-light max-w-[280px]">
                Take a quick selfie to instantly find all your photos from this event. No sign-up required.
              </p>
            </div>
            
            <button
              onClick={() => setSelfieOpen(true)}
              className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl flex items-center justify-center gap-3 text-[15px] font-semibold transition-all active:scale-[0.98] shadow-sm"
            >
              <User className="w-4 h-4" />
              Take a selfie
            </button>
            <p className="text-[12px] text-zinc-400 text-center font-light mt-[-4px]">
              Your selfie is securely used only for matching and is deleted immediately after search.
            </p>
          </div>

        </div>
      </main>

      <SelfieCapture
        isOpen={selfieOpen}
        onClose={() => setSelfieOpen(false)}
        spaceId={space.id}
        onResults={handleResults}
      />
    </div>
  )
}
