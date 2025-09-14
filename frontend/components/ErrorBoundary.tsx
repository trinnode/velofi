import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home, Copy, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getButtonTouchClasses, getMobileText, getMobilePadding } from '../utils/mobile'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string
  copied: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorId: '',
    copied: false
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Log to external error service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo)
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
      
      // Send to error tracking service (Sentry, LogRocket, etc.)
      console.log('Error logged:', errorData)
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError)
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorId: '', copied: false })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private copyErrorId = async () => {
    try {
      await navigator.clipboard.writeText(this.state.errorId)
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2000)
    } catch (err) {
      console.error('Failed to copy error ID:', err)
    }
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
          className={`min-h-screen bg-gradient-to-br from-rich-black to-jet-black flex items-center justify-center ${getMobilePadding('md')}`}
        >
          <div className="bg-gunmetal-gray/20 border border-red-500/20 rounded-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            
            <h2 className={`font-bold text-white mb-4 ${getMobileText('2xl')}`}>Something went wrong</h2>
            
            <p className={`text-gray-300 mb-6 leading-relaxed ${getMobileText('base')}`}>
              We encountered an unexpected error. This might be due to a network issue or a temporary problem.
            </p>

            {/* Error ID */}
            {this.state.errorId && (
              <div className="mb-6 p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Error ID:</p>
                    <p className="text-sm text-gray-300 font-mono">{this.state.errorId}</p>
                  </div>
                  <button
                    onClick={this.copyErrorId}
                    className={`p-2 text-gray-400 hover:text-white transition-colors ${getButtonTouchClasses()}`}
                    title="Copy Error ID"
                  >
                    {this.state.copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-950/50 border border-red-500/20 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-red-300 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="text-red-400 cursor-pointer text-xs">Stack Trace</summary>
                    <pre className="text-xs text-red-300 mt-2 overflow-auto max-h-32">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className={`flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-neon-magenta to-electric-lime text-jet-black font-semibold rounded-lg hover:shadow-lg transition-all duration-300 ${getButtonTouchClasses()}`}
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className={`px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors ${getButtonTouchClasses()}`}
              >
                Reload Page
              </button>

              <Link
                href="/"
                className={`flex items-center justify-center gap-2 px-4 py-3 bg-transparent border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white font-semibold rounded-lg transition-all duration-300 ${getButtonTouchClasses()}`}
              >
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </div>

            {/* Support Info */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-2">
                If this problem persists, contact support with the Error ID above.
              </p>
            </div>
          </div>
        </motion.div>
      )
    }

    return this.props.children
  }
}

// Enhanced hook for error handling in functional components
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: string, errorInfo?: ErrorInfo) => {
    console.error(`Error in ${context || 'component'}:`, error, errorInfo)
    
    // Generate error ID for tracking
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2)
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      try {
        const errorData = {
          message: error.message,
          stack: error.stack,
          context,
          errorId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }
        
        // Send to error tracking service
        console.log('Error logged:', errorData)
      } catch (loggingError) {
        console.error('Failed to log error:', loggingError)
      }
    }
    
    return errorId
  }

  const handleAsyncError = async (asyncFn: () => Promise<unknown>, context?: string) => {
    try {
      return await asyncFn()
    } catch (error) {
      return handleError(error as Error, context)
    }
  }

  return { handleError, handleAsyncError }
}

// Higher-order component wrapper
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default ErrorBoundary
