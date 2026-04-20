import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { spaces } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { createSpaceSchema } from "@/lib/validations"
import { eq } from "drizzle-orm"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db
    .select()
    .from(spaces)
    .where(
      eq(spaces.photographerId, session.user.id)
    )

  const active = rows.filter((s) => s.status !== "deleted")
  return NextResponse.json(active)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSpaceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { name } = parsed.data
  const base = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  const suffix = Math.random().toString(36).slice(2, 6)
  const slug = `${base}-${suffix}`

  const [space] = await db
    .insert(spaces)
    .values({ name, slug, photographerId: session.user.id })
    .returning()

  return NextResponse.json(space, { status: 201 })
}
