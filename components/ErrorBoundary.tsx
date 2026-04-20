"use client"

import { Component, ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-8">
          <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center gap-4">
            <p className="text-red-600 font-medium">Something went wrong</p>
            <p className="text-sm text-slate-500">{this.state.message}</p>
            <Button onClick={() => this.setState({ hasError: false, message: "" })}>Try again</Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
