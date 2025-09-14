import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Home, TrendingUp, Zap, Shield, Vote, User, Settings, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import ConnectWalletButton from './ConnectWalletButton'
import { useAuth } from '../contexts/AuthContext'
import { getButtonTouchClasses } from '../utils/mobile'

interface MobileHeaderProps {
  className?: string
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ className = '' }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Close menu when route changes
    setIsMenuOpen(false)
    setIsProfileOpen(false)
  }, [router.pathname])

  const navigationItems = [
    { href: '/dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { href: '/savings', label: 'Savings', icon: <TrendingUp className="w-5 h-5" /> },
    { href: '/dex', label: 'DEX', icon: <Zap className="w-5 h-5" /> },
    { href: '/credit', label: 'Credit', icon: <Shield className="w-5 h-5" /> },
    { href: '/governance', label: 'Governance', icon: <Vote className="w-5 h-5" /> },
  ]

  const profileItems = [
    { href: '/profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { href: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ]

  if (!mounted) return null

  const currentPath = router.pathname

  return (
    <>
      {/* Header Bar */}
      <header className={`fixed top-0 left-0 right-0 z-50 bg-jet-black/90 backdrop-blur-md border-b border-neon-magenta/20 ${className}`}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-lg flex items-center justify-center">
              <span className="text-jet-black font-bold text-sm">V</span>
            </div>
            <span className="text-white font-bold text-lg">VeloFi</span>
          </Link>

          {/* Mobile Actions */}
          <div className="flex items-center space-x-3">
            {/* Profile Dropdown for authenticated users */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors ${getButtonTouchClasses()}`}
                >
                  <div className="w-6 h-6 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-full" />
                  <ChevronDown 
                    className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} 
                  />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-jet-black border border-gray-700 rounded-lg shadow-lg overflow-hidden"
                    >
                      {profileItems.map((item) => (
                        <Link
                          key={item.href}
                          href={{ pathname: item.href }}
                          className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      ))}
                      <div className="border-t border-gray-700 px-4 py-3">
                        <button className="text-sm text-red-400 hover:text-red-300 transition-colors">
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Connect Wallet Button */}
            {!isAuthenticated && <ConnectWalletButton />}

            {/* Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 text-gray-400 hover:text-white transition-colors lg:hidden ${getButtonTouchClasses()}`}
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-jet-black/50 backdrop-blur-sm z-40 lg:hidden"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed right-0 top-0 h-full w-80 max-w-[90vw] bg-jet-black border-l border-neon-magenta/20 z-50 lg:hidden"
            >
              <div className="flex flex-col h-full">
                {/* Menu Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                  <h2 className="text-lg font-semibold text-white">Navigation</h2>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className={`p-2 text-gray-400 hover:text-white transition-colors ${getButtonTouchClasses()}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Navigation Items */}
                <div className="flex-1 overflow-y-auto p-4">
                  <nav className="space-y-2">
                    {navigationItems.map((item) => {
                      const isActive = currentPath === item.href
                      return (
                        <Link
                          key={item.href}
                          href={{ pathname: item.href }}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/30'
                              : 'text-gray-300 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          {item.icon}
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      )
                    })}
                  </nav>

                  {/* Quick Stats */}
                  {isAuthenticated && (
                    <div className="mt-8 p-4 bg-gray-800/50 rounded-lg">
                      <h3 className="text-sm font-semibold text-gray-400 mb-3">Quick Stats</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Portfolio</span>
                          <span className="text-white">$12,345</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">APY</span>
                          <span className="text-electric-lime">8.5%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Credit Score</span>
                          <span className="text-neon-magenta">750</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Menu Footer */}
                <div className="p-4 border-t border-gray-700">
                  <div className="text-xs text-gray-500 text-center">
                    VeloFi v1.0.0
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer for fixed header */}
      <div className="h-16" />
    </>
  )
}

export default MobileHeader