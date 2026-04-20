"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import type { FaceCluster } from "@/app/api/spaces/[spaceId]/faces/route"

interface Props {
  clusters: FaceCluster[]
  selectedClusterId: number | null
  onSelect: (id: number | null) => void
}

export function FaceGroupBar({ clusters, selectedClusterId, onSelect }: Props) {
  if (clusters.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4"
      style={{ boxShadow: "0 1px 3px oklch(15% 0.03 264 / 0.06)" }}>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-bold text-slate-900">People in this space</p>
        <Badge variant="secondary">{clusters.length}</Badge>
      </div>
      <div className="flex flex-wrap gap-3">
        {/* "All" chip */}
        <button
          onClick={() => onSelect(null)}
          className={[
            "flex flex-col items-center gap-1.5 group",
          ].join(" ")}
        >
          <div className={[
            "w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-150",
            selectedClusterId === null
              ? "border-blue-500 ring-2 ring-blue-200"
              : "border-slate-200 hover:border-slate-400",
          ].join(" ")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-slate-400">
              <rect x="3" y="3" width="18" height="18" rx="2.5"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <span className={`text-[11px] font-semibold ${selectedClusterId === null ? "text-blue-600" : "text-slate-500"}`}>
            All
          </span>
        </button>

        {clusters.map((cluster) => (
          <button
            key={cluster.clusterId}
            onClick={() => onSelect(selectedClusterId === cluster.clusterId ? null : cluster.clusterId)}
            className="flex flex-col items-center gap-1.5"
          >
            <div className={[
              "w-14 h-14 rounded-full border-2 overflow-hidden relative transition-all duration-150",
              selectedClusterId === cluster.clusterId
                ? "border-blue-500 ring-2 ring-blue-200"
                : "border-slate-200 hover:border-slate-400",
            ].join(" ")}>
              <Image
                src={cluster.thumbnailUrl}
                fill
                className="object-cover"
                alt={`Person ${cluster.clusterId + 1}`}
                sizes="56px"
              />
            </div>
            <span className={`text-[11px] font-semibold ${selectedClusterId === cluster.clusterId ? "text-blue-600" : "text-slate-500"}`}>
              {cluster.photoCount}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
