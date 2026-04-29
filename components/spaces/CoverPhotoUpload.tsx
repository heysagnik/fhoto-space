"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface Props {
  spaceId: string
  initialUrl: string | null
}

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  )
}

async function uploadCover(spaceId: string, file: File): Promise<string> {
  // Step 1: get presigned URL + key
  const init = await fetch(`/api/spaces/${spaceId}/cover`)
  if (!init.ok) throw new Error("Failed to get upload URL")
  const { uploadUrl, key } = await init.json()

  // Step 2: upload directly to R2 (no Vercel size limit)
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": "image/jpeg" },
  })
  if (!putRes.ok) throw new Error("Upload to storage failed")

  // Step 3: confirm with backend and get public URL
  const confirm = await fetch(`/api/spaces/${spaceId}/cover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  })
  if (!confirm.ok) throw new Error("Failed to save cover")
  const data = await confirm.json()
  return data.coverImageUrl
}

export function CoverPhotoUpload({ spaceId, initialUrl }: Props) {
  const [coverUrl, setCoverUrl] = useState<string | null>(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPEG, PNG or WebP allowed")
      return
    }
    setError(null)
    setUploading(true)
    try {
      const url = await uploadCover(spaceId, file)
      setCoverUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    await fetch(`/api/spaces/${spaceId}/cover`, { method: "DELETE" })
    setCoverUrl(null)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden"
      style={{ boxShadow: "0 1px 3px oklch(15% 0.03 264 / 0.06)" }}>
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Cover photo</p>
          <p className="text-xs text-slate-500">Shown to visitors on the gallery landing page.</p>
        </div>
      </div>

      <div className="px-6 py-5">
        {coverUrl ? (
          <div className="flex flex-col gap-4">
            <div className="relative w-full max-w-sm h-44 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <Image src={coverUrl} alt="Cover" fill className="object-cover" sizes="384px" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? "Uploading…" : "Replace"}
              </Button>
              <Button variant="destructive" size="sm" disabled={uploading} onClick={handleRemove}>
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="drop-zone flex flex-col items-center justify-center gap-3 py-12 w-full max-w-sm cursor-pointer"
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            {uploading ? <Spinner /> : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-slate-400">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">Upload cover photo</p>
                  <p className="text-xs text-slate-400 mt-1">JPEG, PNG or WebP · any size</p>
                </div>
              </>
            )}
          </div>
        )}
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
    </div>
  )
}
