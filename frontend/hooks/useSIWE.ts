import { useState, useCallback, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'

interface SIWEState {
  isSignedIn: boolean
  isLoading: boolean
  error: string | null
  nonce: string | null
  signature: string | null
  message: string | null
}

export function useSIWE() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [state, setState] = useState<SIWEState>({
    isSignedIn: false,
    isLoading: false,
    error: null,
    nonce: null,
    signature: null,
    message: null
  })

  // Generate a cryptographically secure nonce
  const generateNonce = useCallback(() => {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }, [])

  // Check if user is already authenticated on mount
  useEffect(() => {
    if (!address) {
      setState(prev => ({ ...prev, isSignedIn: false }))
      return
    }

    const storedAuth = localStorage.getItem(`siwe-auth-${address}`)
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth)
        
        // Check if authentication hasn't expired
        if (Date.now() < authData.expiresAt) {
          setState(prev => ({
            ...prev,
            isSignedIn: true,
            signature: authData.signature,
            message: authData.message,
            nonce: authData.nonce
          }))
        } else {
          // Remove expired authentication
          localStorage.removeItem(`siwe-auth-${address}`)
        }
      } catch (error) {
        console.error('Error parsing stored auth:', error)
        localStorage.removeItem(`siwe-auth-${address}`)
      }
    }
  }, [address])

  // Create SIWE message
  const createSIWEMessage = useCallback((nonce: string) => {
    if (!address) {
      throw new Error('No wallet address available')
    }

    const siweMessage = new SiweMessage({
      domain: typeof window !== 'undefined' ? window.location.host : 'localhost:3000',
      address,
      statement: 'Sign in to VeloFi DeFi Protocol',
      uri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      version: '1',
      chainId: 50311, // Somnia testnet
      nonce,
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    })

    return siweMessage.prepareMessage()
  }, [address])

  // Sign in with Ethereum
  const signIn = useCallback(async () => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Generate nonce
      const nonce = generateNonce()
      
      // Create SIWE message
      const message = createSIWEMessage(nonce)
      
      // Sign the message
      const signature = await signMessageAsync({ message })
      
      // Verify the signature locally (in production, this should be done on backend)
      const siweMessage = new SiweMessage(message)
      await siweMessage.verify({ signature, nonce })
      
      // Store authentication data
      const authData = {
        address,
        signature,
        message,
        nonce,
        signedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      }
      
      localStorage.setItem(`siwe-auth-${address}`, JSON.stringify(authData))
      
      setState(prev => ({
        ...prev,
        isSignedIn: true,
        isLoading: false,
        signature,
        message,
        nonce,
        error: null
      }))

      return { signature, message, nonce }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
      throw error
    }
  }, [isConnected, address, generateNonce, createSIWEMessage, signMessageAsync])

  // Sign out
  const signOut = useCallback(async () => {
    if (address) {
      localStorage.removeItem(`siwe-auth-${address}`)
    }
    
    setState({
      isSignedIn: false,
      isLoading: false,
      error: null,
      nonce: null,
      signature: null,
      message: null
    })
  }, [address])

  // Verify current authentication
  const verifyAuthentication = useCallback(async () => {
    if (!state.isSignedIn || !state.message || !state.signature || !state.nonce) {
      return false
    }

    try {
      const siweMessage = new SiweMessage(state.message)
      await siweMessage.verify({ 
        signature: state.signature, 
        nonce: state.nonce 
      })
      return true
    } catch (error) {
      console.error('Authentication verification failed:', error)
      await signOut()
      return false
    }
  }, [state.isSignedIn, state.message, state.signature, state.nonce, signOut])

  // Get authentication status
  const getAuthStatus = useCallback(() => {
    if (!address) return 'disconnected'
    if (state.isLoading) return 'loading'
    if (state.isSignedIn) return 'authenticated'
    return 'unauthenticated'
  }, [address, state.isLoading, state.isSignedIn])

  // Get user session data
  const getSession = useCallback(() => {
    if (!state.isSignedIn || !address) return null

    return {
      address,
      signature: state.signature,
      message: state.message,
      nonce: state.nonce,
      issuedAt: state.message ? new SiweMessage(state.message).issuedAt : null,
      expirationTime: state.message ? new SiweMessage(state.message).expirationTime : null,
    }
  }, [address, state.isSignedIn, state.signature, state.message, state.nonce])

  return {
    // State
    isSignedIn: state.isSignedIn,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    signIn,
    signOut,
    verifyAuthentication,
    
    // Utilities
    getAuthStatus,
    getSession,
    
    // Data
    address,
    signature: state.signature,
    message: state.message,
    nonce: state.nonce,
  }
}
