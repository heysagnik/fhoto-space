import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { spaces } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { SpaceNav } from "@/components/spaces/SpaceNav"
import { SettingsForm } from "@/components/spaces/SettingsForm"
import type { Space } from "@/types"
import { Camera, ChevronRight } from "lucide-react"

type Params = { params: Promise<{ spaceId: string }> }

export default async function SpaceSettingsPage({ params }: Params) {
  const session = await getSession()
  if (!session) redirect("/login")

  const { spaceId } = await params
  const [row] = await db.select().from(spaces).where(eq(spaces.id, spaceId))

  if (!row || row.photographerId !== session.user.id) notFound()

  const space: Space = { ...row, status: row.status as Space["status"] }

  return (
    <div className="page-shell bg-[#FDFDFD]">
      {/* ── Header — matches dashboard style ── */}
      <header className="app-header flex items-center justify-between border-b border-black/5 bg-white/60 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-black/[0.06]">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/[0.03] border border-black/[0.05] shadow-sm shrink-0">
              <Camera className="w-4 h-4 text-zinc-800" />
            </div>
            <span className="font-semibold text-zinc-900 tracking-tight">FotoSpace</span>
          </div>

          {/* Breadcrumb inline */}
          <nav className="hidden sm:flex items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
            <span className="text-zinc-500 font-medium">Spaces</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
            <span className="font-semibold text-zinc-800 truncate max-w-[16rem]">{space.name}</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
            <span className="text-zinc-500 font-medium">Settings</span>
          </nav>
        </div>

        {/* Spacer */}
        <div className="w-8" />
      </header>

      {/* ── Body ── */}
      <div className="page-content flex flex-col md:flex-row gap-8 max-w-[1400px] w-full mx-auto px-6 py-10 md:px-12 md:py-12">
        <SpaceNav spaceId={spaceId} active="general" spaceName={space.name} />
        <main className="flex-1 min-w-0">
          <SettingsForm space={space} />
        </main>
      </div>
    </div>
  )
}
