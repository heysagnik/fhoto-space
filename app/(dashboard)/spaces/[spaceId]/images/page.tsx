import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { spaces, photos } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { SpaceNav } from "@/components/spaces/SpaceNav"
import { ImagesShell } from "@/components/spaces/ImagesShell"
import type { Space } from "@/types"
import { Camera, ChevronRight } from "lucide-react"

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
    <div className="page-shell bg-[#FDFDFD]">
      <header className="app-header flex items-center justify-between border-b border-black/5 bg-white/60 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-black/[0.06]">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/[0.03] border border-black/[0.05] shadow-sm shrink-0">
              <Camera className="w-4 h-4 text-zinc-800" />
            </div>
            <span className="font-semibold text-zinc-900 tracking-tight">FotoSpace</span>
          </div>

          <nav className="hidden sm:flex items-center gap-1.5 text-[13px]">
            <span className="text-zinc-500 font-medium">Spaces</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
            <span className="font-semibold text-zinc-800 truncate max-w-[16rem]">{space.name}</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
            <span className="text-zinc-500 font-medium">Images</span>
          </nav>
        </div>

        <span className="text-xs font-semibold text-zinc-600 bg-black/[0.03] border border-black/[0.04] px-2.5 py-1 rounded-full tabular-nums">
          {photoCount} photo{photoCount !== 1 ? "s" : ""}
        </span>
      </header>

      <div className="page-content flex flex-col md:flex-row gap-8 max-w-[1400px] w-full mx-auto px-6 py-10 md:px-12 md:py-12">
        <SpaceNav spaceId={spaceId} active="images" spaceName={space.name} />
        <main className="flex-1 min-w-0">
          <ImagesShell spaceId={spaceId} />
        </main>
      </div>
    </div>
  )
}
