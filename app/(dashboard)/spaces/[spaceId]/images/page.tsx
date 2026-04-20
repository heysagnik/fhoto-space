import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { spaces, photos } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { SpaceNav } from "@/components/spaces/SpaceNav"
import { ImagesShell } from "@/components/spaces/ImagesShell"
import type { Space } from "@/types"

type Params = { params: Promise<{ spaceId: string }> }

export default async function SpaceImagesPage({ params }: Params) {
  const session = await getSession()
  if (!session) redirect("/login")

  const { spaceId } = await params
  const [row] = await db.select().from(spaces).where(eq(spaces.id, spaceId))

  if (!row || row.photographerId !== session.user.id) notFound()

  const space: Space = { ...row, status: row.status as Space["status"] }

  const photoCount = await db
    .select()
    .from(photos)
    .where(eq(photos.spaceId, spaceId))
    .then((r) => r.length)

  return (
    <div className="page-shell">
      <header className="app-header justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="white" stroke="none"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <span className="font-bold text-slate-900 tracking-tight">FotoSpace</span>
        </div>

        <nav className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-1.5 text-sm">
          <span className="text-slate-400 font-medium">Spaces</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span className="font-semibold text-slate-800 truncate max-w-[16rem]">{space.name}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span className="text-slate-500">Images</span>
        </nav>

        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full tabular-nums">
          {photoCount} photo{photoCount !== 1 ? "s" : ""}
        </span>
      </header>

      <div className="page-content flex gap-8">
        <SpaceNav spaceId={spaceId} active="images" spaceName={space.name} />
        <main className="flex-1 min-w-0">
          <ImagesShell spaceId={spaceId} />
        </main>
      </div>
    </div>
  )
}
