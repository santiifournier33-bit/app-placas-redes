'use client'

import * as React from "react"
import { ErrorState } from "./error-state"

interface Props {
  children: React.ReactNode
  fallbackTitle?: string
  fallbackDescription?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title={this.props.fallbackTitle ?? "Algo salió mal"}
          description={this.props.fallbackDescription ?? "Recargá la sección o intentá de nuevo."}
          onRetry={this.handleReset}
          retryLabel="Reintentar"
          className="m-4"
        />
      )
    }

    return this.props.children
  }
}
