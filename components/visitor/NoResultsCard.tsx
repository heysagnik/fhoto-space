"use client"

import { SearchX, Camera } from "lucide-react"

interface Props {
  onRetake: () => void
}

export function NoResultsCard({ onRetake }: Props) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FDFDFD] px-6">
      <div className="w-full max-w-sm bg-white rounded-[1.5rem] border border-black/[0.04] shadow-xl shadow-black/[0.02] p-8 flex flex-col items-center text-center gap-5">
        <div className="w-14 h-14 rounded-full bg-zinc-50 border border-black/[0.04] flex items-center justify-center -mb-2 shadow-sm">
          <SearchX className="w-6 h-6 text-zinc-400" />
        </div>
        <div>
          <p className="font-bold text-xl text-zinc-900 tracking-tight">No photos found</p>
          <p className="text-[14px] text-zinc-500 font-light mt-1.5 px-2">
            We couldn't find any photos matching your face. Try retaking your selfie in better lighting.
          </p>
        </div>
        <button 
          onClick={onRetake}
          className="w-full h-12 mt-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl flex items-center justify-center gap-2 text-[14px] font-semibold transition-all active:scale-[0.98] shadow-sm"
        >
          <Camera className="w-4 h-4" />
          Retake Selfie
        </button>
      </div>
    </div>
  )
}
