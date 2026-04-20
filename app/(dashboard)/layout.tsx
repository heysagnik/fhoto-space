import { ErrorBoundary } from "@/components/ErrorBoundary"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "oklch(97.02% 0 0)" }}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  )
}
