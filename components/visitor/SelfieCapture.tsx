"use client"

import { useEffect, useRef, useState } from "react"
import type { MatchedPhoto } from "@/types"
import { X, Camera, RefreshCw, Loader2, Search } from "lucide-react"

type Step = "preview" | "captured" | "searching"

interface Props {
  isOpen: boolean
  onClose: () => void
  spaceId: string
  onResults: (photos: MatchedPhoto[]) => void
}

export function SelfieCapture({ isOpen, onClose, spaceId, onResults }: Props) {
  const [step, setStep] = useState<Step>("preview")
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function startCamera() {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      if (isMobile) {
        throw new Error("Mobile device detected")
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available")
      }
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
      })
      streamRef.current = s
      if (videoRef.current) {
        videoRef.current.srcObject = s
        await videoRef.current.play().catch(() => {})
      }
    } catch {
      setError("Please use the button below to take a photo.")
    }
  }

  useEffect(() => {
    if (isOpen) {
      setStep("preview")
      setCapturedDataUrl(null)
      setError(null)
      startCamera()
    } else {
      stopStream()
    }
    return stopStream
  }, [isOpen])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const width = video.videoWidth || 640
    const height = video.videoHeight || 640
    canvas.width = width
    canvas.height = height
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height)
    setCapturedDataUrl(canvas.toDataURL("image/jpeg", 0.9))
    setStep("captured")
    stopStream()
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setCapturedDataUrl(event.target?.result as string)
      setStep("captured")
      stopStream()
    }
    reader.readAsDataURL(file)
  }

  function retake() {
    setCapturedDataUrl(null)
    setError(null)
    setStep("preview")
    startCamera()
  }

  async function search() {
    if (!capturedDataUrl) return
    setStep("searching")
    setError(null)
    try {
      const res = await fetch("/api/visitor/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId, selfieBase64: capturedDataUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Search failed")
      onResults(data.photos)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed")
      setStep("captured")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col font-sans">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 sm:px-6 py-4 shrink-0 z-20 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={() => { if (step !== "searching") onClose() }}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-colors"
          disabled={step === "searching"}
        >
          <X className="w-5 h-5" />
        </button>
        <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white font-medium text-[13px] tracking-wide shadow-sm">
          {step === "preview" ? "Position your face" : step === "captured" ? "Confirm photo" : "Searching…"}
        </div>
        <div className="w-10 h-10" />
      </div>

      {/* Camera / preview area */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {step === "preview" && !error && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {/* Soft oval guide */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-[80%] max-w-[320px] aspect-[3/4] border-2 border-white/50 rounded-[4rem] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-all" />
              <p className="text-white/90 text-[14px] font-medium mt-8 bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                Center your face in the frame
              </p>
            </div>
          </>
        )}

        {step === "preview" && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-xl">
               <Camera className="w-7 h-7 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg tracking-tight mb-1">Ready for a Selfie</h3>
              <p className="text-zinc-400 text-[14px] max-w-xs mx-auto font-light">
                Use your device's camera to snap a quick photo. We'll use this to match you with your gallery.
              </p>
            </div>
          </div>
        )}

        {step === "captured" && capturedDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedDataUrl}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
            alt="Captured selfie"
          />
        )}

        {step === "searching" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black z-10">
            {capturedDataUrl && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedDataUrl}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white/20 opacity-80"
                  style={{ transform: "scaleX(-1)" }}
                  alt="Searching selfie"
                />
                <div className="absolute inset-0 rounded-full border-4 border-white border-t-transparent animate-spin" />
              </div>
            )}
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-white font-semibold text-lg tracking-tight flex items-center gap-2">
                <Search className="w-5 h-5 text-zinc-400" /> Scanning event…
              </p>
              <p className="text-zinc-500 text-[14px] font-light">Matching your face securely across photos</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 px-6 pb-[max(3rem,env(safe-area-inset-bottom))] pt-16 flex flex-col gap-4 justify-center bg-gradient-to-t from-black via-black/80 to-transparent">
        {error && (
          <div className="flex flex-col items-center w-full max-w-sm mx-auto">
            <label className="w-full bg-white text-black px-5 py-4 rounded-2xl text-[15px] font-semibold cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl hover:bg-zinc-100">
              <Camera className="w-5 h-5" />
              Capture Photo natively
              <input 
                type="file" 
                accept="image/*" 
                capture="user" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </label>
          </div>
        )}

        {step === "preview" && !error && (
          <div className="flex justify-center w-full">
            <button
              onClick={capture}
              className="w-20 h-20 rounded-full border-[5px] border-white/30 flex items-center justify-center active:scale-95 transition-all outline-none group"
              aria-label="Capture"
            >
              <div className="w-[60px] h-[60px] rounded-full bg-white group-hover:scale-[0.95] transition-transform" />
            </button>
          </div>
        )}

        {step === "captured" && (
          <div className="flex items-center gap-4 w-full max-w-sm mx-auto">
            <button 
              onClick={retake} 
              className="flex-1 h-14 rounded-2xl bg-white/10 text-white font-medium text-[15px] hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center gap-2 backdrop-blur-md border border-white/10"
            >
              <RefreshCw className="w-4 h-4" />
              Retake
            </button>
            <button 
              onClick={search} 
              className="flex-[2] h-14 rounded-2xl bg-white text-black font-semibold text-[15px] hover:bg-zinc-100 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl"
            >
              <Search className="w-4 h-4" />
              Find my photos
            </button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
