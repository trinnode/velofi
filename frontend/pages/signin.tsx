import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Check, AlertCircle, Shield } from 'lucide-react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/router'

export default function SignInPage() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { returnUrl } = router.query
  const { address, isConnected, connector } = useAccount()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect after successful wallet connection
  useEffect(() => {
    if (isConnected && address) {
      toast.success('Successfully connected! Welcome to VeloFi!')
      if (returnUrl && typeof returnUrl === 'string') {
        router.push(returnUrl)
      } else {
        router.push('/dashboard')
      }
    }
  }, [isConnected, address, returnUrl, router])

  // Removed handleSignOut (legacy SIWE)

  if (!mounted) return null

  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <div className="max-w-md w-full mx-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-8 text-center"
        >
          {/* Header */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-neon-magenta/20 rounded-full">
              <Wallet className="w-12 h-12 text-neon-magenta" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-neon-magenta to-electric-lime bg-clip-text text-transparent">
            Connect to VeloFi
          </h1>

          <p className="text-gray-300 mb-8 leading-relaxed">
            Connect your wallet to access the next-generation DeFi platform.
            Experience ultra-fast transactions on Somnia Network.
          </p>

          {/* Connection Status */}
          <div className="space-y-6">
            {/* Wallet Connection Status */}
            <div className="bg-jet-black/50 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-electric-lime" />
                  <span className="font-medium text-white">Wallet Connection</span>
                </div>
                {isConnected ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              
              {isConnected ? (
                <div className="text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Address:</span>
                    <span className="text-white font-mono">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Connector:</span>
                    <span className="text-electric-lime capitalize">{connector?.name || 'Unknown'}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No wallet connected</p>
              )}
            </div>

            {/* Authentication Status */}
            <div className="bg-jet-black/50 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-neon-magenta" />
                  <span className="font-medium text-white">Authentication</span>
                </div>
                {/* Authentication status logic removed. Always show unauthenticated icon. */}
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              </div>
              
              <p className="text-gray-400 text-sm">
                {'Not authenticated - Sign in required'}
              </p>
            </div>

            {/* Error Display */}
            {/* Error display removed. */}

            {/* Action Buttons */}
            <div className="space-y-4">
              {!isConnected ? (
                <div className="text-center">
                  <p className="text-gray-400 mb-4">Connect your wallet to continue</p>
                  <div className="flex justify-center">
                    <ConnectButton />
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-green-500 font-medium">Wallet Connected!</span>
                  </div>
                  <p className="text-gray-400">Redirecting to dashboard...</p>
                </div>
              )}
            </div>
          </div>

          {/* Features Available After Connect */}
          <div className="mt-8 pt-8 border-t border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Access After Connect</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                'Savings & Interest',
                'Credit Scoring', 
                'Token Swapping',
                'DAO Voting',
                'Lending & Borrowing',
                'Liquidity Provision'
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-gray-300">
                  <div className="w-1.5 h-1.5 bg-electric-lime rounded-full" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-8 pt-8 border-t border-gray-700">
            <div className="flex items-start gap-3 text-left">
              <Shield className="w-5 h-5 text-neon-magenta flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-white mb-1">Secure & Private</h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                  SIWE authentication ensures your private keys never leave your wallet. 
                  We only verify ownership of your Ethereum address for secure access.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
