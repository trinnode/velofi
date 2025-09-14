import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Bell,
  Settings,
  Menu,
  X,
  Home,
  Zap,
  Shield,
  Vote,
  Activity,
  PieChart,
  Target
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { useRealTimeData } from '../hooks/useRealTimeData'

export default function Dashboard() {
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const { isConnected, address } = useAccount()
  const { totalValueLocked, activeUsers, totalTransactions } = useRealTimeData()

  useEffect(() => {
    setMounted(true)
  }, [])

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: <Home className="w-5 h-5" />, active: true },
    { id: 'savings', label: 'Savings', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'dex', label: 'DEX Trading', icon: <Zap className="w-5 h-5" /> },
    { id: 'lending', label: 'Lending', icon: <Shield className="w-5 h-5" /> },
    { id: 'governance', label: 'Governance', icon: <Vote className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
  ]

  const portfolioStats = [
    {
      title: 'Total Portfolio Value',
      value: '$24,567.89',
      change: '+12.34%',
      positive: true,
      icon: <DollarSign className="w-6 h-6" />
    },
    {
      title: 'Active Savings',
      value: '$15,420.50',
      change: '+8.91%',
      positive: true,
      icon: <TrendingUp className="w-6 h-6" />
    },
    {
      title: 'DEX Volume (24h)',
      value: '$3,845.20',
      change: '+23.45%',
      positive: true,
      icon: <Zap className="w-6 h-6" />
    },
    {
      title: 'Lending Balance',
      value: '$5,302.19',
      change: '-2.15%',
      positive: false,
      icon: <Shield className="w-6 h-6" />
    }
  ]

  const recentActivities = [
    {
      type: 'deposit',
      action: 'Deposited to Savings',
      amount: '+$1,250.00',
      timestamp: '2 hours ago',
      positive: true
    },
    {
      type: 'swap',
      action: 'Swapped USDC → ETH',
      amount: '$890.45',
      timestamp: '4 hours ago',
      positive: true
    },
    {
      type: 'loan',
      action: 'Loan Repayment',
      amount: '-$500.00',
      timestamp: '1 day ago',
      positive: false
    },
    {
      type: 'governance',
      action: 'Voted on Proposal #42',
      amount: '100 VELO',
      timestamp: '2 days ago',
      positive: true
    }
  ]

  const quickActions = [
    { label: 'Deposit Funds', icon: <ArrowUpRight className="w-5 h-5" />, color: 'electric-lime' },
    { label: 'Quick Swap', icon: <Zap className="w-5 h-5" />, color: 'neon-magenta' },
    { label: 'Request Loan', icon: <Shield className="w-5 h-5" />, color: 'electric-lime' },
    { label: 'View Proposals', icon: <Vote className="w-5 h-5" />, color: 'neon-magenta' }
  ]

  if (!mounted) return null

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gunmetal-gray flex items-center justify-center">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-jet-black/50 backdrop-blur-sm border border-neon-magenta/20 rounded-xl p-8"
          >
            <Wallet className="w-16 h-16 text-neon-magenta mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300 mb-6">Please connect your wallet to access the dashboard</p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gunmetal-gray">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-jet-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: sidebarOpen ? 0 : '-100%'
        }}
        className="fixed left-0 top-0 h-full w-64 bg-jet-black border-r border-neon-magenta/20 z-50 lg:translate-x-0 lg:static lg:z-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold bg-gradient-to-r from-neon-magenta to-electric-lime bg-clip-text text-transparent">
              VeloFi
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-2">
            {sidebarItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveTab(item.id)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/30'
                    : 'text-gray-400 hover:text-white hover:bg-gunmetal-gray/50'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </motion.button>
            ))}
          </nav>

          {/* User Profile Section */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <div className="flex items-center gap-3 p-3 bg-gunmetal-gray/50 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-full flex items-center justify-center">
                <span className="text-jet-black font-semibold text-sm">
                  {address?.slice(2, 4).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
                <p className="text-gray-400 text-xs">Connected</p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-jet-black/50 backdrop-blur-sm border-b border-neon-magenta/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-400 hover:text-white"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-400">Welcome back to VeloFi</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-gray-400 hover:text-neon-magenta transition-colors duration-200 relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-electric-lime rounded-full animate-pulse" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-gray-400 hover:text-neon-magenta transition-colors duration-200"
              >
                <Settings className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Portfolio Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {portfolioStats.map((stat, index) => (
                  <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-gradient-to-br from-gunmetal-gray to-jet-black p-6 rounded-xl border border-neon-magenta/20 hover:border-electric-lime/30 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-neon-magenta/20 rounded-lg text-neon-magenta">
                        {stat.icon}
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${
                        stat.positive ? 'text-electric-lime' : 'text-red-400'
                      }`}>
                        {stat.positive ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        <span>{stat.change}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                      <p className="text-gray-400 text-sm">{stat.title}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black p-6 rounded-xl border border-neon-magenta/20">
                <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => (
                    <motion.button
                      key={action.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`p-4 rounded-lg border-2 border-${action.color}/20 hover:border-${action.color}/40 bg-${action.color}/10 hover:bg-${action.color}/20 transition-all duration-300 text-center group`}
                    >
                      <div className={`inline-flex p-3 rounded-lg bg-${action.color}/20 text-${action.color} mb-3 group-hover:scale-110 transition-transform duration-200`}>
                        {action.icon}
                      </div>
                      <p className="text-white font-medium text-sm">{action.label}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activities */}
                <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black p-6 rounded-xl border border-neon-magenta/20">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Recent Activities</h3>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      className="text-neon-magenta hover:text-electric-lime transition-colors duration-200 text-sm"
                    >
                      View All
                    </motion.button>
                  </div>
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-jet-black/50 rounded-lg hover:bg-jet-black/70 transition-colors duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.positive ? 'bg-electric-lime' : 'bg-red-400'
                          }`} />
                          <div>
                            <p className="text-white font-medium text-sm">{activity.action}</p>
                            <p className="text-gray-400 text-xs">{activity.timestamp}</p>
                          </div>
                        </div>
                        <span className={`font-semibold text-sm ${
                          activity.positive ? 'text-electric-lime' : 'text-red-400'
                        }`}>
                          {activity.amount}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Portfolio Distribution Chart Placeholder */}
                <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black p-6 rounded-xl border border-neon-magenta/20">
                  <h3 className="text-xl font-bold text-white mb-6">Portfolio Distribution</h3>
                  <div className="flex items-center justify-center h-48">
                    <div className="text-center">
                      <PieChart className="w-16 h-16 text-neon-magenta mx-auto mb-4" />
                      <p className="text-gray-400">Chart visualization coming soon</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-gunmetal-gray to-jet-black p-6 rounded-xl border border-neon-magenta/20 text-center"
                >
                  <div className="p-3 bg-electric-lime/20 rounded-lg inline-flex mb-4">
                    <DollarSign className="w-6 h-6 text-electric-lime" />
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">
                    ${totalValueLocked.toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-sm">Total Value Locked</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-gunmetal-gray to-jet-black p-6 rounded-xl border border-neon-magenta/20 text-center"
                >
                  <div className="p-3 bg-neon-magenta/20 rounded-lg inline-flex mb-4">
                    <Users className="w-6 h-6 text-neon-magenta" />
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">
                    {activeUsers.toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-sm">Active Users</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-gunmetal-gray to-jet-black p-6 rounded-xl border border-neon-magenta/20 text-center"
                >
                  <div className="p-3 bg-electric-lime/20 rounded-lg inline-flex mb-4">
                    <Activity className="w-6 h-6 text-electric-lime" />
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">
                    {totalTransactions.toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-sm">Total Transactions</p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Other tab content would go here */}
          {activeTab !== 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black p-8 rounded-xl border border-neon-magenta/20 inline-block">
                <div className="p-4 bg-neon-magenta/20 rounded-lg inline-flex mb-4">
                  <Target className="w-8 h-8 text-neon-magenta" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  {sidebarItems.find(item => item.id === activeTab)?.label} Coming Soon
                </h3>
                <p className="text-gray-400 max-w-md">
                  This section is currently under development. Stay tuned for amazing features!
                </p>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  )
}