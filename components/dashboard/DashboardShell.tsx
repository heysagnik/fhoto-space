"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SpaceCard } from "@/components/dashboard/SpaceCard"
import { NewSpaceModal } from "@/components/dashboard/NewSpaceModal"
import { authClient } from "@/lib/auth-client"
import { Search, Plus, Camera, FolderOpen, ImageOff, LogOut } from "lucide-react"
import type { Space } from "@/types"
import Link from "next/link"

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
    <div className="page-shell bg-[#FDFDFD]">

      {/* ── Header ── */}
      <header className="app-header justify-between border-b border-black/5 bg-white/60 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/[0.03] border border-black/[0.05] shadow-sm hover:bg-black/[0.06] transition-colors">
            <Camera className="w-4 h-4 text-zinc-800" />
          </Link>
          <span className="font-semibold text-zinc-900 tracking-tight">FotoSpace</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search spaces…"
              className="pl-9 w-64 text-[13px] bg-zinc-50 border-black/[0.06] focus:bg-white h-9 rounded-full shadow-none transition-all placeholder:text-zinc-400"
              aria-label="Search spaces"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="w-9 h-9 rounded-full bg-zinc-100 border border-black/[0.05] flex items-center justify-center text-zinc-800 text-xs font-semibold hover:bg-zinc-200 transition-colors cursor-pointer select-none">
                {userInitials}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border border-black/[0.06] shadow-xl p-1">
              <DropdownMenuLabel className="flex flex-col gap-0.5 py-2 px-3">
                <span className="text-sm font-semibold text-zinc-900 truncate">{userName}</span>
                <span className="text-xs text-zinc-500 truncate font-light">{userEmail}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-black/5 mx-1" />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer rounded-lg mx-1 flex items-center gap-2 py-2">
                <LogOut className="w-4 h-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Page body ── */}
      <div className="page-content flex flex-col gap-8 max-w-[1400px] w-full mx-auto px-6 py-10 md:px-12 md:py-14">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Your spaces</h1>
            <p className="text-[15px] text-zinc-500 mt-2 font-light">
              {spaces.length === 0
                ? "Galleries you manage for clients."
                : `${spaces.length} space${spaces.length !== 1 ? "s" : ""} · ${activeCount} active`}
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="h-10 px-5 gap-2 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm shrink-0 font-medium w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            New Space
          </Button>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden relative mt-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search spaces…"
            className="pl-10 w-full text-[14px] bg-white border-black/[0.08] h-12 rounded-2xl shadow-sm"
            aria-label="Search spaces"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 px-6 rounded-[2.5rem] mt-4 border-2 border-dashed border-black/[0.08] bg-white/50">
            <div className="bg-white rounded-3xl p-10 shadow-sm border border-black/[0.04] flex flex-col items-center max-w-sm text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-black/[0.04] flex items-center justify-center mb-6">
                {search ? <ImageOff className="w-7 h-7 text-zinc-400" /> : <FolderOpen className="w-7 h-7 text-zinc-800" />}
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">{search ? "No spaces found" : "No spaces yet"}</h3>
              <p className="text-[15px] text-zinc-500 leading-relaxed font-light mb-8">
                {search
                  ? `Nothing matches "${search}". Try a different term or clear your search to see all spaces.`
                  : "Create your first space to start organizing and delivering premium client galleries."}
              </p>
              {!search && (
                <Button onClick={() => setModalOpen(true)} className="h-11 px-6 rounded-xl gap-2 w-full justify-center bg-zinc-900 hover:bg-zinc-800 font-medium">
                  <Plus className="w-4 h-4" />
                  Create your first space
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-2">
            {filtered.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </div>
        )}
      </div>

      {/* FAB (mobile) */}
      <button
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-xl hover:bg-zinc-800 active:scale-95 transition-all duration-200 z-50 sm:hidden"
        onClick={() => setModalOpen(true)}
        aria-label="New space"
      >
        <Plus className="w-6 h-6" />
      </button>

      <NewSpaceModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}
