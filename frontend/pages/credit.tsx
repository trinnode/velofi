import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, TrendingUp, Shield, AlertCircle, CheckCircle, Users, Target, Award } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useContract } from '../hooks/useContract'
import { useRealTimeData } from '../hooks/useRealTimeData'
import { formatEther, parseEther } from 'viem'
import { toast } from 'react-hot-toast'
import ConnectWalletButton from '../components/ConnectWalletButton'

export default function CreditPage() {
  const { address, isConnected } = useAccount()
  const [mounted, setMounted] = useState(false)

  const { creditScoreContract } = useContract()
  const { creditData } = useRealTimeData()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return 'text-electric-lime'
    if (score >= 600) return 'text-yellow-500'
    if (score >= 400) return 'text-orange-500'
    return 'text-red-500'
  }

  const getCreditScoreGrade = (score: number) => {
    if (score >= 800) return 'Excellent'
    if (score >= 750) return 'Very Good'
    if (score >= 700) return 'Good'
    if (score >= 650) return 'Fair'
    if (score >= 600) return 'Poor'
    return 'Very Poor'
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-electric-lime/20 rounded-full">
              <CreditCard className="w-12 h-12 text-electric-lime" />
            </div>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-electric-lime to-neon-magenta bg-clip-text text-transparent">
            On-Chain Credit Scoring
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Build your creditworthiness through transparent on-chain activities. 
            Your DeFi interactions contribute to a verifiable credit profile.
          </p>
        </motion.div>

        {/* Credit Score Overview */}
        {isConnected && address ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-12"
            >
              <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-electric-lime/20 p-8">
                <div className="text-center mb-8">
                  <div className="text-6xl font-bold mb-2 flex items-center justify-center gap-4">
                    <span className={getCreditScoreColor(creditData.userScore)}>
                      {creditData.userScore}
                    </span>
                    <div className="text-right">
                      <div className="text-lg font-medium text-gray-300">
                        {getCreditScoreGrade(creditData.userScore)}
                      </div>
                      <div className="text-sm text-gray-400">Credit Grade</div>
                    </div>
                  </div>
                  <div className="text-gray-400 mb-6">Your Current Credit Score</div>
                  
                  {/* Credit Score Gauge */}
                  <div className="max-w-md mx-auto">
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-electric-lime to-neon-magenta h-3 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(creditData.userScore / 850 * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-gray-400 mt-2">
                      <span>300</span>
                      <span>850</span>
                    </div>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    {
                      title: "Payment History",
                      score: creditData.paymentHistory || 0,
                      weight: "35%",
                      icon: <CheckCircle className="w-5 h-5" />
                    },
                    {
                      title: "Credit Utilization", 
                      score: creditData.creditUtilization || 0,
                      weight: "30%",
                      icon: <Target className="w-5 h-5" />
                    },
                    {
                      title: "Account Age",
                      score: creditData.accountAge || 0, 
                      weight: "20%",
                      icon: <Shield className="w-5 h-5" />
                    },
                    {
                      title: "Protocol Activity",
                      score: creditData.protocolActivity || 0,
                      weight: "15%",
                      icon: <Award className="w-5 h-5" />
                    }
                  ].map((factor, index) => (
                    <div key={factor.title} className="bg-jet-black/30 rounded-lg p-6 border border-gray-700">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="text-electric-lime">{factor.icon}</div>
                        <span className="text-sm font-medium text-gray-300">{factor.title}</span>
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">{factor.score}</div>
                      <div className="text-xs text-gray-400">{factor.weight} of score</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Credit Building Activities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12"
            >
              {/* Recent Activity */}
              <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-neon-magenta" />
                  Recent Activity
                </h2>
                
                <div className="space-y-4">
                  {creditData.recentActivity?.length > 0 ? (
                    creditData.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-jet-black/30 rounded-lg border border-gray-700">
                        <div className="w-10 h-10 bg-neon-magenta/20 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-neon-magenta" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-white">{activity.action}</div>
                          <div className="text-sm text-gray-400">{activity.date}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-electric-lime font-medium">+{activity.points}</div>
                          <div className="text-xs text-gray-400">points</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                      <p className="mb-4">No recent activity found</p>
                      <p className="text-sm">Start using VeloFi services to build your credit score</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Credit Building Tips */}
              <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-electric-lime/20 p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Shield className="w-6 h-6 text-electric-lime" />
                  Build Your Score
                </h2>
                
                <div className="space-y-6">
                  {[
                    {
                      title: "Make Timely Payments",
                      description: "Always repay loans on time to improve payment history",
                      points: "+50 points",
                      icon: <CheckCircle className="w-5 h-5 text-green-500" />
                    },
                    {
                      title: "Maintain Low Utilization",
                      description: "Keep your credit usage below 30% of available credit",
                      points: "+30 points",
                      icon: <Target className="w-5 h-5 text-blue-500" />
                    },
                    {
                      title: "Diversify Protocol Usage", 
                      description: "Use multiple VeloFi services to show diverse activity",
                      points: "+25 points",
                      icon: <Award className="w-5 h-5 text-purple-500" />
                    },
                    {
                      title: "Long-term Participation",
                      description: "Longer account age shows stability and reliability",
                      points: "+40 points",
                      icon: <Shield className="w-5 h-5 text-electric-lime" />
                    }
                  ].map((tip, index) => (
                    <div key={tip.title} className="flex gap-4 p-4 bg-jet-black/30 rounded-lg border border-gray-700">
                      <div className="flex-shrink-0">
                        {tip.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{tip.title}</h3>
                        <p className="text-sm text-gray-400 mb-2">{tip.description}</p>
                        <div className="text-xs text-electric-lime font-medium">{tip.points}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Score History Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-12"
            >
              <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-gray-700/50 p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-neon-magenta" />
                  Score History
                </h2>
                
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg">
                  <div className="text-center text-gray-400">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <p className="text-lg">Score history chart will be displayed here</p>
                    <p className="text-sm mt-2">Build your credit history through platform usage</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        ) : (
          /* Not Connected State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center mb-12"
          >
            <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-gray-700 p-12">
              <CreditCard className="w-24 h-24 mx-auto mb-6 text-gray-500" />
              <h2 className="text-3xl font-bold text-white mb-4">Connect to View Your Credit Score</h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                Connect your wallet to access your personalized credit profile and start building your on-chain creditworthiness.
              </p>
              <ConnectWalletButton 
                variant="primary"
                size="lg"
                className="w-auto"
              />
            </div>
          </motion.div>
        )}

        {/* Network Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              {
                title: "Average Network Score",
                value: "682",
                change: "+15 this month",
                icon: <Users className="w-6 h-6" />,
                color: "neon-magenta"
              },
              {
                title: "Total Scored Users", 
                value: "12,847",
                change: "+342 this week",
                icon: <Shield className="w-6 h-6" />,
                color: "electric-lime"
              },
              {
                title: "Credit Events Processed",
                value: "1.2M+",
                change: "All time",
                icon: <Award className="w-6 h-6" />,
                color: "neon-magenta"
              }
            ].map((stat, index) => (
              <div key={stat.title} className="bg-jet-black/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-neon-magenta/30 transition-all duration-300">
                <div className={`flex items-center gap-3 mb-4 text-${stat.color}`}>
                  {stat.icon}
                  <span className="text-sm font-medium text-gray-300">{stat.title}</span>
                </div>
                <div className="text-2xl font-bold text-white mb-2">{stat.value}</div>
                <div className={`text-sm text-${stat.color}`}>{stat.change}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* How Credit Scoring Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="bg-gradient-to-r from-electric-lime/10 to-neon-magenta/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">How On-Chain Credit Scoring Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Track On-Chain Activity",
                  description: "Your DeFi transactions, loan payments, and protocol interactions are recorded transparently on-chain."
                },
                {
                  step: "2",
                  title: "Calculate Credit Factors",
                  description: "Payment history, utilization rates, account age, and activity diversity are weighted to determine your score."
                },
                {
                  step: "3",
                  title: "Real-Time Updates",
                  description: "Your credit score updates in real-time as you interact with VeloFi protocols, providing immediate feedback."
                }
              ].map((item, index) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-electric-lime to-neon-magenta rounded-full flex items-center justify-center text-jet-black font-bold text-xl mx-auto mb-4">
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
