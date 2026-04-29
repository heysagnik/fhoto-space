"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SelfieCapture } from "./SelfieCapture"
import { Camera, User, Lock, Images } from "lucide-react"
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
            <img src={space.coverImageUrl} className="absolute inset-0 w-full h-full object-cover" alt={space.name} />
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
        <div className="absolute top-[max(1.5rem,env(safe-area-inset-top))] left-4 sm:left-6">
          <span className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-md text-white border border-white/20 uppercase tracking-widest shadow-sm">
            <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Private gallery
          </span>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-5 left-4 right-4 sm:bottom-10 sm:left-10 sm:right-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-black/40 border border-white/20 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-md whitespace-nowrap">
              <Images className="w-3.5 h-3.5" />
              {photoLabel}
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight filter drop-shadow-sm line-clamp-2">
              {space.name}
            </h1>
            <p className="text-[13px] sm:text-base text-white/80 mt-1.5 line-clamp-2 max-w-xl font-light">
              {space.welcomeMessage ?? "Shared by your photographer. Find your photos using facial recognition."}
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 relative px-4 sm:px-6 pb-[max(4rem,env(safe-area-inset-bottom))] py-6 sm:py-8 flex flex-col gap-6 items-center">
        <div className="w-full max-w-[640px] flex flex-col gap-6">

          {/* CTA card */}
          <div className="bg-white rounded-[1.5rem] border border-black/[0.04] shadow-xl shadow-black/[0.02] p-5 sm:p-8 flex flex-col gap-5 sm:gap-6">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] bg-zinc-50 border border-black/[0.04] flex items-center justify-center">
                <Camera className="w-5 h-5 text-zinc-800" />
              </div>
              <p className="font-bold text-zinc-900 text-lg sm:text-xl tracking-tight">Find your photos</p>
              <p className="text-[13px] sm:text-[14px] text-zinc-500 font-light max-w-[280px]">
                Take a quick selfie to instantly find all your photos from this event. No sign-up required.
              </p>
            </div>

            <button
              onClick={() => setSelfieOpen(true)}
              className="w-full h-13 sm:h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl flex items-center justify-center gap-3 text-[15px] font-semibold transition-all active:scale-[0.98] shadow-sm py-3.5"
            >
              <User className="w-4 h-4" />
              Take a selfie
            </button>
            <p className="text-[11px] sm:text-[12px] text-zinc-400 text-center font-light">
              Your selfie is used only for matching and deleted immediately after.
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
