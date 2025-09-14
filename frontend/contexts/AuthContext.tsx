import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { toast } from 'react-hot-toast'

interface User {
  address: string
  chainId: number
  connector?: string
  isConnected: boolean
  loginTime: Date
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: () => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { address, isConnected, chainId, connector } = useAccount()
  const { disconnect } = useDisconnect()

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = () => {
      const savedUser = localStorage.getItem('velofi_user')
      if (savedUser && isConnected && address) {
        try {
          const userData = JSON.parse(savedUser)
          if (userData.address === address) {
            setUser({
              ...userData,
              loginTime: new Date(userData.loginTime),
            })
          } else {
            localStorage.removeItem('velofi_user')
          }
        } catch (error) {
          console.error('Error parsing saved user data:', error)
          localStorage.removeItem('velofi_user')
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [address, isConnected])

  // Handle wallet connection/disconnection
  useEffect(() => {
    if (isConnected && address && chainId) {
      const userData: User = {
        address,
        chainId,
        connector: connector?.name,
        isConnected: true,
        loginTime: new Date(),
      }
      
      setUser(userData)
      localStorage.setItem('velofi_user', JSON.stringify(userData))
      
      // Only show success toast if this is a new connection
      if (!user || user.address !== address) {
        toast.success(`Welcome to VeloFi! Connected to ${connector?.name || 'wallet'}`)
      }
    } else if (!isConnected) {
      setUser(null)
      localStorage.removeItem('velofi_user')
    }
  }, [isConnected, address, chainId, connector])

  const login = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }
    
    if (address && chainId) {
      const userData: User = {
        address,
        chainId,
        connector: connector?.name,
        isConnected: true,
        loginTime: new Date(),
      }
      
      setUser(userData)
      localStorage.setItem('velofi_user', JSON.stringify(userData))
      toast.success('Successfully logged in!')
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('velofi_user')
    disconnect()
    toast.success('Successfully logged out!')
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && isConnected,
    login,
    logout,
    isLoading,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}