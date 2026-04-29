"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, Image as ImageIcon } from "lucide-react"
import type { Space, SpaceStatus } from "@/types"

const STATUS: Record<SpaceStatus, { dot: string; label: string; bg: string; text: string; border: string }> = {
  active:  { dot: "bg-emerald-500", label: "Active",  bg: "bg-emerald-50/50",  text: "text-emerald-700", border: "border-emerald-200/50" },
  draft:   { dot: "bg-amber-400",   label: "Draft",   bg: "bg-amber-50/50",    text: "text-amber-700", border: "border-amber-200/50" },
  closed:  { dot: "bg-zinc-400",    label: "Closed",  bg: "bg-zinc-100/50",    text: "text-zinc-600", border: "border-zinc-200/50" },
  deleted: { dot: "bg-red-400",     label: "Deleted", bg: "bg-red-50/50",      text: "text-red-700", border: "border-red-200/50" },
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function SpaceCard({ space }: { space: Space }) {
  const router = useRouter()
  const s = STATUS[space.status]

  return (
    <div
      className="group flex flex-col overflow-hidden bg-white rounded-2xl border border-black/[0.04] shadow-sm transition-all duration-300 hover:shadow-md hover:border-black/[0.08] cursor-pointer"
      tabIndex={0}
      role="button"
      aria-label={`Open ${space.name}`}
      onClick={() => router.push(`/spaces/${space.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/spaces/${space.id}`)}
    >
      <div className="relative w-full h-44 overflow-hidden bg-zinc-50 border-b border-black/[0.03]">
        {space.coverImageUrl ? (
          <img
            src={space.coverImageUrl}
            alt={`${space.name} cover`}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-50/50">
            <div className="w-14 h-14 rounded-2xl bg-white border border-black/[0.04] shadow-sm flex items-center justify-center text-zinc-300 transition-transform duration-500 group-hover:scale-110">
              <ImageIcon className="w-6 h-6 stroke-[1.5]" />
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/20 to-transparent opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100" />
        
        <div className="absolute top-3 right-3 opacity-90 group-hover:opacity-100 transition-opacity">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border backdrop-blur-sm ${s.bg} ${s.text} ${s.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-3 flex-1 bg-white">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-zinc-900 truncate leading-snug">{space.name}</p>
          <p className="text-xs text-zinc-500 truncate mt-1">/{space.slug}</p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-black/[0.03]">
          <span className="text-[11px] text-zinc-400 tracking-wide uppercase font-medium">{formatDate(space.updatedAt)}</span>
          <span className="text-[12px] font-medium text-zinc-900 flex items-center gap-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out">
            Open
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  )
}
