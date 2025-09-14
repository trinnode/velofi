import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { UrlObject } from 'url'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { Menu, X, User, LogOut, Settings } from 'lucide-react'
import { useAccount, useDisconnect } from 'wagmi'
// Removed SIWE integration
// Removed unused formatEther import
import { toast } from 'react-hot-toast'
import ConnectWalletButton from './ConnectWalletButton'


export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  // ...existing code...

  useEffect(() => {
    setMounted(true)
  }, [])

  const navigation = [
    { name: 'Home', href: '/', icon: '🏠' },
    { name: 'Savings', href: '/savings', icon: '💰' },
    { name: 'Credit', href: '/credit', icon: '📊' },
    { name: 'DEX', href: '/dex', icon: '🔄' },
    { name: 'Governance', href: '/governance', icon: '🗳️' }
  ]

  const handleSignOut = async () => {
    try {
      disconnect()
      setIsProfileDropdownOpen(false)
      toast.success('Successfully signed out!')
      router.push('/')
    } catch (error) {
      console.error('Sign out failed:', error)
      toast.error('Sign out failed')
    }
  }

  if (!mounted) return null

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-jet-black/95 backdrop-blur-sm border-b border-gunmetal-gray/50 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Image
                src="/Logo.png"
                alt="VeloFi Logo"
                width={40}
                height={40}
                className="rounded-lg"
                priority
              />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-neon-magenta to-electric-lime bg-clip-text text-transparent">
              VeloFi
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href as unknown as UrlObject}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-300 ${
                  router.pathname === item.href
                    ? 'bg-neon-magenta/20 text-neon-magenta'
                    : 'text-gray-300 hover:text-white hover:bg-gunmetal-gray/50'
                }`}
              >
                <span>{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {isConnected ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-3 px-4 py-2 bg-gunmetal-gray/50 rounded-lg hover:bg-gunmetal-gray/70 transition-all duration-300"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-jet-black" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-white text-sm font-medium">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </div>
                    <div className="text-gray-400 text-xs">Connected</div>
                  </div>
                </button>

                {/* Profile Dropdown */}
                {isProfileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-64 bg-gunmetal-gray border border-gray-700 rounded-xl shadow-lg overflow-hidden z-10"
                  >
                    <div className="p-4 border-b border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-jet-black" />
                        </div>
                        <div>
                          <div className="text-white font-medium">{address?.slice(0, 8)}...{address?.slice(-6)}</div>
                          <div className="text-electric-lime text-sm">Authenticated</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false)
                          router.push('/settings')
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-jet-black/50 rounded-lg transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                      
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <ConnectWalletButton />
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-gunmetal-gray/50 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gunmetal-gray/50 py-4"
          >
            <nav className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href as unknown as UrlObject}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                    router.pathname === item.href
                      ? 'bg-neon-magenta/20 text-neon-magenta'
                      : 'text-gray-300 hover:text-white hover:bg-gunmetal-gray/50'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile Wallet Connection */}
              <div className="px-4 pt-4">
                <ConnectWalletButton className="w-full justify-center" />
              </div>
            </nav>
          </motion.div>
        )}
      </div>

      {/* Click outside to close dropdowns */}
      {(isProfileDropdownOpen || isMobileMenuOpen) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setIsProfileDropdownOpen(false)
            setIsMobileMenuOpen(false)
          }}
        />
      )}
    </motion.header>
  )
}
