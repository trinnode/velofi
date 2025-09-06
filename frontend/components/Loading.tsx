import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  className?: string
}

export function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className={`${sizeClasses[size]} text-neon-magenta`}
      >
        <Loader2 className="w-full h-full" />
      </motion.div>
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-gray-400"
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}

interface LoadingOverlayProps {
  isLoading: boolean
  text?: string
  className?: string
  children: React.ReactNode
}

export function LoadingOverlay({ isLoading, text = "Loading...", className = "", children }: LoadingOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-rich-black/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-50"
        >
          <LoadingSpinner size="lg" text={text} />
        </motion.div>
      )}
    </div>
  )
}

interface PageLoadingProps {
  text?: string
}

export function PageLoading({ text = "Loading VeloFi..." }: PageLoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-rich-black to-jet-black flex items-center justify-center p-4"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="relative w-24 h-24 mx-auto mb-4">
            <Image
              src="/Logo.png"
              alt="VeloFi Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <motion.div
            animate={{ 
              background: [
                'linear-gradient(45deg, #FF00AA, #AAFF00)',
                'linear-gradient(135deg, #AAFF00, #FF00AA)',
                'linear-gradient(225deg, #FF00AA, #AAFF00)',
                'linear-gradient(315deg, #AAFF00, #FF00AA)'
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-16 h-1 mx-auto rounded-full"
          />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold text-white mb-2"
        >
          VeloFi
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-gray-400 mb-8"
        >
          {text}
        </motion.p>

        <LoadingSpinner size="lg" />
      </div>
    </motion.div>
  )
}

export default LoadingSpinner
