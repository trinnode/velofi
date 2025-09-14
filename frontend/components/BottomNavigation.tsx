import React from 'react'
import { motion } from 'framer-motion'
import { Home, TrendingUp, Zap, Shield, Vote } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getButtonTouchClasses } from '../utils/mobile'

interface BottomNavigationProps {
  className?: string
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ className = '' }) => {
  const router = useRouter()
  const currentPath = router.pathname

  const navigationItems = [
    { 
      href: '/dashboard', 
      label: 'Home', 
      icon: Home,
      color: 'text-blue-400'
    },
    { 
      href: '/savings', 
      label: 'Savings', 
      icon: TrendingUp,
      color: 'text-green-400'
    },
    { 
      href: '/dex', 
      label: 'Trade', 
      icon: Zap,
      color: 'text-yellow-400'
    },
    { 
      href: '/credit', 
      label: 'Credit', 
      icon: Shield,
      color: 'text-purple-400'
    },
    { 
      href: '/governance', 
      label: 'Vote', 
      icon: Vote,
      color: 'text-pink-400'
    },
  ]

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={`fixed bottom-0 left-0 right-0 z-40 bg-jet-black/90 backdrop-blur-md border-t border-neon-magenta/20 lg:hidden ${className}`}
    >
      <div className="grid grid-cols-5 gap-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.href
          
          return (
            <Link
              key={item.href}
              href={{ pathname: item.href }}
              className={`relative flex flex-col items-center justify-center py-2 px-1 transition-colors ${getButtonTouchClasses()}`}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-full"
                />
              )}
              
              {/* Icon */}
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -2 : 0
                }}
                transition={{ duration: 0.2 }}
                className={`p-2 rounded-lg ${
                  isActive 
                    ? 'bg-gradient-to-r from-neon-magenta/20 to-electric-lime/20' 
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <Icon 
                  className={`w-5 h-5 ${
                    isActive 
                      ? 'text-white' 
                      : 'text-gray-400'
                  }`} 
                />
              </motion.div>
              
              {/* Label */}
              <span 
                className={`text-xs mt-1 ${
                  isActive 
                    ? 'text-white font-medium' 
                    : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
      
      {/* Safe area for notched devices */}
      <div className="h-safe-area-inset-bottom" />
    </motion.div>
  )
}

export default BottomNavigation