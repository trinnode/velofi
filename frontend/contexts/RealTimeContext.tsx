import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'

interface UserActivity {
  id: string
  type: 'deposit' | 'withdrawal' | 'swap' | 'loan' | 'vote' | 'delegate'
  amount?: number
  token?: string
  fromAmount?: number
  fromToken?: string
  toAmount?: number
  toToken?: string
  proposal?: string
  vote?: 'for' | 'against'
  timestamp: Date
}

interface RealTimeNotification {
  id: string
  type: 'price_alert' | 'governance' | 'transaction' | 'milestone'
  message: string
  timestamp: Date
}

interface RealTimeData {
  prices: Record<string, number>
  balances: Record<string, number>
  totalValueLocked: number
  savingsAPY: number
  governanceProposals: number
  userActivity: UserActivity[]
  notifications: RealTimeNotification[]
}

interface RealTimeContextType {
  data: RealTimeData
  isConnected: boolean
  subscribe: (event: string, callback: (data: Record<string, unknown>) => void) => void
  unsubscribe: (event: string) => void
  updateUserActivity: (activity: Omit<UserActivity, 'id' | 'timestamp'>) => void
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined)

export const RealTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<RealTimeData>({
    prices: {
      SOM: 0.025,
      ETH: 3500,
      USDC: 1.00,
      WBTC: 97000,
      VLFI: 1.25,
      BTC: 97000,
    },
    balances: {},
    totalValueLocked: 125000000,
    savingsAPY: 8.5,
    governanceProposals: 3,
    userActivity: [],
    notifications: [],
  })
  
  const [isConnected, setIsConnected] = useState(false)

  // Simple notification system - memoized to avoid useEffect dependency changes
  const notify = useMemo(() => ({
    success: (title: string, message: string) => console.log(`Success: ${title} - ${message}`),
    info: (title: string, message: string) => console.log(`Info: ${title} - ${message}`),
    warning: (title: string, message: string) => console.log(`Warning: ${title} - ${message}`),
    deposit: (amount: string, token: string) => console.log(`Deposit: ${amount} ${token}`),
    withdrawal: (amount: string, token: string) => console.log(`Withdrawal: ${amount} ${token}`),
    swap: (fromAmount: string, fromToken: string, toAmount: string, toToken: string) => 
      console.log(`Swap: ${fromAmount} ${fromToken} → ${toAmount} ${toToken}`),
    loan: (amount: string, token: string) => console.log(`Loan: ${amount} ${token}`),
    vote: (proposal: string, vote: string) => console.log(`Vote: ${proposal} - ${vote}`)
  }), [])

  // Simulate WebSocket connection
  useEffect(() => {
    setIsConnected(true)
    
    // Simulate real-time price updates
    const priceInterval = setInterval(() => {
      setData(prev => ({
        ...prev,
        prices: {
          ...prev.prices,
          VLFI: (prev.prices.VLFI || 1.25) * (1 + (Math.random() - 0.5) * 0.02), // ±1% volatility
          ETH: (prev.prices.ETH || 3500) * (1 + (Math.random() - 0.5) * 0.01),   // ±0.5% volatility
          BTC: (prev.prices.BTC || 97000) * (1 + (Math.random() - 0.5) * 0.008)   // ±0.4% volatility
        }
      }))
    }, 5000) // Update every 5 seconds

    // Simulate APY fluctuations
    const apyInterval = setInterval(() => {
      setData(prev => ({
        ...prev,
        savingsAPY: Math.max(8, Math.min(18, prev.savingsAPY + (Math.random() - 0.5) * 0.5))
      }))
    }, 30000) // Update every 30 seconds

    // Simulate TVL changes
    const tvlInterval = setInterval(() => {
      setData(prev => ({
        ...prev,
        totalValueLocked: prev.totalValueLocked * (1 + (Math.random() - 0.5) * 0.005)
      }))
    }, 15000) // Update every 15 seconds

    // Simulate new governance proposals
    const governanceInterval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance every minute
        setData(prev => ({
          ...prev,
          governanceProposals: prev.governanceProposals + 1,
          notifications: [
            ...prev.notifications,
            {
              id: Date.now().toString(),
              type: 'governance',
              message: 'New governance proposal created',
              timestamp: new Date()
            }
          ]
        }))
        
        notify.info(
          'New Governance Proposal',
          'New proposal: Increase staking rewards by 2%'
        )
      }
    }, 60000) // Check every minute

    // Simulate milestone notifications
    const milestoneInterval = setInterval(() => {
      if (Math.random() < 0.05) { // 5% chance every 2 minutes
        const milestones = [
          'Total Value Locked reached $15M!',
          'Community reached 5,000 members!',
          'New all-time high for VLFI token!',
          '1,000 successful loans processed!'
        ]
        const milestone = milestones[Math.floor(Math.random() * milestones.length)]
        
        if (milestone) {
          notify.success('Milestone Achieved! 🎉', milestone)
        }
      }
    }, 120000) // Check every 2 minutes

    return () => {
      clearInterval(priceInterval)
      clearInterval(apyInterval)
      clearInterval(tvlInterval)
      clearInterval(governanceInterval)
      clearInterval(milestoneInterval)
      setIsConnected(false)
    }
  }, [notify])

  // Price alert system
  useEffect(() => {
    const checkPriceAlerts = () => {
      // Example: Alert when VLFI price changes significantly
      const vlfiPrice = data.prices.VLFI
      if (vlfiPrice && vlfiPrice > 1.5) {
        notify.success(
          'Price Alert! 📈',
          `VLFI reached $${vlfiPrice.toFixed(4)} - up significantly!`
        )
      } else if (vlfiPrice && vlfiPrice < 0.8) {
        notify.warning(
          'Price Alert! 📉',
          `VLFI dropped to $${vlfiPrice.toFixed(4)} - consider buying the dip!`
        )
      }
    }

    const alertInterval = setInterval(checkPriceAlerts, 10000)
    return () => clearInterval(alertInterval)
  }, [data.prices.VLFI, notify])

  const subscribe = (event: string, callback: (data: Record<string, unknown>) => void) => {
    // In a real implementation, this would manage WebSocket subscriptions
    console.log(`Subscribed to ${event}`, callback)
  }

  const unsubscribe = (event: string) => {
    // In a real implementation, this would remove WebSocket subscriptions
    console.log(`Unsubscribed from ${event}`)
  }

  const updateUserActivity = (activity: Omit<UserActivity, 'id' | 'timestamp'>) => {
    const newActivity: UserActivity = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...activity
    }
    
    setData(prev => ({
      ...prev,
      userActivity: [newActivity, ...prev.userActivity.slice(0, 49)] // Keep last 50 activities
    }))

    // Trigger appropriate notifications based on activity
    switch (activity.type) {
      case 'deposit':
        if (activity.amount && activity.token) {
          notify.deposit(activity.amount.toFixed(2), activity.token)
        }
        break
      case 'withdrawal':
        if (activity.amount && activity.token) {
          notify.withdrawal(activity.amount.toFixed(2), activity.token)
        }
        break
      case 'swap':
        if (activity.fromAmount && activity.fromToken && activity.toAmount && activity.toToken) {
          notify.swap(
            activity.fromAmount.toFixed(2),
            activity.fromToken,
            activity.toAmount.toFixed(2),
            activity.toToken
          )
        }
        break
      case 'loan':
        if (activity.amount && activity.token) {
          notify.loan(activity.amount.toFixed(2), activity.token)
        }
        break
      case 'vote':
        if (activity.proposal && activity.vote) {
          notify.vote(activity.proposal, activity.vote)
        }
        break
    }
  }

  const value = {
    data,
    isConnected,
    subscribe,
    unsubscribe,
    updateUserActivity
  }

  return (
    <RealTimeContext.Provider value={value}>
      {children}
    </RealTimeContext.Provider>
  )
}

export function useRealTime() {
  const context = useContext(RealTimeContext)
  if (context === undefined) {
    throw new Error('useRealTime must be used within a RealTimeProvider')
  }
  return context
}

// Specialized hooks for different data types
export function usePrices() {
  const { data } = useRealTime()
  return data.prices
}

export function useUserActivity() {
  const { data, updateUserActivity } = useRealTime()
  return { activities: data.userActivity, addActivity: updateUserActivity }
}

export function useSystemStats() {
  const { data } = useRealTime()
  return {
    totalValueLocked: data.totalValueLocked,
    savingsAPY: data.savingsAPY,
    governanceProposals: data.governanceProposals
  }
}