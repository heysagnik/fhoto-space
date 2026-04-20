"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { FolderPlus, Loader2 } from "lucide-react"

interface NewSpaceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewSpaceModal({ open, onOpenChange }: NewSpaceModalProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (name.trim().length < 2) { setError("Name must be at least 2 characters"); return }
    setError(null)
    setIsLoading(true)
    const res = await fetch("/api/spaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data?.error ?? "Failed to create space")
      setIsLoading(false)
      return
    }
    const space = await res.json()
    onOpenChange(false)
    setName("")
    router.push(`/spaces/${space.id}`)
  }

  function handleOpenChange(open: boolean) {
    if (!open) { setName(""); setError(null) }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] max-w-md border-black/[0.04] p-6 shadow-xl rounded-2xl md:rounded-3xl bg-white focus:outline-none">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-black/[0.04] flex items-center justify-center shrink-0">
              <FolderPlus className="w-5 h-5 text-zinc-900" />
            </div>
            <div className="pt-1">
              <DialogTitle className="text-xl font-medium text-zinc-900">New space</DialogTitle>
              <DialogDescription className="mt-1.5 text-zinc-500 font-light text-[15px]">A dedicated gallery for a client, event, or project.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-4">
          <Label htmlFor="space-name" className="text-zinc-700 font-medium ml-1">Space name</Label>
          <Input
            id="space-name"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null) }}
            placeholder="e.g. Summer Wedding 2025"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate() } }}
            className={`h-12 px-4 rounded-xl text-[15px] border-black/[0.08] bg-zinc-50 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-zinc-900 focus-visible:ring-offset-0 focus-visible:border-zinc-900 shadow-none transition-all ${error ? "border-red-400 focus-visible:ring-red-400" : ""}`}
          />
          {error && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-black/[0.04]">
          <Button variant="ghost" size="lg" className="rounded-xl px-6 font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button size="lg" disabled={isLoading || name.trim().length < 2} onClick={handleCreate} className="min-w-[8rem] rounded-xl font-medium !bg-zinc-900 !text-white hover:!bg-zinc-800 shadow-sm border border-transparent">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </span>
            ) : "Create space"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
