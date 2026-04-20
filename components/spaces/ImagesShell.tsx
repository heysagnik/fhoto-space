"use client"

import { useEffect, useRef, useState } from "react"
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

  function loadClusters() {
    fetch(`/api/spaces/${spaceId}/faces`)
      .then((r) => r.json())
      .then((d) => setClusters(d.clusters ?? []))
      .catch(() => {})
  }

  useEffect(() => { loadClusters() }, [spaceId])

  function handleUploadsComplete() {
    gridRef.current?.refresh()
    loadClusters()
  }

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
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold text-slate-900">
            {selectedClusterId !== null
              ? `${filterPhotoIds?.length ?? 0} photo${(filterPhotoIds?.length ?? 0) !== 1 ? "s" : ""} with this person`
              : "All photos"}
          </p>
          {selectedClusterId !== null && (
            <button
              onClick={() => setSelectedClusterId(null)}
              className="text-xs text-blue-600 hover:underline font-medium"
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
