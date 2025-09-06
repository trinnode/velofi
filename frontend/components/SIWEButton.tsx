import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Key, Shield, Loader2, Check, AlertCircle } from 'lucide-react'
import { useAccount, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'
import { toast } from 'react-hot-toast'

interface SIWEButtonProps {
  onSignIn?: (address: string, message: string, signature: string) => void
  onSignOut?: () => void
  className?: string
}

export default function SIWEButton({ 
  onSignIn, 
  onSignOut, 
  className = '' 
}: SIWEButtonProps) {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [nonce, setNonce] = useState('')
  const [mounted, setMounted] = useState(false)

  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  useEffect(() => {
    setMounted(true)
    // Check if user was previously signed in
    const storedAuth = localStorage.getItem(`siwe-${address}`)
    if (storedAuth) {
      const { expiry } = JSON.parse(storedAuth)
      if (Date.now() < expiry) {
        setIsSignedIn(true)
      } else {
        localStorage.removeItem(`siwe-${address}`)
      }
    }
  }, [address])

  // Generate a random nonce
  const generateNonce = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const createSIWEMessage = () => {
    if (!address) throw new Error('No wallet address')
    
    const message = new SiweMessage({
      domain: window.location.host,
      address,
      statement: 'Sign in to VeloFi with your Ethereum account',
      uri: window.location.origin,
      version: '1',
      chainId: 50311, // Somnia testnet chain ID
      nonce: nonce || generateNonce()
    })

    return message.prepareMessage()
  }

  const handleSignIn = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      setIsLoading(true)
      
      // Generate nonce if not exists
      if (!nonce) {
        const newNonce = generateNonce()
        setNonce(newNonce)
      }

      // Create SIWE message
      const message = createSIWEMessage()
      
      // Sign the message
      const signature = await signMessageAsync({ message })
      
      // Verify the signature (in a real app, this would be done on the backend)
      const siweMessage = new SiweMessage(message)
      
      try {
        // In production, send to backend for verification
        // For demo, we'll simulate verification
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Store authentication state
        const authData = {
          address,
          signature,
          message,
          signedAt: Date.now(),
          expiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        }
        
        localStorage.setItem(`siwe-${address}`, JSON.stringify(authData))
        setIsSignedIn(true)
        
        toast.success('Successfully signed in with Ethereum!')
        onSignIn?.(address, message, signature)
        
      } catch (verifyError) {
        console.error('Signature verification failed:', verifyError)
        toast.error('Signature verification failed')
      }
      
    } catch (error) {
      console.error('Sign-in failed:', error)
      if (error instanceof Error) {
        toast.error(`Sign-in failed: ${error.message}`)
      } else {
        toast.error('Sign-in failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = () => {
    if (address) {
      localStorage.removeItem(`siwe-${address}`)
    }
    setIsSignedIn(false)
    setNonce('')
    toast.success('Successfully signed out')
    onSignOut?.()
  }

  if (!mounted) return null

  if (!isConnected) {
    return (
      <div className={`bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-gray-700/50 p-6 text-center ${className}`}>
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
        <h3 className="text-lg font-bold text-white mb-2">Connect Wallet First</h3>
        <p className="text-gray-400 text-sm">
          You need to connect your wallet before you can sign in with Ethereum
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-full flex items-center justify-center">
          {isSignedIn ? (
            <Check className="w-5 h-5 text-jet-black" />
          ) : (
            <Key className="w-5 h-5 text-jet-black" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">
            {isSignedIn ? 'Authenticated' : 'Sign In with Ethereum'}
          </h3>
          <p className="text-sm text-gray-400">
            {isSignedIn ? 'You are securely authenticated' : 'Secure authentication using SIWE'}
          </p>
        </div>
      </div>

      {/* Status */}
      {isSignedIn ? (
        <div className="space-y-4">
          {/* Success State */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-green-400 font-medium">Successfully Authenticated</div>
                <div className="text-green-300 text-sm">
                  Address: {address?.slice(0, 8)}...{address?.slice(-6)}
                </div>
              </div>
            </div>
          </div>

          {/* Features Available */}
          <div className="bg-jet-black/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Available Features</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                'Savings & Deposits',
                'Credit Scoring',
                'Token Trading',
                'Governance Voting',
                'Loan Requests',
                'Liquidity Mining'
              ].map((feature, index) => (
                <div key={feature} className="flex items-center gap-2 text-gray-300">
                  <div className="w-1.5 h-1.5 bg-electric-lime rounded-full" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full px-6 py-3 border-2 border-red-500/50 text-red-400 rounded-lg font-medium hover:border-red-500 hover:bg-red-500/10 transition-all duration-300"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Information */}
          <div className="bg-electric-lime/10 border border-electric-lime/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-electric-lime flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-white mb-1">What is SIWE?</h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Sign-In with Ethereum (SIWE) is a secure authentication method that proves 
                  ownership of your wallet without exposing your private keys. Your signature 
                  is your password.
                </p>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-jet-black/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2">Connected Account</div>
            <div className="text-white font-mono bg-gray-800 p-2 rounded border text-sm">
              {address}
            </div>
          </div>

          {/* Sign In Button */}
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-lg font-semibold text-jet-black hover:shadow-lg hover:shadow-neon-magenta/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
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

          {/* Benefits */}
          <div className="text-xs text-gray-500 space-y-1">
            <div>✓ No passwords or usernames required</div>
            <div>✓ Cryptographically secure authentication</div>
            <div>✓ Your private keys never leave your wallet</div>
            <div>✓ Standard web3 authentication protocol</div>
          </div>
        </div>
      )}

      {/* Technical Details */}
      {isSignedIn && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6 pt-6 border-t border-gray-700"
        >
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Authentication Details
            </summary>
            <div className="mt-3 text-xs text-gray-500 space-y-2">
              <div>Chain ID: 50311 (Somnia Testnet)</div>
              <div>Protocol: SIWE v1</div>
              <div>Validity: 24 hours</div>
              <div>Domain: {window.location.host}</div>
            </div>
          </details>
        </motion.div>
      )}
    </div>
  )
}
