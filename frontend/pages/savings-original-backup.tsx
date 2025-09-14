import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PiggyBank, TrendingUp, Clock, Award, ArrowUpRight, Loader2 } from 'lucide-react'
import { useAccount, useBalance } from 'wagmi'
import { useContract } from '../hooks/useContract'
import { useRealTimeData } from '../hooks/useRealTimeData'
import { formatEther, parseEther } from 'viem'
import { toast } from 'react-hot-toast'
// Simple analytics event tracker (placeholder)
function trackEvent(event: string, details?: Record<string, unknown>) {
  // Replace with real analytics integration
  console.log(`[Analytics] ${event}`, details || {})
}
import ConnectWalletButton from '../components/ConnectWalletButton'

export default function SavingsPage() {
  const { address, isConnected } = useAccount()
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isDepositing, setIsDepositing] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { savingsContract, mockTokenContract } = useContract()
  const { savingsData, refreshSavingsData } = useRealTimeData()

  const { data: tokenBalance } = useBalance({
    address,
    token: process.env.NEXT_PUBLIC_MOCK_TOKEN_ADDRESS as `0x${string}`,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const [allowance, setAllowance] = useState<bigint>(0n)
  useEffect(() => {
    async function fetchAllowance() {
      if (!mockTokenContract || !address || !savingsContract) return
      try {
        const result = await mockTokenContract.read.allowance([
          address,
          savingsContract.address
        ])
        setAllowance(result)
      } catch (err: unknown) {}
    }
    fetchAllowance()
  }, [mockTokenContract, address, savingsContract, depositAmount])

  const handleDeposit = async () => {
    if (!savingsContract || !mockTokenContract || !address || !depositAmount) {
      setErrorMsg('Missing contract, wallet, or amount.')
      toast.error('Missing contract, wallet, or amount.')
      return
    }
    try {
      setIsDepositing(true)
      setErrorMsg(null)
      const amount = parseEther(depositAmount)
      if (allowance < amount) {
        const approveTx = await mockTokenContract.write.approve([
          savingsContract.address,
          amount
        ])
        toast('Approval transaction sent!', { icon: '🔏', style: { background: '#1effa0', color: '#222' } })
        await approveTx.wait()
        setAllowance(amount)
      }
      const depositTx = await savingsContract.write.deposit([amount])
      toast('Deposit transaction sent!', { icon: '💸', style: { background: '#ff00c8', color: '#fff' } })
      await depositTx.wait()
      toast.success('Deposit successful!')
      setDepositAmount('')
      refreshSavingsData()
      trackEvent('deposit', { address, amount: depositAmount })
    } catch (error) {
      const err = error as Error
      console.error('Deposit failed:', err)
      let msg = err.message || 'Deposit failed. Please try again.'
      if (msg.includes('insufficient funds')) msg = 'Insufficient funds for deposit.'
      setErrorMsg(msg)
      toast.error(msg)
      trackEvent('deposit_error', { address, error: msg })
    } finally {
      setIsDepositing(false)
    }
  }

  const handleWithdraw = async () => {
    if (!savingsContract || !address || !withdrawAmount) {
      setErrorMsg('Missing contract, wallet, or amount.')
      toast.error('Missing contract, wallet, or amount.')
      return
    }
    try {
      setIsWithdrawing(true)
      setErrorMsg(null)
      const amount = withdrawAmount === 'all' ? 0 : parseEther(withdrawAmount)
      const withdrawTx = await savingsContract.write.withdraw([amount])
      toast('Withdrawal transaction sent!', { icon: '🏦', style: { background: '#1effa0', color: '#222' } })
      await withdrawTx.wait()
      toast.success('Withdrawal successful!')
      setWithdrawAmount('')
      refreshSavingsData()
      trackEvent('withdraw', { address, amount: withdrawAmount })
    } catch (error) {
      const err = error as Error
      console.error('Withdrawal failed:', err)
      let msg = err.message || 'Withdrawal failed. Please try again.'
      if (msg.includes('insufficient funds')) msg = 'Insufficient funds for withdrawal.'
      setErrorMsg(msg)
      toast.error(msg)
      trackEvent('withdraw_error', { address, error: msg })
    } finally {
      setIsWithdrawing(false)
    }
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
              <PiggyBank className="w-12 h-12 text-neon-magenta" />
            </div>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-neon-magenta to-electric-lime bg-clip-text text-transparent">
            Real-Time Yield Savings
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Earn competitive interest on your deposits with real-time compounding and transparent APY.
            Your funds work harder for you on Somnia Network&apos;s high-performance infrastructure.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            {
              title: "Current APY",
              value: "5.00%",
              change: "+0.25%",
              icon: <TrendingUp className="w-6 h-6" />,
              color: "electric-lime"
            },
            {
              title: "Total Deposited",
              value: `${savingsData.totalDeposits} VLFI`,
              change: "+12.5%",
              icon: <PiggyBank className="w-6 h-6" />,
              color: "neon-magenta"
            },
            {
              title: "Active Savers",
              value: savingsData.totalDepositors.toString(),
              change: "+8 today",
              icon: <Award className="w-6 h-6" />,
              color: "electric-lime"
            },
            {
              title: "Interest Paid",
              value: `${savingsData.accumulatedInterest} VLFI`,
              change: "Real-time",
              icon: <Clock className="w-6 h-6" />,
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
                <ArrowUpRight className="w-4 h-4" />
                {stat.change}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Deposit Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <PiggyBank className="w-6 h-6 text-neon-magenta" />
                Make a Deposit
              </h2>

              {isConnected ? (
                tokenBalance && tokenBalance.value === 0n ? (
                  <div className="text-center py-8">
                    <p className="mb-4 text-white">You have no VLFI tokens.</p>
                    {/* Use Next.js Link for navigation */}
                    <Link href="/faucet" passHref>
                      <button className="px-6 py-3 rounded-lg bg-electric-lime text-jet-black font-bold border-2 border-neon-magenta">
                        Go to Faucet to Mint
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Deposit Amount (VLFI)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="w-full px-4 py-3 bg-jet-black border border-electric-lime rounded-lg text-white placeholder-gunmetal-gray focus:border-neon-magenta focus:ring-1 focus:ring-neon-magenta outline-none transition-colors"
                          placeholder="0.00"
                        />
                        <div className="absolute right-3 top-3 text-gunmetal-gray">
                          VLFI
                        </div>
                      </div>
                      {tokenBalance && (
                        <div className="mt-2 text-sm text-gunmetal-gray">
                          Available: {formatEther(tokenBalance.value)} VLFI
                        </div>
                      )}
                      {allowance !== undefined && depositAmount && parseEther(depositAmount) > allowance && (
                        <div className="mt-2 text-sm text-neon-magenta">Approval required before deposit.</div>
                      )}
                    </div>
                    <button
                      onClick={handleDeposit}
                      disabled={isDepositing || !depositAmount || (tokenBalance && parseEther(depositAmount) > tokenBalance.value)}
                      className={`w-full px-6 py-3 rounded-lg font-semibold text-jet-black border-2 border-electric-lime bg-electric-lime disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                    >
                      {isDepositing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-neon-magenta" />
                          Depositing...
                        </>
                      ) : (
                        'Deposit Funds'
                      )}
                    </button>
                  </div>
                )
              ) : (
                <div className="text-center text-white py-8">
                  <p className="mb-4">Connect your wallet to start earning</p>
                  <ConnectWalletButton 
                    variant="primary"
                    size="md"
                    className="w-auto"
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* Account Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-electric-lime/20 p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-electric-lime" />
                Your Savings Overview
              </h2>

              {isConnected && address && savingsData.userBalance ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-jet-black/30 rounded-lg border border-gray-700">
                    <div className="text-3xl font-bold text-white mb-2">
                      {formatEther(savingsData.userBalance.principal)} VLFI
                    </div>
                    <div className="text-gray-400">Principal Deposited</div>
                  </div>

                  <div className="text-center p-6 bg-jet-black/30 rounded-lg border border-gray-700">
                    <div className="text-3xl font-bold text-electric-lime mb-2">
                      {formatEther(savingsData.userBalance.accruedInterest)} VLFI
                    </div>
                    <div className="text-gray-400">Interest Earned</div>
                  </div>

                  <div className="text-center p-6 bg-jet-black/30 rounded-lg border border-gray-700">
                    <div className="text-3xl font-bold text-neon-magenta mb-2">
                      {formatEther(savingsData.userBalance.totalBalance)} VLFI
                    </div>
                    <div className="text-gray-400">Total Balance</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  {!isConnected ? 'Connect your wallet to view your savings' : 'No deposits found'}
                </div>
              )}

              {/* Withdraw Section */}
              {isConnected && savingsData.userBalance && (
                <div className="mt-8 pt-8 border-t border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-4">Withdraw Funds</h3>
                  
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-jet-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-electric-lime focus:ring-1 focus:ring-electric-lime outline-none transition-colors"
                        placeholder="Amount to withdraw"
                      />
                    </div>
                    
                    <button
                      onClick={() => setWithdrawAmount('all')}
                      className="px-6 py-3 border-2 border-electric-lime text-electric-lime rounded-lg hover:bg-electric-lime hover:text-jet-black transition-all duration-300"
                    >
                      Max
                    </button>
                    
                    <button
                      onClick={handleWithdraw}
                      disabled={isWithdrawing || !withdrawAmount}
                      className="px-8 py-3 bg-electric-lime text-jet-black rounded-lg font-semibold hover:bg-electric-lime/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isWithdrawing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Withdrawing...
                        </>
                      ) : (
                        'Withdraw'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <div className="bg-gradient-to-r from-neon-magenta/10 to-electric-lime/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">How It Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Deposit Tokens",
                  description: "Connect your wallet and deposit VLFI tokens to start earning interest immediately."
                },
                {
                  step: "2", 
                  title: "Earn Real-Time Interest",
                  description: "Watch your balance grow in real-time with our transparent interest calculation system."
                },
                {
                  step: "3",
                  title: "Withdraw Anytime",
                  description: "Access your funds plus earned interest whenever you need them, with no lock-up periods."
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
