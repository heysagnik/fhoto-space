"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"

interface SpaceNavProps {
  spaceId: string
  active: "general" | "images"
  spaceName: string
}

const NAV_ITEMS = [
  {
    id: "general" as const,
    label: "General",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
  {
    id: "images" as const,
    label: "Images",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
  },
]

export function SpaceNav({ spaceId, active, spaceName }: SpaceNavProps) {
  const router = useRouter()

  return (
    <aside className="w-48 shrink-0 flex flex-col gap-0.5">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 font-medium mb-3 transition-colors duration-150 group"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform duration-150" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        All spaces
      </Link>

      {/* Space name */}
      <div className="px-3 py-2 mb-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Space</p>
        <p className="text-sm font-semibold text-slate-800 truncate leading-snug" title={spaceName}>
          {spaceName}
        </p>
      </div>

      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            onClick={() => router.push(item.id === "general" ? `/spaces/${spaceId}` : `/spaces/${spaceId}/images`)}
            className={[
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 w-full text-left",
              isActive
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            ].join(" ")}
          >
            <span className={isActive ? "text-white/90" : "text-slate-400"}>
              {item.icon}
            </span>
            {item.label}
          </button>
        )
      })}
    </aside>
  )
}
