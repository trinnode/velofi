import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Users, Award } from 'lucide-react'
import { useRealTimeData } from '../hooks/useRealTimeData'

export default function AnalyticsPage() {
  const { totalValueLocked, activeUsers, totalTransactions, dexData } = useRealTimeData()

  useEffect(() => {
    // Track analytics page view
    // Replace with real analytics integration
    console.log('[Analytics] page_view', { page: 'analytics' })
  }, [])

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-neon-magenta/20 rounded-full">
              <BarChart3 className="w-12 h-12 text-neon-magenta" />
            </div>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-neon-magenta to-electric-lime bg-clip-text text-transparent">
            Platform Analytics
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Explore real-time metrics and trends across VeloFi&apos;s DeFi ecosystem.
          </p>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[{
            title: 'Total Value Locked',
            value: `$${totalValueLocked.toLocaleString()}`,
            icon: <TrendingUp className="w-6 h-6" />, color: 'electric-lime'
          }, {
            title: 'Active Users',
            value: activeUsers.toLocaleString(),
            icon: <Users className="w-6 h-6" />, color: 'neon-magenta'
          }, {
            title: 'Total Transactions',
            value: totalTransactions.toLocaleString(),
            icon: <Award className="w-6 h-6" />, color: 'electric-lime'
          }, {
            title: 'DEX Volume (24h)',
            value: `${dexData.volume24h} VLFI`,
            icon: <BarChart3 className="w-6 h-6" />, color: 'neon-magenta'
          }].map((stat, idx) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="bg-jet-black/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-neon-magenta/30 transition-all duration-300"
            >
              <div className={`flex items-center gap-3 mb-4 text-${stat.color}`}>
                {stat.icon}
                <span className="text-sm font-medium text-gray-300">{stat.title}</span>
              </div>
              <div className="text-2xl font-bold text-white mb-2">{stat.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Placeholder for charts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-electric-lime/20 p-8 mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-electric-lime" />
            Real-Time Charts
          </h2>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg">
            <div className="text-center text-gray-400">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <p className="text-lg">Analytics charts will be displayed here</p>
              <p className="text-sm mt-2">Integrate Recharts or other libraries for advanced visualizations</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
