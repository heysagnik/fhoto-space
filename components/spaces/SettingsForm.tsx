"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Image from "next/image"
import type { Space } from "@/types"

const STATUS_OPTIONS = [
  { id: "draft",  label: "Draft",  hint: "Not visible to visitors",  dot: "bg-amber-400",   pill: "bg-amber-50 text-amber-700" },
  { id: "active", label: "Active", hint: "Gallery is live",          dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700" },
  { id: "closed", label: "Closed", hint: "Access has ended",         dot: "bg-slate-400",   pill: "bg-slate-100 text-slate-600" },
]

function Spinner() {
  return (
    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  )
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 overflow-hidden ${className}`}
      style={{ boxShadow: "0 1px 3px oklch(15% 0.03 264 / 0.06), 0 3px 8px oklch(15% 0.03 264 / 0.06)" }}>
      {children}
    </div>
  )
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
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
  const currentStatus = STATUS_OPTIONS.find((o) => o.id === status)

  // Cover
  const [coverUrl, setCoverUrl] = useState<string | null>(space.coverImageUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Share link copy
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState("")
  useEffect(() => { setOrigin(window.location.origin) }, [])
  const galleryUrl = `${origin}/s/${slug}`

  // Danger zone
  const [dangerOpen, setDangerOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const canDelete = deleteConfirm === space.name

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
    if (!canDelete) return
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
    if (!["image/jpeg", "image/png"].includes(file.type)) return
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    const res = await fetch(`/api/spaces/${space.id}/cover`, { method: "POST", body: form })
    setUploading(false)
    if (res.ok) {
      const data = await res.json()
      setCoverUrl(data.coverImageUrl)
      toast.success("Cover updated")
    }
  }

  async function handleCoverRemove() {
    await fetch(`/api/spaces/${space.id}/cover`, { method: "DELETE" })
    setCoverUrl(null)
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(galleryUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">

      {/* ── Share link banner ── */}
      <SectionCard>
        <SectionHeader
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          }
          title="Customer gallery link"
          description="Share this URL with your clients so they can find their photos."
        />
        <div className="px-6 py-5 flex flex-col gap-3">
          {/* Status pill */}
          {currentStatus && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${currentStatus.pill}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot}`}/>
                {currentStatus.label}
              </span>
              {status !== "active" && (
                <span className="text-xs text-slate-400">— set status to <strong>Active</strong> for clients to access</span>
              )}
            </div>
          )}

          {/* URL row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 min-w-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span className="text-sm text-slate-600 font-mono truncate">{galleryUrl}</span>
            </div>
            <button
              onClick={handleCopyLink}
              className={[
                "flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 shrink-0",
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95",
              ].join(" ")}
            >
              {copied ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy link
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Clients open this URL on their phone, take a selfie, and FotoSpace finds their photos automatically.
          </p>
        </div>
      </SectionCard>

      {/* ── General settings ── */}
      <SectionCard>
        <SectionHeader
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          }
          title="General settings"
          description="Space name, public URL slug, and visibility."
        />

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Space name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-150"
              placeholder="e.g. Smith Wedding 2025"
            />
          </div>

          {/* Slug */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">URL slug</label>
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400 focus-within:bg-white transition-all duration-150 overflow-hidden">
              <span className="px-3.5 text-sm text-slate-400 font-medium shrink-0 border-r border-slate-200 py-2.5 bg-slate-100/80 select-none">
                fotospace.app/s/
              </span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="flex-1 px-3 py-2.5 text-sm text-slate-900 font-mono bg-transparent focus:outline-none"
                placeholder="your-slug"
              />
            </div>
          </div>

          {/* Welcome message */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Welcome message</label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="e.g. Your wedding photos are ready!"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-150 resize-none"
            />
            <p className="text-xs text-slate-400">Shown on the visitor gallery page below the space name. {200 - welcomeMessage.length} chars left.</p>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = status === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setStatus(opt.id as Space["status"])}
                    className={[
                      "flex flex-col items-start gap-1 px-3.5 py-3 rounded-xl border text-left transition-all duration-150",
                      isSelected
                        ? "border-blue-400 bg-blue-50 ring-2 ring-blue-500/20"
                        : "border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${opt.dot}`}/>
                      <span className="text-sm font-semibold text-slate-800">{opt.label}</span>
                    </span>
                    <span className="text-[11px] text-slate-400 leading-snug">{opt.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-t border-slate-100">
          <span className={`text-xs font-medium transition-colors duration-200 ${isDirty ? "text-amber-600" : "text-slate-400"}`}>
            {isDirty ? "● Unsaved changes" : "All changes saved"}
          </span>
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 min-w-[8rem] justify-center"
          >
            {isSaving ? <><Spinner/>Saving…</> : "Save changes"}
          </button>
        </div>
      </SectionCard>

      {/* ── Cover photo ── */}
      <SectionCard>
        <SectionHeader
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2.5"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          }
          title="Cover photo"
          description="Shown as the hero image on the visitor gallery landing page."
        />

        <div className="px-6 py-5">
          {coverUrl ? (
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="relative w-48 h-28 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                <Image src={coverUrl} alt="Cover preview" fill className="object-cover" sizes="192px"/>
              </div>
              <div className="flex flex-col gap-2 justify-end h-28">
                <p className="text-xs text-slate-500">Cover photo uploaded</p>
                <button
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all duration-150 disabled:opacity-50"
                >
                  Replace
                </button>
                <button
                  onClick={handleCoverRemove}
                  disabled={uploading}
                  className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 active:scale-95 transition-all duration-150 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleCoverFile(f) }}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={[
                "flex flex-col items-center justify-center gap-3 h-36 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150",
                isDragging
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40",
              ].join(" ")}
            >
              {uploading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Spinner/>
                  Uploading…
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-slate-400" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">Drop photo here or click to browse</p>
                    <p className="text-xs text-slate-400 mt-0.5">JPEG or PNG · max 10 MB</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); e.target.value = "" }}
        />
      </SectionCard>

      {/* ── Danger zone ── */}
      <div className="rounded-2xl border border-red-200/70 overflow-hidden bg-red-50/40"
        style={{ boxShadow: "0 1px 3px oklch(15% 0.03 264 / 0.04)" }}>

        {/* Collapsed header — toggle */}
        <button
          onClick={() => setDangerOpen((v) => !v)}
          className="flex items-center justify-between w-full px-6 py-4 text-left hover:bg-red-50/60 transition-colors duration-150"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500" strokeLinecap="round" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-red-700">Danger zone</p>
              <p className="text-xs text-red-400">Permanently delete this space</p>
            </div>
          </div>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-red-400 transition-transform duration-200 ${dangerOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* Expanded body */}
        {dangerOpen && (
          <div className="px-6 pb-6 flex flex-col gap-4 border-t border-red-200/60">
            <div className="mt-4 rounded-xl bg-red-100/60 border border-red-200/60 px-4 py-3 text-sm text-red-700 leading-relaxed">
              This is <strong>permanent and irreversible.</strong> All photos, face embeddings, and visitor access for <strong>{space.name}</strong> will be deleted immediately.
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                Type <span className="font-mono normal-case bg-red-100 px-1.5 py-0.5 rounded">{space.name}</span> to confirm
              </label>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={space.name}
                className="w-full px-3.5 py-2.5 rounded-xl border border-red-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-all duration-150"
              />
            </div>

            <button
              onClick={handleDelete}
              disabled={isDeleting || !canDelete}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 self-start min-w-[10rem] justify-center"
            >
              {isDeleting ? <><Spinner/>Deleting…</> : "Delete this space"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
