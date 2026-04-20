"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SpaceCard } from "@/components/dashboard/SpaceCard"
import { NewSpaceModal } from "@/components/dashboard/NewSpaceModal"
import { authClient } from "@/lib/auth-client"
import type { Space } from "@/types"

interface DashboardShellProps {
  spaces: Space[]
  userInitials: string
  userName: string
  userEmail: string
}

export function DashboardShell({ spaces, userInitials, userName, userEmail }: DashboardShellProps) {
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = spaces.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSignOut() {
    await authClient.signOut()
    window.location.href = "/login"
  }

  const activeCount = spaces.filter((s) => s.status === "active").length

  return (
    <div className="page-shell">

      {/* ── Header ── */}
      <header className="app-header justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="white" stroke="none"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <span className="font-bold text-slate-900 tracking-tight">FotoSpace</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search spaces…"
              className="pl-8 w-52 text-sm bg-slate-50 border-slate-200 focus:bg-white h-8"
              aria-label="Search spaces"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm hover:ring-blue-200 transition-all duration-150 cursor-pointer select-none">
                {userInitials}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
                <span className="text-sm font-semibold text-slate-900 truncate">{userName}</span>
                <span className="text-xs text-slate-500 truncate font-normal">{userEmail}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Page body ── */}
      <div className="page-content flex flex-col gap-6">

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Your spaces</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {spaces.length === 0
                ? "Galleries you manage for clients."
                : `${spaces.length} space${spaces.length !== 1 ? "s" : ""} · ${activeCount} active`}
            </p>
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5 shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New space
          </Button>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search spaces…"
            className="pl-8 w-full text-sm"
            aria-label="Search spaces"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl text-center"
            style={{ background: "repeating-linear-gradient(-45deg, transparent, transparent 8px, oklch(90% 0.006 264) 8px, oklch(90% 0.006 264) 9px)" }}
          >
            <div className="bg-white rounded-2xl px-10 py-12 shadow-sm flex flex-col items-center max-w-xs">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-500">
                  <rect x="3" y="3" width="18" height="18" rx="2.5"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <p className="text-base font-bold text-slate-900">{search ? "No spaces found" : "No spaces yet"}</p>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                {search
                  ? `Nothing matches "${search}". Try a different term.`
                  : "Create your first space to start delivering client galleries."}
              </p>
              {!search && (
                <Button size="sm" onClick={() => setModalOpen(true)} className="mt-5 gap-1.5 w-full justify-center">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Create your first space
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </div>
        )}
      </div>

      {/* FAB (mobile) */}
      <button
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all duration-150 z-20 sm:hidden"
        onClick={() => setModalOpen(true)}
        aria-label="New space"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      <NewSpaceModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}
