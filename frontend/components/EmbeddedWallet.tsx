import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, QrCode, Copy, ExternalLink, Shield, Zap, Check } from 'lucide-react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { toast } from 'react-hot-toast'

interface EmbeddedWalletProps {
  onConnect?: () => void
  onDisconnect?: () => void
  className?: string
}

export default function EmbeddedWallet({ 
  onConnect, 
  onDisconnect, 
  className = '' 
}: EmbeddedWalletProps) {
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { address, isConnected, connector } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleConnect = async (connector: any) => {
    try {
      await connect({ connector })
      toast.success('Wallet connected successfully!')
      onConnect?.()
    } catch (error) {
      console.error('Connection failed:', error)
      toast.error('Failed to connect wallet')
    }
  }

  const handleDisconnect = async () => {
    try {
      disconnect()
      toast.success('Wallet disconnected')
      onDisconnect?.()
    } catch (error) {
      console.error('Disconnect failed:', error)
      toast.error('Failed to disconnect wallet')
    }
  }

  const copyAddress = async () => {
    if (!address) return
    
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      toast.success('Address copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy address')
    }
  }

  if (!mounted) return null

  return (
    <div className={`bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-full flex items-center justify-center">
            <Wallet className="w-5 h-5 text-jet-black" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Wallet</h3>
            <p className="text-sm text-gray-400">
              {isConnected ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>
        
        {isConnected && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-500 font-medium">Active</span>
          </div>
        )}
      </div>

      {/* Connected State */}
      {isConnected && address ? (
        <div className="space-y-4">
          {/* Account Info */}
          <div className="bg-jet-black/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-300">Account Address</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyAddress}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Copy address"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => window.open(`https://explorer.somnia.network/address/${address}`, '_blank')}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="View on explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="font-mono text-white bg-gray-800 p-3 rounded border">
              {address.slice(0, 20)}...{address.slice(-20)}
            </div>
          </div>

          {/* Connection Info */}
          <div className="bg-jet-black/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Connector</div>
                <div className="text-white font-medium capitalize">
                  {connector?.name || 'Unknown'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Network</div>
                <div className="text-electric-lime font-medium">Somnia Testnet</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-electric-lime text-electric-lime rounded-lg hover:bg-electric-lime hover:text-jet-black transition-all duration-300"
            >
              <QrCode className="w-4 h-4" />
              QR Code
            </button>
            
            <button
              onClick={handleDisconnect}
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-300"
            >
              <Wallet className="w-4 h-4" />
              Disconnect
            </button>
          </div>

          {/* QR Code Display */}
          {showQR && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-lg p-4 text-center"
            >
              <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                <QrCode className="w-16 h-16 text-gray-400" />
                <span className="ml-2 text-gray-500 text-sm">QR Code would be here</span>
              </div>
              <p className="text-gray-600 text-sm mt-3">
                Scan to connect on mobile
              </p>
            </motion.div>
          )}
        </div>
      ) : (
        /* Not Connected State */
        <div className="space-y-6">
          <div className="text-center py-6">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <h4 className="text-lg font-semibold text-white mb-2">Connect Your Wallet</h4>
            <p className="text-gray-400 text-sm">
              Choose a wallet to connect to VeloFi and start using DeFi services
            </p>
          </div>

          {/* Connector Options */}
          <div className="space-y-3">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className="w-full flex items-center gap-4 p-4 bg-jet-black/50 border border-gray-700 rounded-lg hover:border-neon-magenta/50 hover:bg-jet-black/70 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-jet-black" />
                </div>
                
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">{connector.name}</div>
                  <div className="text-gray-400 text-sm">
                    {connector.name.toLowerCase().includes('metamask') && 'Browser extension wallet'}
                    {connector.name.toLowerCase().includes('walletconnect') && 'Scan with mobile wallet'}
                    {connector.name.toLowerCase().includes('coinbase') && 'Coinbase Wallet'}
                    {!connector.name.toLowerCase().includes('metamask') && 
                     !connector.name.toLowerCase().includes('walletconnect') && 
                     !connector.name.toLowerCase().includes('coinbase') && 'Web3 wallet'}
                  </div>
                </div>
                
                <ExternalLink className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>

          {/* Security Notice */}
          <div className="bg-electric-lime/10 border border-electric-lime/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-electric-lime flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-medium text-white mb-1">Secure Connection</h5>
                <p className="text-sm text-gray-300 leading-relaxed">
                  VeloFi uses industry-standard security practices. Your private keys never leave your wallet.
                </p>
              </div>
            </div>
          </div>

          {/* Network Info */}
          <div className="bg-neon-magenta/10 border border-neon-magenta/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-neon-magenta flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-medium text-white mb-1">Somnia Network</h5>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Make sure you're connected to Somnia Testnet (Chain ID: 50311) for optimal performance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
