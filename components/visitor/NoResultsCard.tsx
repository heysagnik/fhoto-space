"use client"

import { Button } from "@/components/ui/button"
import { SearchX, Camera } from "lucide-react"

interface Props {
  onRetake: () => void
}

export function NoResultsCard({ onRetake }: Props) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center text-center gap-4">
        <SearchX size={48} className="text-slate-300" />
        <p className="font-bold text-lg text-slate-900">No photos found</p>
        <p className="text-sm text-slate-500">
          We couldn&apos;t find any photos matching your face. Try retaking your selfie in better
          lighting or facing the camera directly.
        </p>
        <Button onClick={onRetake}>
          <Camera size={16} />
          Try again
        </Button>
      </div>
    </div>
  )
}
