"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import type { Space, SpaceStatus } from "@/types"

const STATUS: Record<SpaceStatus, { dot: string; label: string; bg: string; text: string }> = {
  active:  { dot: "bg-emerald-500", label: "Active",  bg: "bg-emerald-50",  text: "text-emerald-700" },
  draft:   { dot: "bg-amber-400",   label: "Draft",   bg: "bg-amber-50",    text: "text-amber-700" },
  closed:  { dot: "bg-slate-400",   label: "Closed",  bg: "bg-slate-100",   text: "text-slate-600" },
  deleted: { dot: "bg-red-400",     label: "Deleted", bg: "bg-red-50",      text: "text-red-700" },
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function SpaceCard({ space }: { space: Space }) {
  const router = useRouter()
  const s = STATUS[space.status]

  return (
    <div
      className="card-interactive group overflow-hidden bg-white rounded-xl"
      tabIndex={0}
      role="button"
      aria-label={`Open ${space.name}`}
      onClick={() => router.push(`/spaces/${space.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/spaces/${space.id}`)}
    >
      <div className="relative w-full h-40 overflow-hidden">
        {space.coverImageUrl ? (
          <Image
            src={space.coverImageUrl}
            alt={`${space.name} cover`}
            fill
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
            <svg className="absolute inset-0 w-full h-full opacity-[0.18]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id={`dots-${space.id}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.2" fill="currentColor" className="text-slate-500"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#dots-${space.id})`}/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-white/70 shadow-sm flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                  <rect x="3" y="3" width="18" height="18" rx="2.5"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${s.bg} ${s.text} shadow-sm`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        </div>
      </div>

      <div className="px-4 pt-3 pb-4 flex flex-col gap-2.5">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-slate-900 truncate leading-tight">{space.name}</p>
          <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">/{space.slug}</p>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-[11px] text-slate-400 font-medium tabular-nums">{formatDate(space.updatedAt)}</span>
          <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out">
            Open
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </span>
        </div>
      </div>
    </div>
  )
}
