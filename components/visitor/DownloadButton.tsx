"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

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
      <Button disabled={isLoading} onClick={handleDownload}>
        {!isLoading && <Download size={16} />}
        {isLoading ? "Preparing…" : `Download all (${photoIds.length})`}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
