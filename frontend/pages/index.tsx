import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Zap, Shield, TrendingUp, Users, Sparkles } from 'lucide-react'
import InterestAccrualDisplay from '../components/InterestAccrualDisplay'
import { useRealTimeData } from '../hooks/useRealTimeData'

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  const { totalValueLocked, activeUsers, totalTransactions } = useRealTimeData()

  useEffect(() => {
    setMounted(true)
  }, [])

  const features = [
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Real-Time Yield Savings",
      description: "Earn interest on your deposits with real-time compounding and transparent APY.",
      href: "/savings"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Credit-Based Lending",
      description: "Access loans based on your on-chain credit score and DeFi activity history.",
      href: "/credit"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Ultra-Fast DEX",
      description: "Swap tokens instantly with minimal fees on Somnia's high-performance network.",
      href: "/dex"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Decentralized Governance",
      description: "Shape the future of VeloFi through community-driven proposal and voting systems.",
      href: "/governance"
    }
  ]

  const stats = [
    { label: "Total Value Locked", value: `$${totalValueLocked.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" /> },
    { label: "Active Users", value: activeUsers.toLocaleString(), icon: <Users className="w-5 h-5" /> },
    { label: "Total Transactions", value: totalTransactions.toLocaleString(), icon: <Zap className="w-5 h-5" /> }
  ]

  if (!mounted) return null

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gunmetal-gray via-jet-black to-gunmetal-gray">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Image
                  src="/Logo.png"
                  alt="VeloFi Logo"
                  width={80}
                  height={80}
                  className="animate-pulse rounded-xl"
                  priority
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-electric-lime rounded-full animate-ping" />
              </div>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-neon-magenta via-electric-lime to-neon-magenta bg-clip-text text-transparent">
              VeloFi
            </h1>
            
            <p className="text-xl lg:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
              The next-generation DeFi ecosystem on Somnia Network featuring 
              <span className="text-neon-magenta font-semibold"> real-time yield savings</span>, 
              <span className="text-electric-lime font-semibold"> credit-based lending</span>, and 
              <span className="text-neon-magenta font-semibold"> ultra-fast DEX</span> with 
              seamless user experiences.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/savings">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-lg font-semibold text-jet-black hover:shadow-lg hover:shadow-neon-magenta/25 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Start Earning
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              
              <Link href="/dex">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 border-2 border-neon-magenta text-neon-magenta rounded-lg font-semibold hover:bg-neon-magenta hover:text-jet-black transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Explore DEX
                  <Zap className="w-5 h-5" />
                </motion.button>
              </Link>
            </div>

            {/* Live Interest Display */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-jet-black/50 backdrop-blur-sm border border-neon-magenta/20 rounded-xl p-6 max-w-lg mx-auto"
            >
              <InterestAccrualDisplay />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-jet-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center p-6 bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 hover:border-electric-lime/30 transition-all duration-300"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-neon-magenta/20 rounded-lg text-neon-magenta">
                    {stat.icon}
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-neon-magenta to-electric-lime bg-clip-text text-transparent">
              Comprehensive DeFi Suite
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Experience the full spectrum of decentralized finance with our integrated platform,
              designed for seamless interactions and maximum efficiency.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Link key={feature.title} href={feature.href}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="group p-8 bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 hover:border-electric-lime/40 transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0 p-4 bg-neon-magenta/20 rounded-xl text-neon-magenta group-hover:bg-electric-lime/20 group-hover:text-electric-lime transition-all duration-300">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-electric-lime transition-colors duration-300">
                        {feature.title}
                      </h3>
                      <p className="text-gray-300 leading-relaxed mb-4">
                        {feature.description}
                      </p>
                      <div className="flex items-center gap-2 text-neon-magenta group-hover:text-electric-lime transition-colors duration-300">
                        <span className="font-semibold">Learn More</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-neon-magenta/10 to-electric-lime/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Experience the Future of DeFi?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of users who trust VeloFi for their decentralized finance needs.
              Start earning, trading, and governing with confidence.
            </p>
            <Link href="/signin">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-12 py-4 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-lg font-semibold text-jet-black text-lg hover:shadow-xl hover:shadow-neon-magenta/30 transition-all duration-300"
              >
                Get Started Now
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
