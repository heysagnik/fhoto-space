"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Image from "next/image"
import type { Space } from "@/types"
import { Image as ImageIcon, AlertTriangle, Loader2, Copy, Check, UploadCloud } from "lucide-react"

const STATUS_OPTIONS = [
  { id: "draft",  label: "Draft",  hint: "Not visible to visitors",  dot: "bg-amber-400",   pill: "bg-amber-50/80 text-amber-700 border-amber-200/50" },
  { id: "active", label: "Active", hint: "Gallery is live",          dot: "bg-emerald-500", pill: "bg-emerald-50/80 text-emerald-700 border-emerald-200/50" },
  { id: "closed", label: "Closed", hint: "Access has ended",         dot: "bg-zinc-400",    pill: "bg-zinc-100/80 text-zinc-600 border-zinc-200/50" },
]

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-[1.5rem] border border-black/[0.04] overflow-hidden shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function SettingsForm({ space }: { space: Space }) {
  const router = useRouter()

  // General
  const [name, setName] = useState(space.name)
  const [slug, setSlug] = useState(space.slug)
  const [status, setStatus] = useState(space.status)
  const [welcomeMessage, setWelcomeMessage] = useState(space.welcomeMessage ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const isDirty = name !== space.name || slug !== space.slug || status !== space.status || welcomeMessage !== (space.welcomeMessage ?? "")

  // Cover
  const [coverUrl, setCoverUrl] = useState<string | null>(space.coverImageUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Share link copy
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState("")
  useEffect(() => { setOrigin(window.location.origin) }, [])

  // Danger zone
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleSave() {
    setIsSaving(true)
    const res = await fetch(`/api/spaces/${space.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, status, welcomeMessage: welcomeMessage || null }),
    })
    setIsSaving(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error("Save failed", { description: data?.error ?? "An error occurred" })
      return
    }
    toast.success("Saved", { description: "Settings updated." })
  }

  async function handleDelete() {
    const confirmDelete = window.confirm(`Are you absolutely sure you want to delete ${space.name}? This cannot be undone.`)
    if (!confirmDelete) return
    
    setIsDeleting(true)
    const res = await fetch(`/api/spaces/${space.id}`, { method: "DELETE" })
    if (!res.ok) {
      setIsDeleting(false)
      toast.error("Delete failed")
      return
    }
    router.push("/dashboard")
  }

  async function handleCoverFile(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return
    setUploading(true)
    try {
      // Step 1: get presigned URL + key
      const init = await fetch(`/api/spaces/${space.id}/cover`)
      if (!init.ok) throw new Error("Failed to get upload URL")
      const { uploadUrl, key } = await init.json()

      // Step 2: upload directly to R2 (bypasses Vercel 4.5 MB body limit)
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "image/jpeg" },
      })
      if (!putRes.ok) throw new Error("Upload to storage failed")

      // Step 3: confirm with backend
      const confirm = await fetch(`/api/spaces/${space.id}/cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      })
      if (!confirm.ok) throw new Error("Failed to save cover")
      const data = await confirm.json()
      setCoverUrl(data.coverImageUrl)
      toast.success("Cover updated")
    } catch {
      toast.error("Upload failed", { description: "Could not upload cover photo." })
    } finally {
      setUploading(false)
    }
  }

  async function handleCoverRemove() {
    await fetch(`/api/spaces/${space.id}/cover`, { method: "DELETE" })
    setCoverUrl(null)
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(`${origin}/s/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6 max-w-[800px]">

      <SectionCard>
        <div className="px-6 py-6 flex flex-col gap-8">
          
          {/* Cover Photo Inline Component */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-zinc-900 uppercase tracking-wide opacity-80 pl-1 flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5" />
              Cover Photo
            </label>
            {coverUrl ? (
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="relative w-full sm:w-56 h-32 rounded-[1rem] overflow-hidden border border-black/[0.04] shrink-0 shadow-sm bg-zinc-50">
                  <Image src={coverUrl} alt="Cover preview" fill className="object-cover" sizes="224px"/>
                </div>
                <div className="flex flex-col gap-2 justify-end sm:h-32">
                  <p className="text-[13px] text-zinc-500 font-light">Shown as the hero image on the visitor gallery.</p>
                  <div className="flex flex-row gap-2 mt-auto">
                    <button
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2 rounded-xl border border-black/[0.06] bg-white text-[13px] font-medium text-zinc-800 hover:bg-zinc-50 hover:border-black/[0.1] active:scale-95 transition-all duration-200 disabled:opacity-50"
                    >
                      Replace
                    </button>
                    <button
                      onClick={handleCoverRemove}
                      disabled={uploading}
                      className="px-4 py-2 rounded-xl border border-red-200 bg-red-50/50 text-[13px] font-medium text-red-600 hover:bg-red-50 active:scale-95 transition-all duration-200 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleCoverFile(f) }}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={[
                  "flex flex-col items-center justify-center gap-3 h-32 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200",
                  isDragging
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-black/[0.08] bg-zinc-50/50 hover:border-black/[0.2] hover:bg-black/[0.02]",
                ].join(" ")}
              >
                {uploading ? (
                  <div className="flex items-center gap-2 text-[14px] text-zinc-500 font-medium">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading…
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-[12px] bg-white border border-black/[0.04] shadow-sm flex items-center justify-center">
                      <UploadCloud className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-zinc-800">Drop cover photo here</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5 font-light">JPEG or PNG · Max 10 MB</p>
                    </div>
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); e.target.value = "" }}
            />
          </div>

          <div className="h-[1px] w-full bg-black/[0.04]" />

          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-zinc-900 uppercase tracking-wide opacity-80 pl-1">Space name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-black/[0.08] bg-zinc-50 text-[15px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:bg-white transition-all duration-200 shadow-none"
              placeholder="e.g. Smith Wedding 2025"
            />
          </div>

          {/* Slug & Link */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-zinc-900 uppercase tracking-wide opacity-80 pl-1">Customer URL / Slug</label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 flex items-center rounded-xl border border-black/[0.08] bg-zinc-50 focus-within:ring-1 focus-within:ring-zinc-900 focus-within:bg-white transition-all duration-200 overflow-hidden shadow-none">
                <span className="px-4 text-[14px] text-zinc-400 font-medium shrink-0 border-r border-black/[0.05] py-3 bg-black/[0.02] select-none">
                  fhoto-space.vercel.app/s/
                </span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="flex-1 px-4 py-3 text-[14px] text-zinc-900 font-mono bg-transparent focus:outline-none"
                  placeholder="your-slug"
                />
              </div>
              <button
                onClick={handleCopyLink}
                className={[
                  "flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-all duration-200 shrink-0 border border-transparent",
                  copied
                    ? "bg-zinc-100 text-zinc-900 border-black/[0.06]"
                    : "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 shadow-sm",
                ].join(" ")}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy link
                  </>
                )}
              </button>
            </div>
            <p className="text-[12px] text-zinc-500 font-light pl-1 mt-1">
              Clients open this URL on their phone, take a selfie, and FotoSpace finds their photos automatically.
            </p>
          </div>

          {/* Welcome message */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-zinc-900 uppercase tracking-wide opacity-80 pl-1">Welcome message</label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="e.g. Your wedding photos are ready!"
              className="w-full px-4 py-3 rounded-xl border border-black/[0.08] bg-zinc-50 text-[15px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:bg-white transition-all duration-200 resize-none shadow-none"
            />
            <p className="text-[12px] text-zinc-400 pl-1">Shown on the visitor gallery page below the space name. {200 - welcomeMessage.length} chars left.</p>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-zinc-900 uppercase tracking-wide opacity-80 pl-1">Status</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = status === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setStatus(opt.id as Space["status"])}
                    className={[
                      "flex flex-col items-start gap-1.5 px-4 py-3.5 rounded-xl border text-left transition-all duration-200",
                      isSelected
                        ? "border-zinc-900 bg-black/[0.02] ring-1 ring-zinc-900 shadow-sm"
                        : "border-black/[0.06] bg-zinc-50 hover:bg-white hover:border-black/[0.1]",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${opt.dot}`}/>
                      <span className="text-[14px] font-semibold text-zinc-900">{opt.label}</span>
                    </span>
                    <span className="text-[12px] text-zinc-500 leading-snug font-light">{opt.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-5 bg-zinc-50/50 border-t border-black/[0.03]">
          <span className={`text-[13px] font-medium transition-colors duration-200 ${isDirty ? "text-amber-600" : "text-zinc-500"}`}>
            {isDirty ? "● Unsaved changes" : "All changes saved"}
          </span>
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 min-w-[8rem] justify-center"
          >
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin"/>Saving…</> : "Save changes"}
          </button>
        </div>
      </SectionCard>

      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="inline-flex items-center gap-2 self-start px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        <AlertTriangle className="w-4 h-4" />
        <span className="text-[14px] font-semibold">Delete Space</span>
        {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
      </button>

    </div>
  )
}
