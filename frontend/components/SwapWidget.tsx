import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, Zap, Settings, Loader2, AlertTriangle } from 'lucide-react'
import { useAccount, useBalance } from 'wagmi'
import { useContract } from '../hooks/useContract'
import { formatEther, parseEther } from 'viem'
import { toast } from 'react-hot-toast'
import { getButtonTouchClasses, getMobileText, getMobilePadding } from '../utils/mobile'

interface SwapWidgetProps {
  onSwapComplete?: () => void
}

export default function SwapWidget({ onSwapComplete }: SwapWidgetProps) {
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [fromToken, setFromToken] = useState('VLFI')
  const [toToken, setToToken] = useState('ETH')
  const [slippage, setSlippage] = useState(0.5)
  const [showSettings, setShowSettings] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [priceImpact, setPriceImpact] = useState(0)
  const [mounted, setMounted] = useState(false)

  const { address, isConnected } = useAccount()
  const { exchangeContract, mockTokenContract } = useContract()

  const { data: vlfiBalance } = useBalance({
    address,
    token: process.env.NEXT_PUBLIC_MOCK_TOKEN_ADDRESS as `0x${string}`,
  })

  const { data: ethBalance } = useBalance({
    address,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const calculateSwapOutput = useCallback(async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return

    try {
      // Mock calculation for demo - in real implementation, this would query the exchange contract
      const inputAmount = parseFloat(fromAmount)
      const exchangeRate = fromToken === 'VLFI' ? 0.5 : 2.0 // Mock rates
      const fee = 0.003 // 0.3% fee
      
      const outputBeforeFee = inputAmount * exchangeRate
      const outputAfterFee = outputBeforeFee * (1 - fee)
      
      setToAmount(outputAfterFee.toFixed(6))
      
      // Calculate price impact (mock)
      const impact = Math.min((inputAmount / 10000) * 100, 5) // Max 5% impact
      setPriceImpact(impact)
    } catch (error) {
      console.error('Error calculating swap output:', error)
      setToAmount('')
      setPriceImpact(0)
    }
  }, [fromAmount, fromToken])

  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0) {
      calculateSwapOutput()
    } else {
      setToAmount('')
      setPriceImpact(0)
    }
  }, [calculateSwapOutput, fromAmount, fromToken, toToken])

  const handleSwap = async () => {
    if (!exchangeContract || !address || !fromAmount || !toAmount) return

    try {
      setIsSwapping(true)
      const amountIn = parseEther(fromAmount)
      const minAmountOut = parseEther((parseFloat(toAmount) * (1 - slippage / 100)).toFixed(18))

      let swapTx

      if (fromToken === 'VLFI') {
        // Approve token spending first
        if (mockTokenContract) {
          const approveTx = await mockTokenContract.write.approve([
            exchangeContract.address,
            amountIn
          ])
          toast.success('Approval transaction sent!')
          await approveTx.wait()
        }

        // Swap VLFI for ETH
        swapTx = await exchangeContract.write.swapTokensForEth([
          amountIn,
          minAmountOut
        ])
      } else {
        // Swap ETH for VLFI
        swapTx = await exchangeContract.write.swapEthForTokens([
          minAmountOut
        ], { value: amountIn })
      }

      toast.success('Swap transaction sent!')
      await swapTx.wait()
      toast.success('Swap completed successfully!')

      setFromAmount('')
      setToAmount('')
      setPriceImpact(0)
      onSwapComplete?.()

    } catch (error) {
      console.error('Swap failed:', error)
      toast.error('Swap failed. Please try again.')
    } finally {
      setIsSwapping(false)
    }
  }

  const switchTokens = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  const getBalance = (token: string) => {
    if (token === 'VLFI') {
      return vlfiBalance ? formatEther(vlfiBalance.value) : '0.00'
    }
    return ethBalance ? formatEther(ethBalance.value) : '0.00'
  }

  const isInsufficientBalance = () => {
    if (!fromAmount || !isConnected) return false
    const balance = parseFloat(getBalance(fromToken))
    return parseFloat(fromAmount) > balance
  }

  const getPriceImpactColor = () => {
    if (priceImpact < 1) return 'text-green-500'
    if (priceImpact < 3) return 'text-yellow-500'
    return 'text-red-500'
  }

  if (!mounted) return null

  return (
    <div className={`bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 ${getMobilePadding('md')}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`font-bold text-white flex items-center gap-2 ${getMobileText('lg')}`}>
          <ArrowUpDown className="w-5 h-5 text-neon-magenta" />
          Swap
        </h3>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 text-gray-400 hover:text-white hover:bg-jet-black/50 rounded-lg transition-all duration-300 ${getButtonTouchClasses()}`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 p-4 bg-jet-black/50 rounded-lg border border-gray-700"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Slippage Tolerance
              </label>
              <div className="flex gap-2">
                {[0.1, 0.5, 1.0].map((value) => (
                  <button
                    key={value}
                    onClick={() => setSlippage(value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      slippage === value
                        ? 'bg-neon-magenta text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {value}%
                  </button>
                ))}
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm w-20"
                  min="0.1"
                  max="50"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        {/* From Token */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">From</label>
            <div className="text-sm text-gray-400">
              Balance: {getBalance(fromToken)} {fromToken}
            </div>
          </div>
          
          <div className="relative">
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className={`w-full px-4 py-4 bg-jet-black border rounded-lg text-white placeholder-gray-400 focus:ring-1 outline-none transition-colors pr-24 ${
                isInsufficientBalance() 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-600 focus:border-neon-magenta focus:ring-neon-magenta'
              }`}
              placeholder="0.00"
            />
            
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <select
                value={fromToken}
                onChange={(e) => setFromToken(e.target.value)}
                className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer pr-2"
              >
                <option value="VLFI" className="bg-jet-black">VLFI</option>
                <option value="ETH" className="bg-jet-black">ETH</option>
              </select>
            </div>
          </div>
          
          {isInsufficientBalance() && (
            <div className="text-red-500 text-sm flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Insufficient {fromToken} balance
            </div>
          )}
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <button
            onClick={switchTokens}
            className="p-3 bg-jet-black border-2 border-electric-lime rounded-full hover:bg-electric-lime hover:border-electric-lime hover:text-jet-black transition-all duration-300 group"
          >
            <ArrowUpDown className="w-5 h-5 text-electric-lime group-hover:text-jet-black transition-colors" />
          </button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">To</label>
            <div className="text-sm text-gray-400">
              Balance: {getBalance(toToken)} {toToken}
            </div>
          </div>
          
          <div className="relative">
            <input
              type="number"
              value={toAmount}
              readOnly
              className="w-full px-4 py-4 bg-jet-black border border-gray-600 rounded-lg text-white placeholder-gray-400 outline-none pr-24"
              placeholder="0.00"
            />
            
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <select
                value={toToken}
                onChange={(e) => setToToken(e.target.value)}
                className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer pr-2"
              >
                <option value="ETH" className="bg-jet-black">ETH</option>
                <option value="VLFI" className="bg-jet-black">VLFI</option>
              </select>
            </div>
          </div>
        </div>

        {/* Swap Details */}
        {fromAmount && toAmount && parseFloat(fromAmount) > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-jet-black/50 rounded-lg p-4 space-y-2 text-sm"
          >
            <div className="flex justify-between">
              <span className="text-gray-400">Exchange Rate</span>
              <span className="text-white">
                1 {fromToken} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toToken}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Price Impact</span>
              <span className={getPriceImpactColor()}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Slippage Tolerance</span>
              <span className="text-white">{slippage}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Network Fee</span>
              <span className="text-white">~$0.01</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Minimum Received</span>
              <span className="text-white">
                {(parseFloat(toAmount) * (1 - slippage / 100)).toFixed(6)} {toToken}
              </span>
            </div>
          </motion.div>
        )}

        {/* Price Impact Warning */}
        {priceImpact > 3 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">High Price Impact</span>
            </div>
            <p className="text-xs text-red-300 mt-1">
              This swap has a high price impact of {priceImpact.toFixed(2)}%. Consider reducing the amount.
            </p>
          </div>
        )}

        {/* Swap Button */}
        {isConnected ? (
          <button
            onClick={handleSwap}
            disabled={
              isSwapping || 
              !fromAmount || 
              !toAmount || 
              parseFloat(fromAmount) <= 0 || 
              isInsufficientBalance()
            }
            className={`w-full px-6 py-4 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-lg font-semibold text-jet-black hover:shadow-lg hover:shadow-neon-magenta/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${getButtonTouchClasses()}`}
          >
            {isSwapping ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Swapping...
              </>
            ) : isInsufficientBalance() ? (
              `Insufficient ${fromToken} Balance`
            ) : (
              <>
                <ArrowUpDown className="w-5 h-5" />
                Swap Tokens
              </>
            )}
          </button>
        ) : (
          <button className={`w-full px-6 py-4 bg-gray-600 rounded-lg font-semibold text-gray-300 cursor-not-allowed ${getButtonTouchClasses()}`}>
            Connect Wallet to Swap
          </button>
        )}
      </div>

      {/* Quick Info */}
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
        <Zap className="w-3 h-3" />
        <span>Powered by VeloFi AMM • 0.3% trading fee</span>
      </div>
    </div>
  )
}
