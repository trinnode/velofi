import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Zap, Clock, DollarSign } from 'lucide-react'
import { formatEther } from 'viem'

interface InterestAccrualDisplayProps {
  userBalance?: {
    principal: bigint
    accruedInterest: bigint
    totalBalance: bigint
    lastUpdate: number
  }
  currentAPY?: number
  className?: string
}

export default function InterestAccrualDisplay({ 
  userBalance, 
  currentAPY = 5.0, 
  className = '' 
}: InterestAccrualDisplayProps) {
  const [displayInterest, setDisplayInterest] = useState<string>('0.000000')
  const [isAccruing, setIsAccruing] = useState(false)

  useEffect(() => {
    if (!userBalance || userBalance.principal === 0n) return

    const interval = setInterval(() => {
      // Simulate real-time interest accrual
      const currentTime = Date.now() / 1000
      const timeSinceLastUpdate = currentTime - userBalance.lastUpdate
      const secondsInYear = 365 * 24 * 60 * 60
      
      // Calculate interest accrued since last update
      const annualRate = currentAPY / 100
      const interestRate = annualRate / secondsInYear
      const newInterest = Number(formatEther(userBalance.principal)) * interestRate * timeSinceLastUpdate
      
      const totalAccruedInterest = Number(formatEther(userBalance.accruedInterest)) + newInterest
      setDisplayInterest(totalAccruedInterest.toFixed(6))
      setIsAccruing(newInterest > 0)
    }, 1000)

    return () => clearInterval(interval)
  }, [userBalance, currentAPY])

  if (!userBalance || userBalance.principal === 0n) {
    return (
      <div className={`bg-gradient-to-r from-electric-lime/10 to-neon-magenta/10 rounded-xl p-6 ${className}`}>
        <div className="text-center">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">Make a deposit to start earning interest</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-electric-lime/20 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-electric-lime" />
          Interest Accrual
        </h3>
        
        {isAccruing && (
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7] 
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="flex items-center gap-2 text-electric-lime text-sm"
          >
            <Zap className="w-4 h-4" />
            Live
          </motion.div>
        )}
      </div>

      {/* Real-time Interest Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-jet-black/30 rounded-lg border border-gray-700">
          <div className="text-2xl font-bold text-white mb-1">
            {formatEther(userBalance.principal)}
          </div>
          <div className="text-gray-400 text-sm">Principal</div>
        </div>

        <div className="text-center p-4 bg-jet-black/30 rounded-lg border border-gray-700">
          <motion.div 
            key={displayInterest}
            initial={{ scale: 1.1, color: '#CCFF00' }}
            animate={{ scale: 1, color: '#CCFF00' }}
            transition={{ duration: 0.3 }}
            className="text-2xl font-bold mb-1"
          >
            {displayInterest}
          </motion.div>
          <div className="text-gray-400 text-sm">Accrued Interest</div>
        </div>

        <div className="text-center p-4 bg-jet-black/30 rounded-lg border border-gray-700">
          <div className="text-2xl font-bold text-neon-magenta mb-1">
            {(Number(formatEther(userBalance.principal)) + Number(displayInterest)).toFixed(6)}
          </div>
          <div className="text-gray-400 text-sm">Total Balance</div>
        </div>
      </div>

      {/* Interest Rate Information */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-lg font-bold text-electric-lime">{currentAPY}%</div>
          <div className="text-xs text-gray-400">Annual APY</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-electric-lime">
            {(currentAPY / 365).toFixed(4)}%
          </div>
          <div className="text-xs text-gray-400">Daily Rate</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-electric-lime">
            {(currentAPY / (365 * 24)).toFixed(6)}%
          </div>
          <div className="text-xs text-gray-400">Hourly Rate</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-electric-lime">
            {(currentAPY / (365 * 24 * 60 * 60)).toFixed(8)}%
          </div>
          <div className="text-xs text-gray-400">Per Second</div>
        </div>
      </div>

      {/* Projection Chart */}
      <div className="bg-jet-black/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-neon-magenta" />
          <span className="text-sm font-medium text-gray-300">Interest Projection</span>
        </div>

        <div className="space-y-2">
          {[
            { period: '1 Day', multiplier: 1 },
            { period: '1 Week', multiplier: 7 },
            { period: '1 Month', multiplier: 30 },
            { period: '1 Year', multiplier: 365 }
          ].map(({ period, multiplier }) => {
            const projectedInterest = (Number(formatEther(userBalance.principal)) * currentAPY / 100 / 365 * multiplier)
            
            return (
              <div key={period} className="flex justify-between items-center text-sm">
                <span className="text-gray-400">{period}:</span>
                <span className="text-electric-lime font-medium">
                  +{projectedInterest.toFixed(6)} VLFI
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Compounding Information */}
      <div className="mt-4 p-4 bg-electric-lime/10 rounded-lg border border-electric-lime/20">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-electric-lime flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-white mb-1">Real-Time Compounding</h4>
            <p className="text-sm text-gray-300 leading-relaxed">
              Your interest compounds every second, maximizing your yield. 
              The display updates in real-time to show your growing balance.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
