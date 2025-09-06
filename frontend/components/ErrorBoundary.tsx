import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-h-screen bg-gradient-to-br from-rich-black to-jet-black flex items-center justify-center p-4"
        >
          <div className="bg-gunmetal-gray/20 border border-red-500/20 rounded-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              We encountered an unexpected error. This might be due to a network issue or a temporary problem.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-950/50 border border-red-500/20 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-red-300 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/30 rounded-lg hover:bg-neon-magenta/30 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-neon-magenta to-electric-lime text-jet-black font-semibold rounded-lg hover:shadow-lg hover:shadow-neon-magenta/25 transition-all duration-300"
              >
                Reload Page
              </button>
            </div>
          </div>
        </motion.div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo)
    // You can add error reporting service here (e.g., Sentry)
  }
}

export default ErrorBoundary
