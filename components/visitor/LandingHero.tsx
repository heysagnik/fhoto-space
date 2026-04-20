"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { SelfieCapture } from "./SelfieCapture"
import type { MatchedPhoto } from "@/types"

interface SpaceInfo {
  id: string
  name: string
  slug: string
  coverImageUrl: string | null
  photoCount: number
  welcomeMessage?: string | null
}

interface Props {
  space: SpaceInfo
}

export function LandingHero({ space }: Props) {
  const router = useRouter()
  const [isSelfieModalOpen, setIsSelfieModalOpen] = useState(false)
  const photoLabel = `${space.photoCount} ${space.photoCount === 1 ? "photo" : "photos"}`

  function handleResults(photos: MatchedPhoto[]) {
    setIsSelfieModalOpen(false)
    sessionStorage.setItem(`results-${space.id}`, JSON.stringify(photos))
    router.push(`/s/${space.slug}/gallery`)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative h-[18rem] md:h-[25rem] overflow-hidden">
        {space.coverImageUrl ? (
          <>
            <Image src={space.coverImageUrl} fill className="object-cover" alt={space.name} priority />
            <div className="absolute inset-0 bg-black/45" />
          </>
        ) : (
          <div className="relative w-full h-full bg-gradient-to-br from-blue-600 to-blue-800">
            <div className="absolute -left-20 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        <div className="absolute top-6 left-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur text-white border border-white/25">
            Private gallery
          </span>
        </div>

        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">{space.name}</h1>
            {space.welcomeMessage && (
              <p className="text-base text-white/90 mt-1 font-medium">{space.welcomeMessage}</p>
            )}
            {!space.welcomeMessage && (
              <p className="text-sm text-white/75 mt-1">Shared by your photographer</p>
            )}
          </div>
          <div className="shrink-0 rounded-full bg-black/35 border border-white/25 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
            {photoLabel}
          </div>
        </div>
      </section>

      <main className="relative -mt-8 md:-mt-10 px-6 pb-10">
        <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4">
          {/* How it works */}
          <div className="bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Find your photos</h2>
              <p className="text-sm text-slate-500 mt-0.5">Take one quick selfie and we&apos;ll match every photo where you appear.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { n: "1", title: "Take selfie", desc: "Use your front camera in good light." },
                { n: "2", title: "We search", desc: "Face matching runs in a few seconds." },
                { n: "3", title: "View results", desc: "Open, download, and keep your favorites." },
              ].map((step) => (
                <div key={step.n} className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex flex-col gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{step.n}</div>
                  <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                  <p className="text-xs text-slate-500">{step.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">Your selfie is used only for matching and is deleted immediately after the search.</p>
          </div>

          {/* CTA card */}
          <div className="card-interactive bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4 justify-center">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Start</p>
              <p className="text-lg font-semibold text-slate-900">Ready to find your photos?</p>
              <p className="text-sm text-slate-500">No sign up needed. It takes less than a minute.</p>
            </div>
            <Button size="lg" onClick={() => setIsSelfieModalOpen(true)} className="w-full gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Take a selfie to find my photos
            </Button>
          </div>
        </div>
      </main>

      <SelfieCapture
        isOpen={isSelfieModalOpen}
        onClose={() => setIsSelfieModalOpen(false)}
        spaceId={space.id}
        onResults={handleResults}
      />
    </div>
  )
}
