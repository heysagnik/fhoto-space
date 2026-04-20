"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"

interface Props {
  photoIds: string[]
  spaceId: string
}

export function DownloadButton({ photoIds, spaceId }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/visitor/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds, spaceId }),
      })
      if (!res.ok) throw new Error("Download failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "fotospace-photos.zip"
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button 
        disabled={isLoading} 
        onClick={handleDownload}
        className="h-10 px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl flex items-center justify-center gap-2 text-[13px] font-semibold transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {isLoading ? "Preparing…" : `Download (${photoIds.length})`}
      </button>
      {error && <p className="text-[11px] text-red-500 font-medium absolute -bottom-5 right-4">{error}</p>}
    </div>
  )
}
