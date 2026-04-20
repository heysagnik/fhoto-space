import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/lib/db"
import { user, session, account, verification } from "@/lib/db/schema"
import { headers } from "next/headers"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
})

/** Server-side helper — call from Server Components and API Routes */
export async function getSession() {
  const headersList = await headers()
  return auth.api.getSession({ headers: headersList })
}
