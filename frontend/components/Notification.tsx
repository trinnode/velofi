import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  X, 
  TrendingUp, 
  DollarSign,
  Zap,
  Award,
  Clock
} from 'lucide-react'

export interface NotificationData {
  id: string
  type: 'success' | 'error' | 'info' | 'warning' | 'transaction'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  icon?: React.ReactNode
  timestamp?: Date
}

interface NotificationManagerProps {
  notifications: NotificationData[]
  onRemove: (id: string) => void
}

export function NotificationManager({ notifications, onRemove }: NotificationManagerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function NotificationItem({ 
  notification, 
  onRemove 
}: { 
  notification: NotificationData
  onRemove: (id: string) => void 
}) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const duration = notification.duration || 5000
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onRemove(notification.id), 300)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [notification.id, notification.duration, onRemove])

  const getNotificationStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-electric-lime/10 border-electric-lime/30 text-electric-lime'
      case 'error':
        return 'bg-red-500/10 border-red-500/30 text-red-400'
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
      case 'transaction':
        return 'bg-neon-magenta/10 border-neon-magenta/30 text-neon-magenta'
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400'
    }
  }

  const getIcon = () => {
    if (notification.icon) return notification.icon

    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />
      case 'error':
        return <AlertCircle className="w-5 h-5" />
      case 'warning':
        return <AlertCircle className="w-5 h-5" />
      case 'transaction':
        return <Zap className="w-5 h-5" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ 
        opacity: isVisible ? 1 : 0, 
        x: isVisible ? 0 : 300, 
        scale: isVisible ? 1 : 0.8 
      }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`relative bg-gunmetal-gray/95 backdrop-blur-sm border rounded-xl p-4 shadow-lg pointer-events-auto ${getNotificationStyles()}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-semibold text-sm mb-1">
            {notification.title}
          </h4>
          <p className="text-gray-300 text-sm leading-relaxed">
            {notification.message}
          </p>
          
          {notification.timestamp && (
            <p className="text-gray-500 text-xs mt-2">
              {notification.timestamp.toLocaleTimeString()}
            </p>
          )}
          
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="mt-3 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors duration-200"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(() => onRemove(notification.id), 300)
          }}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors duration-200"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      
      {/* Progress bar for timed notifications */}
      {notification.duration && notification.duration > 0 && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: notification.duration / 1000, ease: 'linear' }}
          className="absolute bottom-0 left-0 h-1 bg-current rounded-b-xl opacity-30"
        />
      )}
    </motion.div>
  )
}

// Notification hook for easy usage
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([])

  const addNotification = (notification: Omit<NotificationData, 'id' | 'timestamp'>) => {
    const newNotification: NotificationData = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    }
    setNotifications(prev => [...prev, newNotification])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  // Predefined notification types
  const notify = {
    success: (title: string, message: string, options?: Partial<NotificationData>) =>
      addNotification({ type: 'success', title, message, ...options }),
    
    error: (title: string, message: string, options?: Partial<NotificationData>) =>
      addNotification({ type: 'error', title, message, duration: 8000, ...options }),
    
    info: (title: string, message: string, options?: Partial<NotificationData>) =>
      addNotification({ type: 'info', title, message, ...options }),
    
    warning: (title: string, message: string, options?: Partial<NotificationData>) =>
      addNotification({ type: 'warning', title, message, duration: 7000, ...options }),
    
    transaction: (title: string, message: string, options?: Partial<NotificationData>) =>
      addNotification({ 
        type: 'transaction', 
        title, 
        message, 
        duration: 0, // Persistent until dismissed
        icon: <Zap className="w-5 h-5" />,
        ...options 
      }),

    // Specialized notifications for DeFi actions
    deposit: (amount: string, token: string) =>
      addNotification({
        type: 'success',
        title: 'Deposit Successful',
        message: `${amount} ${token} deposited successfully`,
        icon: <DollarSign className="w-5 h-5" />,
        duration: 6000
      }),

    withdrawal: (amount: string, token: string) =>
      addNotification({
        type: 'success',
        title: 'Withdrawal Complete',
        message: `${amount} ${token} withdrawn successfully`,
        icon: <TrendingUp className="w-5 h-5" />,
        duration: 6000
      }),

    swap: (fromAmount: string, fromToken: string, toAmount: string, toToken: string) =>
      addNotification({
        type: 'success',
        title: 'Swap Completed',
        message: `Swapped ${fromAmount} ${fromToken} for ${toAmount} ${toToken}`,
        icon: <Award className="w-5 h-5" />,
        duration: 6000
      }),

    loan: (amount: string, token: string) =>
      addNotification({
        type: 'success',
        title: 'Loan Approved',
        message: `${amount} ${token} loan has been approved and funds transferred`,
        icon: <CheckCircle className="w-5 h-5" />,
        duration: 8000
      }),

    vote: (proposalTitle: string, vote: 'for' | 'against') =>
      addNotification({
        type: 'success',
        title: 'Vote Recorded',
        message: `Your vote ${vote} "${proposalTitle}" has been recorded`,
        icon: <Award className="w-5 h-5" />,
        duration: 6000
      }),

    pending: (action: string, txHash?: string) =>
      addNotification({
        type: 'transaction',
        title: 'Transaction Pending',
        message: `${action} transaction is being processed...`,
        icon: <Clock className="w-5 h-5 animate-spin" />,
        duration: 0,
        action: txHash ? {
          label: 'View Transaction',
          onClick: () => window.open(`https://explorer.somnia.network/tx/${txHash}`, '_blank')
        } : undefined
      })
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    notify
  }
}

export default NotificationManager
