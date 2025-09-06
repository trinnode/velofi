import { useAccount } from 'wagmi'
import { useContract } from './useContract'
import { useState, useEffect, useCallback } from 'react'
import { formatEther } from 'viem'

interface SavingsData {
  userBalance: {
    principal: bigint
    accruedInterest: bigint
    totalBalance: bigint
    lastUpdate: number
  } | null
  totalDeposits: string
  totalDepositors: number
  accumulatedInterest: string
  currentAPY: number
}

interface CreditData {
  userScore: number
  paymentHistory: number
  creditUtilization: number
  accountAge: number
  protocolActivity: number
  recentActivity: Array<{
    action: string
    points: number
    date: string
  }>
}

interface DexData {
  volume24h: string
  totalLiquidity: string
  vlfiPrice: string
  activePairs: number
  recentTrades: Array<{
    type: 'buy' | 'sell'
    fromAmount: string
    fromToken: string
    toAmount: string
    toToken: string
    value: string
    time: string
  }>
}

interface GovernanceData {
  totalProposals: number
  activeVoters: number
  totalVotingPower: string
  participationRate: number
  userVotingPower: number
  proposals: Array<{
    id: number
    title: string
    description: string
    proposer: string
    forVotes: number
    againstVotes: number
    startTime: number
    endTime: number
    executed: boolean
    hasUserVoted: boolean
    userVote?: boolean
  }>
}

export function useRealTimeData() {
  const { address, isConnected } = useAccount()
  const { savingsContract, creditScoreContract, exchangeContract, governanceContract } = useContract()

  // State for different data types
  const [savingsData, setSavingsData] = useState<SavingsData>({
    userBalance: null,
    totalDeposits: '0',
    totalDepositors: 0,
    accumulatedInterest: '0',
    currentAPY: 5.0
  })

  const [creditData, setCreditData] = useState<CreditData>({
    userScore: 0,
    paymentHistory: 0,
    creditUtilization: 0,
    accountAge: 0,
    protocolActivity: 0,
    recentActivity: []
  })

  const [dexData, setDexData] = useState<DexData>({
    volume24h: '0',
    totalLiquidity: '0',
    vlfiPrice: '1.25',
    activePairs: 3,
    recentTrades: []
  })

  const [governanceData, setGovernanceData] = useState<GovernanceData>({
    totalProposals: 0,
    activeVoters: 0,
    totalVotingPower: '0',
    participationRate: 0,
    userVotingPower: 0,
    proposals: []
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dynamic dashboard stats
  const [totalValueLocked, setTotalValueLocked] = useState(28467095)
  const [activeUsers, setActiveUsers] = useState(12483)
  const [totalTransactions, setTotalTransactions] = useState(687542)

  // Fetch savings data
  const fetchSavingsData = useCallback(async () => {
    if (!savingsContract) return

    try {
      // Mock data for demo purposes
      // In production, these would be actual contract calls
      const mockSavingsData: SavingsData = {
        userBalance: isConnected && address ? {
          principal: BigInt('1000000000000000000'), // 1 VLFI
          accruedInterest: BigInt('50000000000000000'), // 0.05 VLFI
          totalBalance: BigInt('1050000000000000000'), // 1.05 VLFI
          lastUpdate: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        } : null,
        totalDeposits: '12,450.75',
        totalDepositors: 342,
        accumulatedInterest: '1,234.56',
        currentAPY: 5.0
      }

      setSavingsData(mockSavingsData)
    } catch (error) {
      console.error('Error fetching savings data:', error)
      setError('Failed to fetch savings data')
    }
  }, [savingsContract, isConnected, address])

  // Fetch credit data
  const fetchCreditData = useCallback(async () => {
    if (!creditScoreContract) return

    try {
      const mockCreditData: CreditData = {
        userScore: isConnected ? 720 : 0,
        paymentHistory: isConnected ? 85 : 0,
        creditUtilization: isConnected ? 65 : 0,
        accountAge: isConnected ? 75 : 0,
        protocolActivity: isConnected ? 90 : 0,
        recentActivity: isConnected ? [
          { action: 'Loan repayment', points: 50, date: '2 days ago' },
          { action: 'Savings deposit', points: 25, date: '1 week ago' },
          { action: 'DEX trade', points: 10, date: '2 weeks ago' }
        ] : []
      }

      setCreditData(mockCreditData)
    } catch (error) {
      console.error('Error fetching credit data:', error)
      setError('Failed to fetch credit data')
    }
  }, [creditScoreContract, isConnected])

  // Fetch DEX data
  const fetchDexData = useCallback(async () => {
    try {
      const mockDexData: DexData = {
        volume24h: '89,234.56',
        totalLiquidity: '1,245,678.90',
        vlfiPrice: '1.25',
        activePairs: 3,
        recentTrades: [
          {
            type: 'buy',
            fromAmount: '100',
            fromToken: 'VLFI',
            toAmount: '0.05',
            toToken: 'ETH',
            value: '125.50',
            time: '2 min ago'
          },
          {
            type: 'sell',
            fromAmount: '0.1',
            fromToken: 'ETH',
            toAmount: '195',
            toToken: 'VLFI',
            value: '242.75',
            time: '5 min ago'
          },
          {
            type: 'buy',
            fromAmount: '50',
            fromToken: 'VLFI',
            toAmount: '0.025',
            toToken: 'ETH',
            value: '62.25',
            time: '8 min ago'
          }
        ]
      }

      setDexData(mockDexData)
    } catch (error) {
      console.error('Error fetching DEX data:', error)
      setError('Failed to fetch DEX data')
    }
  }, [exchangeContract])

  // Fetch governance data
  const fetchGovernanceData = useCallback(async () => {
    try {
      const mockGovernanceData: GovernanceData = {
        totalProposals: 8,
        activeVoters: 156,
        totalVotingPower: '45,678.90',
        participationRate: 67.5,
        userVotingPower: isConnected ? 1250 : 0,
        proposals: [
          {
            id: 1,
            title: 'Increase Savings APY to 6%',
            description: 'Proposal to increase the savings account annual percentage yield from 5% to 6% to remain competitive with other DeFi protocols and attract more liquidity.',
            proposer: '0x742d35Cc6634C0532925a3b8D404c4bD5b5DD227',
            forVotes: 12450,
            againstVotes: 3200,
            startTime: Math.floor(Date.now() / 1000) - (5 * 24 * 60 * 60), // 5 days ago
            endTime: Math.floor(Date.now() / 1000) + (2 * 24 * 60 * 60), // 2 days from now
            executed: false,
            hasUserVoted: false
          },
          {
            id: 2,
            title: 'Add USDC Trading Pair',
            description: 'Add USDC as a supported trading pair on the DEX to provide more stable trading options for users.',
            proposer: '0x1234567890123456789012345678901234567890',
            forVotes: 8900,
            againstVotes: 1200,
            startTime: Math.floor(Date.now() / 1000) - (3 * 24 * 60 * 60), // 3 days ago
            endTime: Math.floor(Date.now() / 1000) + (4 * 24 * 60 * 60), // 4 days from now
            executed: false,
            hasUserVoted: isConnected ? true : false,
            userVote: true
          },
          {
            id: 3,
            title: 'Reduce Trading Fees to 0.25%',
            description: 'Lower the trading fees from 0.3% to 0.25% to increase trading volume and competitiveness.',
            proposer: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            forVotes: 6500,
            againstVotes: 8900,
            startTime: Math.floor(Date.now() / 1000) - (10 * 24 * 60 * 60), // 10 days ago
            endTime: Math.floor(Date.now() / 1000) - (3 * 24 * 60 * 60), // 3 days ago (ended)
            executed: false,
            hasUserVoted: isConnected ? true : false,
            userVote: false
          }
        ]
      }

      setGovernanceData(mockGovernanceData)
    } catch (error) {
      console.error('Error fetching governance data:', error)
      setError('Failed to fetch governance data')
    }
  }, [governanceContract, isConnected])

  // Update dynamic dashboard stats
  const updateDashboardStats = useCallback(() => {
    // Simulate realistic growth and fluctuations
    setTotalValueLocked(prev => {
      const change = Math.floor(Math.random() * 20000) - 10000 // -10k to +10k change
      const newValue = Math.max(prev + change, 20000000) // Minimum 20M
      return newValue
    })

    setActiveUsers(prev => {
      const change = Math.floor(Math.random() * 20) - 10 // -10 to +10 change
      const newValue = Math.max(prev + change, 10000) // Minimum 10k users
      return newValue
    })

    setTotalTransactions(prev => {
      const change = Math.floor(Math.random() * 100) + 10 // +10 to +110 change (always growing)
      return prev + change
    })
  }, [])

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await Promise.all([
        fetchSavingsData(),
        fetchCreditData(),
        fetchDexData(),
        fetchGovernanceData()
      ])
      
      // Update dashboard stats after fetching other data
      updateDashboardStats()
    } catch (error) {
      console.error('Error refreshing data:', error)
      setError('Failed to refresh data')
    } finally {
      setIsLoading(false)
    }
  }, [fetchSavingsData, fetchCreditData, fetchDexData, fetchGovernanceData, updateDashboardStats])

  // Individual refresh functions
  const refreshSavingsData = useCallback(() => {
    fetchSavingsData()
  }, [fetchSavingsData])

  const refreshCreditData = useCallback(() => {
    fetchCreditData()
  }, [fetchCreditData])

  const refreshDexData = useCallback(() => {
    fetchDexData()
  }, [fetchDexData])

  const refreshGovernanceData = useCallback(() => {
    fetchGovernanceData()
  }, [fetchGovernanceData])

  // Initial data fetch
  useEffect(() => {
    refreshAllData()
  }, [refreshAllData])

  // Set up real-time data updates (polling)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        refreshAllData()
      }
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [isConnected, refreshAllData])

  // Set up more frequent dashboard stats updates
  useEffect(() => {
    const statsInterval = setInterval(() => {
      updateDashboardStats()
    }, 5000) // Update stats every 5 seconds for more dynamic feel

    return () => clearInterval(statsInterval)
  }, [updateDashboardStats])

  return {
    // Data
    savingsData,
    creditData,
    dexData,
    governanceData,
    
    // State
    isLoading,
    error,
    
    // Dynamic dashboard stats
    totalValueLocked,
    activeUsers,
    totalTransactions,
    
    // Refresh functions
    refreshAllData,
    refreshSavingsData,
    refreshCreditData,
    refreshDexData,
    refreshGovernanceData
  }
}
