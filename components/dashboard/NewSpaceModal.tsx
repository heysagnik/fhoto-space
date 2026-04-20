"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
            <div>
              <DialogTitle>New space</DialogTitle>
              <DialogDescription className="mt-0.5">A dedicated gallery for a client, event, or project.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-1.5 mt-2">
          <Label htmlFor="space-name">Space name</Label>
          <Input
            id="space-name"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null) }}
            placeholder="e.g. Summer Wedding 2025"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate() } }}
            className={error ? "border-red-400" : ""}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2 mt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={isLoading || name.trim().length < 2} onClick={handleCreate} className="min-w-[7rem]">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Creating…
              </span>
            ) : "Create space"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
