import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet, ExternalLink, Shield, AlertCircle } from 'lucide-react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { toast } from 'react-hot-toast'

interface WalletConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect?: () => void
}

export default function WalletConnectModal({ 
  isOpen, 
  onClose, 
  onConnect 
}: WalletConnectModalProps) {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isConnected && address) {
      toast.success('Wallet connected successfully!')
      onConnect?.()
      onClose()
    }
  }, [isConnected, address, onConnect, onClose])

  const handleConnect = async (connector: any) => {
    try {
      setSelectedWallet(connector.id)
      await connect({ connector })
    } catch (error: any) {
      console.error('Connection failed:', error)
      if (error.message?.includes('User rejected')) {
        toast.error('Connection cancelled by user')
      } else {
        toast.error('Failed to connect wallet')
      }
      setSelectedWallet(null)
    }
  }

  const handleDisconnect = async () => {
    try {
      disconnect()
      toast.success('Wallet disconnected')
      setSelectedWallet(null)
    } catch (error) {
      toast.error('Failed to disconnect wallet')
    }
  }

  if (!mounted) return null

  const getWalletIcon = (connectorName: string) => {
    const name = connectorName.toLowerCase()
    if (name.includes('metamask')) return '🦊'
    if (name.includes('walletconnect')) return '🔗'
    if (name.includes('coinbase')) return '🔵'
    if (name.includes('injected')) return '💼'
    return '🔒'
  }

  const getWalletDescription = (connectorName: string) => {
    const name = connectorName.toLowerCase()
    if (name.includes('metamask')) return 'Connect using MetaMask browser extension'
    if (name.includes('walletconnect')) return 'Scan with WalletConnect to connect'
    if (name.includes('coinbase')) return 'Connect with Coinbase Wallet'
    if (name.includes('injected')) return 'Connect with your browser wallet'
    return 'Connect with this wallet provider'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-full flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-jet-black" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Choose your preferred wallet provider
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Connected State */}
              {isConnected && address ? (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-green-500" />
                      <span className="text-green-500 font-medium">Connected</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">
                      Your wallet is connected to VeloFi
                    </p>
                    <div className="font-mono text-sm bg-jet-black/50 p-3 rounded border">
                      {address.slice(0, 10)}...{address.slice(-10)}
                    </div>
                  </div>

                  <button
                    onClick={handleDisconnect}
                    className="w-full py-3 bg-red-500/20 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-300"
                  >
                    Disconnect Wallet
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Info Banner */}
                  <div className="bg-electric-lime/10 border border-electric-lime/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-electric-lime mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-electric-lime font-medium text-sm mb-1">
                          Secure Connection
                        </p>
                        <p className="text-gray-300 text-xs">
                          VeloFi uses industry-standard security protocols to protect your wallet connection.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Wallet Options */}
                  <div className="space-y-3">
                    <h4 className="text-white font-medium text-sm mb-3">Available Wallets</h4>
                    
                    {connectors.map((connector) => {
                      const isLoading = isPending && selectedWallet === connector.id
                      
                      return (
                        <motion.button
                          key={connector.id}
                          onClick={() => handleConnect(connector)}
                          disabled={isPending}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full p-4 bg-jet-black/50 border border-gunmetal-gray hover:border-neon-magenta/50 rounded-lg transition-all duration-300 text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-2xl">
                              {getWalletIcon(connector.name)}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h5 className="text-white font-medium group-hover:text-neon-magenta transition-colors">
                                  {connector.name}
                                </h5>
                                {isLoading && (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-neon-magenta border-t-transparent" />
                                )}
                              </div>
                              <p className="text-xs text-gray-400">
                                {getWalletDescription(connector.name)}
                              </p>
                            </div>
                            
                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-neon-magenta transition-colors" />
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-red-500 font-medium text-sm mb-1">
                            Connection Failed
                          </p>
                          <p className="text-gray-300 text-xs">
                            {error.message || 'Failed to connect wallet. Please try again.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Help Text */}
                  <div className="text-center pt-4 border-t border-gunmetal-gray/50">
                    <p className="text-xs text-gray-400 mb-2">
                      Don't have a wallet?
                    </p>
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-electric-lime hover:text-electric-lime/80 text-xs underline transition-colors"
                    >
                      Get MetaMask →
                    </a>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
