"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { MatchedPhoto } from "@/types"

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
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
      })
      streamRef.current = s
      if (videoRef.current) videoRef.current.srcObject = s
    } catch {
      setError("Camera access denied. Please allow camera permissions.")
    }
  }

  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopStream()
      setStep("preview")
      setCapturedDataUrl(null)
      setError(null)
    }
    return stopStream
  }, [isOpen])

  function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = 640
    canvas.height = 640
    canvas.getContext("2d")?.drawImage(video, 0, 0, 640, 640)
    setCapturedDataUrl(canvas.toDataURL("image/jpeg", 0.9))
    setStep("captured")
    stopStream()
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && step !== "searching") onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Take a selfie</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {step === "preview" && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-xl aspect-square object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <svg width="200" height="260" viewBox="0 0 200 260">
                  <ellipse cx="100" cy="130" rx="90" ry="120" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
                </svg>
                <p className="text-white text-sm mt-2 opacity-80">Position your face in the oval</p>
              </div>
            </div>
          )}

          {step === "captured" && capturedDataUrl && (
            <div className="flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedDataUrl}
                className="w-full rounded-xl aspect-square object-cover"
                style={{ transform: "scaleX(-1)" }}
                alt="Captured selfie"
              />
              <p className="text-sm text-slate-500 text-center">Looking good? Hit search or retake.</p>
            </div>
          )}

          {step === "searching" && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <svg className="animate-spin w-10 h-10 text-blue-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-slate-500">Finding your photos...</p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          {step === "preview" && (
            <Button onClick={capture} className="w-full">Capture</Button>
          )}
          {step === "captured" && (
            <>
              <Button variant="ghost" onClick={retake}>Retake</Button>
              <Button onClick={search}>Find my photos</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
