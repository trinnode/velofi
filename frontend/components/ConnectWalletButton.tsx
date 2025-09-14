// Removed unused imports
import { useState, useEffect } from 'react'
import { Wallet, ChevronDown, Copy, ExternalLink, Power } from 'lucide-react'
import { useAccount, useDisconnect, useConnect } from 'wagmi'
// Removed SIWE integration
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants'

interface ConnectWalletButtonProps {
  className?: string
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export default function ConnectWalletButton({
  className = '',
  variant = 'primary',
  size = 'md',
  showText = true
}: ConnectWalletButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  
  const { address, isConnected, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const { connect, connectors } = useConnect()
  // ...existing code...
  // Removed unused chainId
  // Removed unused switchChain

  // Auto-sign after wallet connection
  useEffect(() => {
    const autoSign = async () => {
  if (isConnected && !isConnecting) {
        try {
          setIsConnecting(true)
          toast.success(SUCCESS_MESSAGES.SIGN_IN_SUCCESS)
        } catch (error) {
          console.error('Auto-sign failed:', error)
          toast.error('Sign-in required. Please try again.')
        } finally {
          setIsConnecting(false)
        }
      }
    }

    autoSign()
  }, [isConnected, isConnecting])

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      
      // If not connected, connect first
      if (!isConnected) {
        const injectedConnector = connectors.find(c => c.id === 'injected') || connectors[0]
        if (injectedConnector) {
          await connect({ connector: injectedConnector })
          // Auto-sign will be handled by useEffect above
        } else {
          throw new Error('No wallet connector available')
        }
      }
    } catch (error) {
      console.error('Connection failed:', error)
      toast.error(ERROR_MESSAGES.TRANSACTION_FAILED)
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      disconnect()
      setIsDropdownOpen(false)
      toast.success('Wallet disconnected')
    } catch (error) {
      console.error('Disconnect failed:', error)
      toast.error('Failed to disconnect')
    }
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast.success('Address copied to clipboard')
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-neon-magenta to-electric-lime text-jet-black hover:shadow-lg hover:shadow-neon-magenta/25'
      case 'secondary':
        return 'bg-gunmetal-gray/50 text-white hover:bg-gunmetal-gray/70 border border-neon-magenta/20 hover:border-neon-magenta/50'
      case 'outline':
        return 'border-2 border-neon-magenta text-neon-magenta hover:bg-neon-magenta hover:text-jet-black'
      default:
        return 'bg-gradient-to-r from-neon-magenta to-electric-lime text-jet-black hover:shadow-lg hover:shadow-neon-magenta/25'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm'
      case 'md':
        return 'px-4 py-2'
      case 'lg':
        return 'px-6 py-3 text-lg'
      default:
        return 'px-4 py-2'
    }
  }

  // If not connected, show connect button
  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className={`
          flex items-center gap-2 rounded-lg font-semibold transition-all duration-300 relative
          ${getVariantClasses()}
          ${getSizeClasses()}
          ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        {isConnecting ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        {showText && (
          <>
            <span className="hidden sm:inline">
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </span>
            <span className="sm:hidden">
              {isConnecting ? 'Connecting' : 'Connect'}
            </span>
          </>
        )}
      </button>
    )
  }

  // If connected and signed in, show wallet info with dropdown
  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`
          flex items-center gap-2 rounded-lg font-semibold transition-all duration-300
          ${getVariantClasses()}
          ${getSizeClasses()}
          ${className}
        `}
      >
        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        {showText && (
          <>
            <span className="hidden sm:inline">
              {formatAddress(address!)}
            </span>
            <span className="sm:hidden">Connected</span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 mt-2 w-64 bg-rich-black border border-gunmetal-gray/20 rounded-lg shadow-lg z-50"
          >
            <div className="p-4 border-b border-gunmetal-gray/20">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-400">Connected with {connector?.name}</p>
                  <p className="font-mono text-white">{formatAddress(address!)}</p>
                </div>
              </div>
            </div>
            
            <div className="p-2">
              <button
                onClick={copyAddress}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gunmetal-gray/30 rounded-md transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy Address
              </button>
              
              <button
                onClick={() => {
                  window.open(`https://etherscan.io/address/${address}`, '_blank')
                  setIsDropdownOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gunmetal-gray/30 rounded-md transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on Explorer
              </button>
              
              <div className="border-t border-gunmetal-gray/20 my-2"></div>
              
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
              >
                <Power className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
