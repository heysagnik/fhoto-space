"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ImageUploader } from "@/components/spaces/ImageUploader"
import { FaceGroupBar } from "@/components/spaces/FaceGroupBar"
import { ImageGrid, type ImageGridHandle } from "@/components/spaces/ImageGrid"
import type { FaceCluster } from "@/app/api/spaces/[spaceId]/faces/route"

interface Props {
  spaceId: string
}

export function ImagesShell({ spaceId }: Props) {
  const [clusters, setClusters] = useState<FaceCluster[]>([])
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null)
  const gridRef = useRef<ImageGridHandle>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadClusters = useCallback(() => {
    fetch(`/api/spaces/${spaceId}/faces`)
      .then((r) => r.json())
      .then((d) => setClusters(d.clusters ?? []))
      .catch(() => {})
  }, [spaceId])

  useEffect(() => { loadClusters() }, [loadClusters])

  // Poll until all photoIds are face-indexed, then refresh grid + clusters once
  function pollUntilIndexed(photoIds: string[]) {
    if (photoIds.length === 0) return
    if (pollRef.current) clearTimeout(pollRef.current)

    async function check() {
      try {
        const res = await fetch(`/api/photos/status?ids=${photoIds.join(",")}`)
        if (!res.ok) return
        const { statuses } = await res.json()
        const allDone = statuses.every((s: { faceIndexed: boolean }) => s.faceIndexed)
        if (allDone) {
          gridRef.current?.refresh()
          loadClusters()
        } else {
          pollRef.current = setTimeout(check, 4000)
        }
      } catch {
        pollRef.current = setTimeout(check, 4000)
      }
    }

    pollRef.current = setTimeout(check, 4000)
  }

  function handleUploadsComplete(donePhotoIds: string[]) {
    // Show photos immediately
    gridRef.current?.refresh()
    // Then poll for face indexing completion
    pollUntilIndexed(donePhotoIds)
  }

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current) }, [])

  const filterPhotoIds = selectedClusterId !== null
    ? (clusters.find((c) => c.clusterId === selectedClusterId)?.photoIds ?? null)
    : null

  return (
    <div className="flex flex-col gap-5">
      <ImageUploader spaceId={spaceId} onUploadsComplete={handleUploadsComplete} />

      {clusters.length > 0 && (
        <FaceGroupBar
          clusters={clusters}
          selectedClusterId={selectedClusterId}
          onSelect={setSelectedClusterId}
        />
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[15px] font-semibold text-zinc-900">
            {selectedClusterId !== null
              ? `${filterPhotoIds?.length ?? 0} photo${(filterPhotoIds?.length ?? 0) !== 1 ? "s" : ""} with this person`
              : "All photos"}
          </p>
          {selectedClusterId !== null && (
            <button
              onClick={() => setSelectedClusterId(null)}
              className="text-xs text-zinc-500 hover:text-zinc-900 font-medium"
            >
              Clear filter
            </button>
          )}
        </div>
        <ImageGrid
          ref={gridRef}
          spaceId={spaceId}
          filterPhotoIds={filterPhotoIds}
          key={selectedClusterId ?? "all"}
        />
      </div>
    </div>
  )
}
