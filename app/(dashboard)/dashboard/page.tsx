import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { spaces } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import type { Space } from "@/types"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const rows = await db
    .select()
    .from(spaces)
    .where(eq(spaces.photographerId, session.user.id))

  const activeSpaces: Space[] = rows
    .filter((s) => s.status !== "deleted")
    .map((s) => ({
      ...s,
      status: s.status as Space["status"],
    }))

  const name = session.user.name ?? session.user.email ?? ""
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return <DashboardShell spaces={activeSpaces} userInitials={initials} userName={session.user.name || "User"} userEmail={session.user.email} />
}
