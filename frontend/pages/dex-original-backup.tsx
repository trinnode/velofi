import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, TrendingUp, Zap, DollarSign, ArrowUp, BarChart3, Loader2 } from 'lucide-react'
import { useAccount, useBalance } from 'wagmi'
import { useContract } from '../hooks/useContract'
import { useRealTimeData } from '../hooks/useRealTimeData'
import { formatEther, parseEther } from 'viem'
import { toast } from 'react-hot-toast'
import ConnectWalletButton from '../components/ConnectWalletButton'

export default function DexPage() {
  const { address, isConnected } = useAccount()
  const [mounted, setMounted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [fromAmount, setFromAmount] = useState('')
const [toAmount, setToAmount] = useState('')
const [fromToken, setFromToken] = useState('VLFI')
const [toToken, setToToken] = useState('ETH')
const [isSwapping, setIsSwapping] = useState(false)
const [priceImpact, setPriceImpact] = useState(0)

  const { exchangeContract, mockTokenContract } = useContract()
  const { dexData, refreshDexData } = useRealTimeData()

  const { data: vlfiBalance } = useBalance({
    address,
    token: process.env.NEXT_PUBLIC_MOCK_TOKEN_ADDRESS as `0x${string}`,
  })

  const { data: ethBalance } = useBalance({
    address,
  })

  const calculateSwapOutput = useCallback(async () => {
    if (!fromAmount || !exchangeContract) return

    try {
      // const amountIn = parseEther(fromAmount)
      // This would call a view function on the exchange contract to get estimated output
      // For now, using a simple calculation for demo
      const estimated = (parseFloat(fromAmount) * 0.95).toFixed(6) // 5% fee
      setToAmount(estimated)
      setPriceImpact(5.0)
      setErrorMsg(null)
    } catch (error) {
      console.error('Error calculating swap output:', error)
      setErrorMsg('Failed to calculate swap output.')
      toast.error('Failed to calculate swap output.')
      // TrackEvent('dex_swap_calc_error', { address, error: (error as Error).message })
    }
  }, [fromAmount, exchangeContract])

  useEffect(() => {
    setMounted(true)
    // if (isConnected && address) {
    //   TrackEvent('dex_wallet_connected', { address })
    // }
  }, [isConnected, address])

  // Error message auto-clear
  useEffect(() => {
    if (errorMsg) {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
      errorTimeoutRef.current = setTimeout(() => setErrorMsg(null), 5000)
    }
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    }
  }, [errorMsg])

  // Calculate estimated output when input changes
  useEffect(() => {
    if (fromAmount && exchangeContract) {
      calculateSwapOutput()
    }
  }, [fromAmount, fromToken, toToken, calculateSwapOutput, exchangeContract])

  // ...existing code...

  const handleSwap = async () => {
    if (!exchangeContract || !mockTokenContract || !address || !fromAmount) {
      setErrorMsg('Missing contract, wallet, or amount.')
      toast.error('Missing contract, wallet, or amount.')
      return
    }

    try {
      setIsSwapping(true)
      setErrorMsg(null)
      const amountIn = parseEther(fromAmount)

      if (fromToken === 'VLFI') {
        // Approve token spending first
        const approveTx = await mockTokenContract.write.approve([
          exchangeContract.address,
          amountIn
        ])
        toast('Approval transaction sent!', { icon: '🔏', style: { background: '#1effa0', color: '#222' } })
        await approveTx.wait()

        // Swap VLFI for ETH
        const swapTx = await exchangeContract.write.swapTokensForEth([
          amountIn,
          parseEther(toAmount)
        ])
        toast('Swap transaction sent!', { icon: '💸', style: { background: '#ff00c8', color: '#fff' } })
        await swapTx.wait()
      } else {
        // Swap ETH for VLFI
        const swapTx = await exchangeContract.write.swapEthForTokens([
          parseEther(toAmount)
        ], { value: amountIn })
        toast('Swap transaction sent!', { icon: '💸', style: { background: '#ff00c8', color: '#fff' } })
        await swapTx.wait()
      }

      toast.success('Swap successful!')
      setFromAmount('')
      setToAmount('')
      refreshDexData()
    } catch (error) {
      console.error('Swap failed:', error)
      let msg = (error as Error)?.message || 'Swap failed. Please try again.'
      if (msg.includes('insufficient funds')) msg = 'Insufficient funds for swap.'
      setErrorMsg(msg)
      toast.error(msg)
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

  if (!mounted) return null

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 px-4 py-3 rounded-lg bg-neon-magenta/80 text-white text-center font-semibold shadow-lg border border-electric-lime"
            role="alert"
            aria-live="assertive"
          >
            {errorMsg}
          </motion.div>
        )}
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-neon-magenta/20 rounded-full">
              <ArrowUpDown className="w-12 h-12 text-neon-magenta" />
            </div>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-neon-magenta to-electric-lime bg-clip-text text-transparent">
            Decentralized Exchange
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Trade tokens with low fees and high speed on Somnia Network&apos;s optimized infrastructure.
            Experience seamless swaps with real-time price discovery.
          </p>
        </motion.div>

        {/* DEX Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            {
              title: "24h Volume",
              value: `${dexData.volume24h} VLFI`,
              change: "+18.5%",
              icon: <BarChart3 className="w-6 h-6" />,
              color: "electric-lime"
            },
            {
              title: "Total Liquidity",
              value: `${dexData.totalLiquidity} VLFI`,
              change: "+5.2%",
              icon: <DollarSign className="w-6 h-6" />,
              color: "neon-magenta"
            },
            {
              title: "VLFI Price",
              value: `$${dexData.vlfiPrice}`,
              change: "+2.1%",
              icon: <TrendingUp className="w-6 h-6" />,
              color: "electric-lime"
            },
            {
              title: "Active Pairs",
              value: dexData.activePairs.toString(),
              change: "+1 today",
              icon: <Zap className="w-6 h-6" />,
              color: "neon-magenta"
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-jet-black/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-neon-magenta/30 transition-all duration-300"
            >
              <div className={`flex items-center gap-3 mb-4 text-${stat.color}`}>
                {stat.icon}
                <span className="text-sm font-medium text-gray-300">{stat.title}</span>
              </div>
              <div className="text-2xl font-bold text-white mb-2">{stat.value}</div>
              <div className={`text-sm text-${stat.color} flex items-center gap-1`}>
                <ArrowUp className="w-4 h-4" />
                {stat.change}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Swap Interface */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <ArrowUpDown className="w-6 h-6 text-neon-magenta" />
                Swap Tokens
              </h2>

              {isConnected ? (
                <div className="space-y-4">
                  {/* From Token */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-300">From</label>
                      <div className="text-sm text-gray-400">
                        Balance: {fromToken === 'VLFI' 
                          ? vlfiBalance ? formatEther(vlfiBalance.value) : '0.00'
                          : ethBalance ? formatEther(ethBalance.value) : '0.00'
                        } {fromToken}
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={fromAmount}
                        onChange={(e) => setFromAmount(e.target.value)}
                        className="w-full px-4 py-4 bg-jet-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-neon-magenta focus:ring-1 focus:ring-neon-magenta outline-none transition-colors pr-20"
                        placeholder="0.00"
                      />
                      <div className="absolute right-4 top-4">
                        <select
                          value={fromToken}
                          onChange={(e) => setFromToken(e.target.value)}
                          className="bg-transparent text-white border-none outline-none cursor-pointer"
                        >
                          <option value="VLFI" className="bg-jet-black">VLFI</option>
                          <option value="ETH" className="bg-jet-black">ETH</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Swap Direction Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={switchTokens}
                      className="p-3 bg-jet-black border-2 border-electric-lime rounded-full hover:bg-electric-lime hover:text-jet-black transition-all duration-300 group"
                    >
                      <ArrowUpDown className="w-5 h-5 text-electric-lime group-hover:text-jet-black transition-colors" />
                    </button>
                  </div>

                  {/* To Token */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-300">To</label>
                      <div className="text-sm text-gray-400">
                        Balance: {toToken === 'VLFI' 
                          ? vlfiBalance ? formatEther(vlfiBalance.value) : '0.00'
                          : ethBalance ? formatEther(ethBalance.value) : '0.00'
                        } {toToken}
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={toAmount}
                        readOnly
                        className="w-full px-4 py-4 bg-jet-black border border-gray-600 rounded-lg text-white placeholder-gray-400 outline-none pr-20"
                        placeholder="0.00"
                      />
                      <div className="absolute right-4 top-4">
                        <select
                          value={toToken}
                          onChange={(e) => setToToken(e.target.value)}
                          className="bg-transparent text-white border-none outline-none cursor-pointer"
                        >
                          <option value="ETH" className="bg-jet-black">ETH</option>
                          <option value="VLFI" className="bg-jet-black">VLFI</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Price Impact & Details */}
                  {fromAmount && toAmount && (
                    <div className="bg-jet-black/50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Exchange Rate</span>
                        <span className="text-white">1 {fromToken} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toToken}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Price Impact</span>
                        <span className={`${priceImpact > 3 ? 'text-red-500' : 'text-electric-lime'}`}>
                          {priceImpact.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Network Fee</span>
                        <span className="text-white">~$0.01</span>
                      </div>
                    </div>
                  )}

                  {/* Swap Button */}
                  <button
                    onClick={handleSwap}
                    disabled={isSwapping || !fromAmount || !toAmount}
                    className="w-full px-6 py-4 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-lg font-semibold text-jet-black hover:shadow-lg hover:shadow-neon-magenta/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSwapping ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Swapping...
                      </>
                    ) : (
                      <>
                        <ArrowUpDown className="w-5 h-5" />
                        Swap Tokens
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <p className="mb-4">Connect your wallet to start trading</p>
                  <ConnectWalletButton 
                    variant="primary"
                    size="md"
                    className="w-auto"
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* Trading Chart & Recent Trades */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-2 space-y-8"
          >
            {/* Price Chart */}
            <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-electric-lime/20 p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-electric-lime" />
                VLFI/ETH Price Chart
              </h2>
              
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg">
                <div className="text-center text-gray-400">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                  <p className="text-lg">Trading chart will be displayed here</p>
                  <p className="text-sm mt-2">Real-time price data visualization</p>
                </div>
              </div>
            </div>

            {/* Recent Trades */}
            <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Zap className="w-6 h-6 text-neon-magenta" />
                Recent Trades
              </h2>
              
              <div className="space-y-3">
                {dexData.recentTrades?.length > 0 ? (
                  dexData.recentTrades.map((trade, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-jet-black/30 rounded-lg border border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${trade.type === 'buy' ? 'bg-electric-lime' : 'bg-red-500'}`} />
                        <span className="text-white font-medium">
                          {trade.fromAmount} {trade.fromToken} → {trade.toAmount} {trade.toToken}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-white">${trade.value}</div>
                        <div className="text-sm text-gray-400">{trade.time}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    {/* Mock recent trades for demo */}
                    {[
                      { type: 'buy', fromAmount: '100', fromToken: 'VLFI', toAmount: '0.05', toToken: 'ETH', value: '125.50', time: '2 min ago' },
                      { type: 'sell', fromAmount: '0.1', fromToken: 'ETH', toAmount: '195', toToken: 'VLFI', value: '242.75', time: '5 min ago' },
                      { type: 'buy', fromAmount: '50', fromToken: 'VLFI', toAmount: '0.025', toToken: 'ETH', value: '62.25', time: '8 min ago' }
                    ].map((trade, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-jet-black/30 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${trade.type === 'buy' ? 'bg-electric-lime' : 'bg-red-500'}`} />
                          <span className="text-white font-medium">
                            {trade.fromAmount} {trade.fromToken} → {trade.toAmount} {trade.toToken}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-white">${trade.value}</div>
                          <div className="text-sm text-gray-400">{trade.time}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Liquidity Pools */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-gray-700/50 p-8">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Liquidity Pools</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  pair: "VLFI/ETH",
                  tvl: "$1,245,678",
                  apy: "12.5%",
                  volume24h: "$89,234",
                  yourLiquidity: "$0"
                },
                {
                  pair: "VLFI/USDC", 
                  tvl: "$892,456",
                  apy: "8.9%",
                  volume24h: "$45,678",
                  yourLiquidity: "$0"
                },
                {
                  pair: "ETH/USDC",
                  tvl: "$2,134,567",
                  apy: "6.2%",
                  volume24h: "$156,789",
                  yourLiquidity: "$0"
                }
              ].map((pool) => (
                <div key={pool.pair} className="bg-jet-black/30 rounded-lg border border-gray-700 p-6 hover:border-electric-lime/30 transition-all duration-300">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">{pool.pair}</h3>
                    <div className="text-3xl font-bold text-electric-lime">{pool.apy}</div>
                    <div className="text-sm text-gray-400">APY</div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-400">TVL</span>
                      <span className="text-white">{pool.tvl}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">24h Volume</span>
                      <span className="text-white">{pool.volume24h}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Your Liquidity</span>
                      <span className="text-white">{pool.yourLiquidity}</span>
                    </div>
                  </div>
                  
                  <button className="w-full px-4 py-2 border-2 border-electric-lime text-electric-lime rounded-lg hover:bg-electric-lime hover:text-jet-black transition-all duration-300">
                    Add Liquidity
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12"
        >
          <div className="bg-gradient-to-r from-neon-magenta/10 to-electric-lime/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">How VeloFi DEX Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Choose Your Tokens",
                  description: "Select the tokens you want to swap from our supported token pairs with real-time pricing."
                },
                {
                  step: "2",
                  title: "Execute the Swap",
                  description: "Confirm your transaction and execute the swap with minimal slippage and competitive fees."
                },
                {
                  step: "3",
                  title: "Provide Liquidity",
                  description: "Earn fees by providing liquidity to trading pairs and help improve the DEX ecosystem."
                }
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-full flex items-center justify-center text-jet-black font-bold text-xl mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}