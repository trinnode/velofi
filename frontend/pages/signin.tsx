import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Key, Shield, Loader2, Check, AlertCircle, Wallet } from 'lucide-react'
import { useSIWE } from '../hooks/useSIWE'
import { useAccount } from 'wagmi'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/router'
import ConnectWalletButton from '../components/ConnectWalletButton'

export default function SignInPage() {
  const [mounted, setMounted] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  
  const router = useRouter()
  const { returnUrl } = router.query
  const { address, isConnected, connector } = useAccount()
  const { signIn, signOut, isSignedIn, isLoading, error } = useSIWE()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect after successful authentication
  useEffect(() => {
    if (isSignedIn && returnUrl && typeof returnUrl === 'string') {
      toast.success('Successfully signed in!')
      router.push(returnUrl)
    }
  }, [isSignedIn, returnUrl, router])

  const handleSignIn = async () => {
    try {
      setIsConnecting(true)
      await signIn()
      if (!returnUrl) {
        toast.success('Successfully signed in!')
      }
      // If returnUrl exists, the redirect will happen in the useEffect above
    } catch (error) {
      console.error('Sign in failed:', error)
      toast.error('Sign in failed. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Successfully signed out!')
    } catch (error) {
      console.error('Sign out failed:', error)
      toast.error('Sign out failed. Please try again.')
    }
  }

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
              <Key className="w-12 h-12 text-neon-magenta" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-neon-magenta to-electric-lime bg-clip-text text-transparent">
            Sign In to VeloFi
          </h1>

          <p className="text-gray-300 mb-8 leading-relaxed">
            Secure authentication using Sign-In with Ethereum (SIWE) protocol. 
            Connect your wallet and verify your identity to access all VeloFi features.
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
                {isSignedIn ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              
              <p className="text-gray-400 text-sm">
                {isSignedIn 
                  ? 'Successfully authenticated with SIWE' 
                  : 'Not authenticated - Sign in required'
                }
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              {!isConnected ? (
                <div className="text-center">
                  <p className="text-gray-400 mb-4">Connect your wallet to continue</p>
                  <ConnectWalletButton className="w-full justify-center" size="lg" />
                </div>
              ) : !isSignedIn ? (
                <button
                  onClick={handleSignIn}
                  disabled={isLoading || isConnecting}
                  className="w-full px-6 py-3 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-lg font-semibold text-jet-black hover:shadow-lg hover:shadow-neon-magenta/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading || isConnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <Key className="w-5 h-5" />
                      Sign In with Ethereum
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                    <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-green-400 font-medium">Successfully Authenticated!</p>
                    <p className="text-gray-400 text-sm mt-1">You now have access to all VeloFi features</p>
                  </div>
                  
                  <button
                    onClick={handleSignOut}
                    className="w-full px-6 py-3 border-2 border-electric-lime text-electric-lime rounded-lg font-semibold hover:bg-electric-lime hover:text-jet-black transition-all duration-300"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Features Available After Sign In */}
          {!isSignedIn && (
            <div className="mt-8 pt-8 border-t border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">Access After Sign In</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  'Savings & Interest',
                  'Credit Scoring', 
                  'Token Swapping',
                  'DAO Voting',
                  'Lending & Borrowing',
                  'Liquidity Provision'
                ].map((feature, index) => (
                  <div key={feature} className="flex items-center gap-2 text-gray-300">
                    <div className="w-1.5 h-1.5 bg-electric-lime rounded-full" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}

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
