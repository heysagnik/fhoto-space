"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Settings, Image as ImageIcon } from "lucide-react"

interface SpaceNavProps {
  spaceId: string
  active: "general" | "images"
  spaceName: string
}

const NAV_ITEMS = [
  {
    id: "general" as const,
    label: "General",
    icon: <Settings className="w-4 h-4" />,
  },
  {
    id: "images" as const,
    label: "Images",
    icon: <ImageIcon className="w-4 h-4" />,
  },
]

export function SpaceNav({ spaceId, active, spaceName }: SpaceNavProps) {
  const router = useRouter()

  return (
    <aside className="w-full md:w-56 shrink-0 flex flex-col gap-1">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-900 font-medium mb-4 transition-colors group px-1"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        All spaces
      </Link>

      {/* Space name */}
      <div className="px-3 py-2 text-zinc-900 mb-2">
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 opacity-80">Space</p>
        <p className="text-[15px] font-semibold truncate leading-snug" title={spaceName}>
          {spaceName}
        </p>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.id === "general" ? `/spaces/${spaceId}` : `/spaces/${spaceId}/images`)}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left border border-transparent",
                isActive
                  ? "bg-white border-black/[0.04] shadow-sm text-zinc-900 font-semibold"
                  : "text-zinc-600 hover:bg-black/[0.02] hover:text-zinc-900",
              ].join(" ")}
            >
              <span className={isActive ? "text-zinc-900" : "text-zinc-400"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
