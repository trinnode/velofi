import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  Plus,
  Minus,
  Calculator,
  Target,
  Zap,
  Shield,
  Award,
  Activity,
  Info,
  CheckCircle,
  X
} from 'lucide-react'
import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import InterestAccrualDisplay from '../components/InterestAccrualDisplay'

export default function SavingsPageEnhanced() {
  const [mounted, setMounted] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [activeTab, setActiveTab] = useState('deposit')
  const [showCalculator, setShowCalculator] = useState(false)
  const [calculatorAmount, setCalculatorAmount] = useState('1000')
  const [calculatorPeriod, setCalculatorPeriod] = useState('12')
  
  const { isConnected, address } = useAccount()
  const { data: balance } = useBalance({ address })

  // Mock data - in real app this would come from contracts/API
  const savingsData = {
    totalDeposited: 15420.50,
    currentAPY: 12.34,
    interestEarned: 1847.32,
    lastDeposit: '2024-01-10',
    nextInterestPayment: '2024-01-15',
    totalTransactions: 47
  }

  const transactions = [
    {
      id: 1,
      type: 'deposit',
      amount: 2500.00,
      timestamp: '2024-01-10 14:30',
      hash: '0x1234...5678',
      status: 'confirmed'
    },
    {
      id: 2,
      type: 'interest',
      amount: 157.83,
      timestamp: '2024-01-09 00:00',
      hash: '0x5678...9abc',
      status: 'confirmed'
    },
    {
      id: 3,
      type: 'withdraw',
      amount: -1000.00,
      timestamp: '2024-01-08 16:45',
      hash: '0x9abc...def0',
      status: 'confirmed'
    },
    {
      id: 4,
      type: 'deposit',
      amount: 5000.00,
      timestamp: '2024-01-07 10:15',
      hash: '0xdef0...1234',
      status: 'confirmed'
    }
  ]

  const apyHistory = [
    { date: '2024-01-01', apy: 11.5 },
    { date: '2024-01-02', apy: 11.8 },
    { date: '2024-01-03', apy: 12.1 },
    { date: '2024-01-04', apy: 12.0 },
    { date: '2024-01-05', apy: 12.3 },
    { date: '2024-01-06', apy: 12.4 },
    { date: '2024-01-07', apy: 12.2 },
    { date: '2024-01-08', apy: 12.5 },
    { date: '2024-01-09', apy: 12.3 },
    { date: '2024-01-10', apy: 12.34 }
  ]

  useEffect(() => {
    setMounted(true)
  }, [])

  const calculateProjectedEarnings = () => {
    const principal = parseFloat(calculatorAmount) || 0
    const periods = parseFloat(calculatorPeriod) || 0
    const apy = savingsData.currentAPY / 100
    
    const compoundFrequency = 365 // Daily compounding
    const futureValue = principal * Math.pow(1 + apy / compoundFrequency, compoundFrequency * (periods / 12))
    const earnings = futureValue - principal
    
    return { futureValue, earnings }
  }

  const { futureValue, earnings } = calculateProjectedEarnings()

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gunmetal-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-magenta to-electric-lime bg-clip-text text-transparent">
                Yield Savings
              </h1>
              <p className="text-gray-300 text-lg mt-2">
                Earn real-time interest on your deposits with transparent APY
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCalculator(!showCalculator)}
              className="px-6 py-3 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-lg font-semibold text-jet-black flex items-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              APY Calculator
            </motion.button>
          </div>

          {/* Live Interest Display */}
          <div className="bg-jet-black/50 backdrop-blur-sm border border-neon-magenta/20 rounded-xl p-6">
            <InterestAccrualDisplay />
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-gunmetal-gray to-jet-black p-6 rounded-xl border border-neon-magenta/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-electric-lime/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-electric-lime" />
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-electric-lime text-sm">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>+8.91%</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-white mb-1">
                ${savingsData.totalDeposited.toLocaleString()}
              </p>
              <p className="text-gray-400">Total Deposited</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-gunmetal-gray to-jet-black p-6 rounded-xl border border-neon-magenta/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-neon-magenta/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-neon-magenta" />
              </div>
              <div className="text-right">
                <motion.div 
                  className="text-neon-magenta text-sm font-bold"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  LIVE
                </motion.div>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-white mb-1">
                {savingsData.currentAPY}%
              </p>
              <p className="text-gray-400">Current APY</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-gunmetal-gray to-jet-black p-6 rounded-xl border border-neon-magenta/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-electric-lime/20 rounded-lg">
                <Award className="w-6 h-6 text-electric-lime" />
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-electric-lime text-sm">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>+23.5%</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-white mb-1">
                ${savingsData.interestEarned.toLocaleString()}
              </p>
              <p className="text-gray-400">Interest Earned</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-gunmetal-gray to-jet-black p-6 rounded-xl border border-neon-magenta/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-neon-magenta/20 rounded-lg">
                <Activity className="w-6 h-6 text-neon-magenta" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-white mb-1">
                {savingsData.totalTransactions}
              </p>
              <p className="text-gray-400">Total Transactions</p>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Deposit/Withdraw Interface */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-6">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => setActiveTab('deposit')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    activeTab === 'deposit'
                      ? 'bg-electric-lime text-jet-black'
                      : 'text-gray-400 hover:text-white hover:bg-gunmetal-gray/50'
                  }`}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    activeTab === 'withdraw'
                      ? 'bg-neon-magenta text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gunmetal-gray/50'
                  }`}
                >
                  Withdraw
                </button>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'deposit' && (
                  <motion.div
                    key="deposit"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div>
                      <label className="block text-white font-semibold mb-3">
                        Deposit Amount
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-4 py-4 bg-jet-black border border-neon-magenta/20 rounded-lg text-white text-xl focus:border-electric-lime/50 focus:outline-none transition-colors duration-300"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                          USDC
                        </div>
                      </div>
                      {balance && (
                        <p className="text-gray-400 text-sm mt-2">
                          Available: {parseFloat(formatEther(balance.value)).toFixed(4)} {balance.symbol}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {['25%', '50%', '100%'].map((percentage) => (
                        <button
                          key={percentage}
                          onClick={() => {
                            if (balance) {
                              const amount = parseFloat(formatEther(balance.value))
                              const percent = parseInt(percentage) / 100
                              setDepositAmount((amount * percent).toFixed(4))
                            }
                          }}
                          className="py-2 px-4 bg-neon-magenta/20 text-neon-magenta rounded-lg hover:bg-neon-magenta/30 transition-colors duration-200"
                        >
                          {percentage}
                        </button>
                      ))}
                    </div>

                    <div className="bg-jet-black/50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current APY</span>
                        <span className="text-electric-lime font-semibold">{savingsData.currentAPY}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Est. Daily Interest</span>
                        <span className="text-white">
                          ${((parseFloat(depositAmount) || 0) * savingsData.currentAPY / 100 / 365).toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Est. Monthly Interest</span>
                        <span className="text-white">
                          ${((parseFloat(depositAmount) || 0) * savingsData.currentAPY / 100 / 12).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={!depositAmount || !isConnected}
                      className="w-full py-4 bg-gradient-to-r from-electric-lime to-neon-magenta rounded-lg font-bold text-jet-black text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-electric-lime/25 transition-all duration-300"
                    >
                      {!isConnected ? 'Connect Wallet' : 'Deposit Funds'}
                    </motion.button>
                  </motion.div>
                )}

                {activeTab === 'withdraw' && (
                  <motion.div
                    key="withdraw"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div>
                      <label className="block text-white font-semibold mb-3">
                        Withdraw Amount
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-4 py-4 bg-jet-black border border-neon-magenta/20 rounded-lg text-white text-xl focus:border-neon-magenta/50 focus:outline-none transition-colors duration-300"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                          USDC
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mt-2">
                        Available: ${savingsData.totalDeposited.toLocaleString()}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {['25%', '50%', '100%'].map((percentage) => (
                        <button
                          key={percentage}
                          onClick={() => {
                            const percent = parseInt(percentage) / 100
                            setWithdrawAmount((savingsData.totalDeposited * percent).toFixed(2))
                          }}
                          className="py-2 px-4 bg-neon-magenta/20 text-neon-magenta rounded-lg hover:bg-neon-magenta/30 transition-colors duration-200"
                        >
                          {percentage}
                        </button>
                      ))}
                    </div>

                    <div className="bg-jet-black/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <Info className="w-4 h-4" />
                        <span className="text-sm">Instant withdrawal available</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Withdrawal Fee</span>
                        <span className="text-electric-lime font-semibold">0%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">You&#39;ll Receive</span>
                        <span className="text-white font-semibold">
                          ${(parseFloat(withdrawAmount) || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={!withdrawAmount || !isConnected}
                      className="w-full py-4 bg-gradient-to-r from-neon-magenta to-red-500 rounded-lg font-bold text-white text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-neon-magenta/25 transition-all duration-300"
                    >
                      {!isConnected ? 'Connect Wallet' : 'Withdraw Funds'}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Transaction History */}
            <div className="mt-8 bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-6">
              <h3 className="text-xl font-bold text-white mb-6">Transaction History</h3>
              <div className="space-y-4">
                {transactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-jet-black/50 rounded-lg hover:bg-jet-black/70 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        tx.type === 'deposit' ? 'bg-electric-lime/20 text-electric-lime' :
                        tx.type === 'withdraw' ? 'bg-red-500/20 text-red-400' :
                        'bg-neon-magenta/20 text-neon-magenta'
                      }`}>
                        {tx.type === 'deposit' ? <Plus className="w-4 h-4" /> :
                         tx.type === 'withdraw' ? <Minus className="w-4 h-4" /> :
                         <Award className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-white font-medium capitalize">
                          {tx.type === 'interest' ? 'Interest Payment' : tx.type}
                        </p>
                        <p className="text-gray-400 text-sm">{tx.timestamp}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        tx.amount > 0 ? 'text-electric-lime' : 'text-red-400'
                      }`}>
                        {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <CheckCircle className="w-3 h-3" />
                        <span>Confirmed</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* APY Calculator Modal */}
            <AnimatePresence>
              {showCalculator && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">APY Calculator</h3>
                    <button
                      onClick={() => setShowCalculator(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white font-medium mb-2">Initial Amount ($)</label>
                      <input
                        type="number"
                        value={calculatorAmount}
                        onChange={(e) => setCalculatorAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-jet-black border border-neon-magenta/20 rounded-lg text-white focus:border-electric-lime/50 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white font-medium mb-2">Time Period (months)</label>
                      <input
                        type="number"
                        value={calculatorPeriod}
                        onChange={(e) => setCalculatorPeriod(e.target.value)}
                        className="w-full px-3 py-2 bg-jet-black border border-neon-magenta/20 rounded-lg text-white focus:border-electric-lime/50 focus:outline-none"
                      />
                    </div>
                    
                    <div className="bg-jet-black/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current APY</span>
                        <span className="text-electric-lime font-semibold">{savingsData.currentAPY}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Final Amount</span>
                        <span className="text-white font-semibold">${futureValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Earnings</span>
                        <span className="text-electric-lime font-bold">${earnings.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* APY History Chart */}
            <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-6">
              <h3 className="text-xl font-bold text-white mb-6">APY History</h3>
              <div className="space-y-3">
                {apyHistory.slice(-5).map((entry) => (
                  <div key={entry.date} className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{entry.date}</span>
                    <span className="text-electric-lime font-semibold">{entry.apy}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">7-day Average</span>
                  <span className="text-neon-magenta font-bold">
                    {(apyHistory.slice(-7).reduce((sum, entry) => sum + entry.apy, 0) / 7).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-6">
              <h3 className="text-xl font-bold text-white mb-6">Why Choose VeloFi Savings?</h3>
              <div className="space-y-4">
                {[
                  { icon: <Zap className="w-5 h-5" />, title: 'Real-time Compounding', desc: 'Interest calculated every second' },
                  { icon: <Shield className="w-5 h-5" />, title: 'Secure & Audited', desc: 'Battle-tested smart contracts' },
                  { icon: <Target className="w-5 h-5" />, title: 'No Lock Period', desc: 'Withdraw anytime, no penalties' },
                  { icon: <Award className="w-5 h-5" />, title: 'Competitive APY', desc: 'Industry-leading interest rates' }
                ].map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="p-2 bg-electric-lime/20 rounded-lg text-electric-lime flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <p className="text-white font-medium">{feature.title}</p>
                      <p className="text-gray-400 text-sm">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}