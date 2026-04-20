import { db } from "@/lib/db"
import { spaces, photos } from "@/lib/db/schema"
import { and, eq, ne, count } from "drizzle-orm"
import { LandingHero } from "@/components/visitor/LandingHero"

type Params = { params: Promise<{ slug: string }> }

export default async function SpaceLandingPage({ params }: Params) {
  const { slug } = await params

  const rows = await db
    .select({
      id: spaces.id,
      name: spaces.name,
      slug: spaces.slug,
      status: spaces.status,
      coverImageUrl: spaces.coverImageUrl,
      welcomeMessage: spaces.welcomeMessage,
      photoCount: count(photos.id),
    })
    .from(spaces)
    .leftJoin(photos, eq(photos.spaceId, spaces.id))
    .where(and(eq(spaces.slug, slug), ne(spaces.status, "deleted")))
    .groupBy(spaces.id)

  const space = rows[0]

  if (!space || space.status === "draft") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
          <p className="font-bold text-slate-900">This space doesn&apos;t exist.</p>
        </div>
      </div>
    )
  }

  if (space.status === "closed") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center text-center gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p className="font-bold text-lg text-slate-900">This space is closed</p>
          <p className="text-sm text-slate-500">The photographer has ended access to this event.</p>
        </div>
      </div>
    )
  }

  return <LandingHero space={space} />
}
