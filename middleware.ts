import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/spaces")) {
    const session = await getSession()
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/spaces/:path*"],
}
