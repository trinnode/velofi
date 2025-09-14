import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { 
  ArrowRight, 
  Zap, 
  Shield, 
  TrendingUp, 
  Users, 
  Star,
  BarChart3,
  Globe,
  Sparkles,
  Award,
  Target,
  DollarSign
} from 'lucide-react'
import InterestAccrualDisplay from '../components/InterestAccrualDisplay'
import { useRealTimeData } from '../hooks/useRealTimeData'

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const heroRef = useRef(null)
  const { totalValueLocked, activeUsers, totalTransactions } = useRealTimeData()
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })
  
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "DeFi Trader",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      content: "VeloFi's real-time yield savings changed my investment strategy. Watching interest compound live is incredible!",
      rating: 5
    },
    {
      name: "Marcus Rodriguez",
      role: "Crypto Investor", 
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      content: "The credit system helped me get my first DeFi loan without traditional banking. Revolutionary platform!",
      rating: 5
    },
    {
      name: "Emily Johnson",
      role: "Yield Farmer",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face", 
      content: "Lightning-fast swaps and incredible APY. VeloFi is my go-to DeFi platform for everything.",
      rating: 5
    }
  ]

  const achievements = [
    {
      icon: <Award className="w-6 h-6" />,
      title: "Best DeFi Innovation 2025",
      description: "Awarded by Crypto Awards"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Security Audited",
      description: "Certified by leading firms"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "24/7 Global Access",
      description: "Available worldwide"
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "99.9% Uptime",
      description: "Reliable performance"
    }
  ]

  useEffect(() => {
    setMounted(true)
    
    // Auto-rotate testimonials
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [testimonials.length])

  const features = [
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Real-Time Yield Savings",
      description: "Earn interest on your deposits with real-time compounding and transparent APY. Watch your money grow with every second.",
      href: "/savings",
      gradient: "from-electric-lime to-neon-magenta",
      benefits: ["Up to 12% APY", "Instant compound", "No lock period"]
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Credit-Based Lending",
      description: "Access loans based on your on-chain credit score and DeFi activity history. Build your reputation and unlock better rates.",
      href: "/credit",
      gradient: "from-neon-magenta to-electric-lime",
      benefits: ["Dynamic rates", "Credit building", "Instant approval"]
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Ultra-Fast DEX",
      description: "Swap tokens instantly with minimal fees on Somnia's high-performance network. Experience lightning-fast trades.",
      href: "/dex",
      gradient: "from-electric-lime via-neon-magenta to-electric-lime",
      benefits: ["0.1% fees", "Sub-second trades", "Deep liquidity"]
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Decentralized Governance",
      description: "Shape the future of VeloFi through community-driven proposal and voting systems. Your voice matters.",
      href: "/governance",
      gradient: "from-neon-magenta via-electric-lime to-neon-magenta",
      benefits: ["Vote on proposals", "Earn rewards", "Shape the future"]
    }
  ]

  const stats = [
    { 
      label: "Total Value Locked", 
      value: `$${totalValueLocked.toLocaleString()}`, 
      icon: <DollarSign className="w-5 h-5" />,
      change: "+12.5%",
      period: "24h"
    },
    { 
      label: "Active Users", 
      value: activeUsers.toLocaleString(), 
      icon: <Users className="w-5 h-5" />,
      change: "+8.3%",
      period: "7d"
    },
    { 
      label: "Total Transactions", 
      value: totalTransactions.toLocaleString(), 
      icon: <BarChart3 className="w-5 h-5" />,
      change: "+24.7%",
      period: "24h"
    }
  ]

  if (!mounted) return null

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <motion.section 
        ref={heroRef}
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative overflow-hidden bg-gradient-to-br from-gunmetal-gray via-jet-black to-gunmetal-gray"
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-jet-black/50 to-transparent" />
        
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-electric-lime rounded-full opacity-30"
              animate={{
                x: [0, Math.random() * 100, 0],
                y: [0, Math.random() * 100, 0],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex justify-center mb-8">
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Image
                  src="/Logo.png"
                  alt="VeloFi Logo"
                  width={80}
                  height={80}
                  className="rounded-xl shadow-lg shadow-neon-magenta/25"
                  priority
                />
                <motion.div 
                  className="absolute -top-1 -right-1 w-4 h-4 bg-electric-lime rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
            </div>
            
            <motion.h1 
              className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-neon-magenta via-electric-lime to-neon-magenta bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              VeloFi
            </motion.h1>
            
            <motion.p 
              className="text-xl lg:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              The next-generation DeFi ecosystem on Somnia Network featuring 
              <span className="text-neon-magenta font-semibold"> real-time yield savings</span>, 
              <span className="text-electric-lime font-semibold"> credit-based lending</span>, and 
              <span className="text-neon-magenta font-semibold"> ultra-fast DEX</span> with 
              seamless user experiences.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <Link href="/savings">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(255, 0, 170, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-lg font-semibold text-jet-black hover:shadow-lg hover:shadow-neon-magenta/25 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Start Earning
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              
              <Link href="/dex">
                <motion.button
                  whileHover={{ scale: 1.05, borderColor: "#32D74B" }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 border-2 border-neon-magenta text-neon-magenta rounded-lg font-semibold hover:bg-neon-magenta hover:text-jet-black transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Explore DEX
                  <Zap className="w-5 h-5" />
                </motion.button>
              </Link>
            </motion.div>

            {/* Live Interest Display */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="bg-jet-black/50 backdrop-blur-sm border border-neon-magenta/20 rounded-xl p-6 max-w-lg mx-auto"
            >
              <InterestAccrualDisplay />
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

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
                whileHover={{ scale: 1.05, rotateY: 5 }}
                className="text-center p-6 bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 hover:border-electric-lime/30 transition-all duration-300 perspective-1000"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-neon-magenta/20 rounded-lg text-neon-magenta">
                    {stat.icon}
                  </div>
                </div>
                <motion.div 
                  className="text-3xl font-bold text-white mb-2"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {stat.value}
                </motion.div>
                <div className="text-gray-400 mb-2">{stat.label}</div>
                <div className="flex items-center justify-center gap-1 text-electric-lime text-sm">
                  <TrendingUp className="w-3 h-3" />
                  <span>{stat.change}</span>
                  <span className="text-gray-500">{stat.period}</span>
                </div>
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
            {features.map((feature, index) => {
              const FeatureInView = () => {
                const ref = useRef(null)
                const isInView = useInView(ref, { once: true })
                
                return (
                  <Link key={feature.title} href={{pathname: feature.href}}>
                    <motion.div
                      ref={ref}
                      initial={{ opacity: 0, y: 50 }}
                      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -5 }}
                      className="group p-8 bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 hover:border-electric-lime/40 transition-all duration-300 cursor-pointer overflow-hidden relative"
                    >
                      {/* Background gradient effect */}
                      <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                      
                      <div className="relative flex items-start gap-6">
                        <motion.div 
                          className="flex-shrink-0 p-4 bg-neon-magenta/20 rounded-xl text-neon-magenta group-hover:bg-electric-lime/20 group-hover:text-electric-lime transition-all duration-300"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                        >
                          {feature.icon}
                        </motion.div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-electric-lime transition-colors duration-300">
                            {feature.title}
                          </h3>
                          <p className="text-gray-300 leading-relaxed mb-4">
                            {feature.description}
                          </p>
                          
                          {/* Benefits list */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {feature.benefits.map((benefit, idx) => (
                              <span 
                                key={idx}
                                className="px-3 py-1 bg-neon-magenta/10 text-neon-magenta text-sm rounded-full border border-neon-magenta/20"
                              >
                                {benefit}
                              </span>
                            ))}
                          </div>
                          
                          <motion.div 
                            className="flex items-center gap-2 text-neon-magenta group-hover:text-electric-lime transition-colors duration-300"
                            whileHover={{ x: 5 }}
                          >
                            <span className="font-semibold">Learn More</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                )
              }
              
              return <FeatureInView key={feature.title} />
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-r from-neon-magenta/5 to-electric-lime/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Trusted by DeFi Enthusiasts
            </h2>
            <p className="text-xl text-gray-300">
              See what our community says about VeloFi
            </p>
          </motion.div>

          <div className="relative">
            <motion.div
              key={currentTestimonial}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl p-8 border border-neon-magenta/20"
            >
              {testimonials[currentTestimonial] && (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <Image
                      src={testimonials[currentTestimonial].avatar}
                      alt={testimonials[currentTestimonial].name}
                      width={60}
                      height={60}
                      className="rounded-full"
                    />
                    <div>
                      <h4 className="text-white font-semibold">
                        {testimonials[currentTestimonial].name}
                      </h4>
                      <p className="text-gray-400">
                        {testimonials[currentTestimonial].role}
                      </p>
                    </div>
                    <div className="ml-auto flex gap-1">
                      {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-electric-lime fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-300 text-lg leading-relaxed">
                    &ldquo;{testimonials[currentTestimonial].content}&rdquo;
                  </p>
                </>
              )}
            </motion.div>

            {/* Testimonial indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentTestimonial 
                      ? 'bg-electric-lime' 
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center p-6 bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-lg border border-neon-magenta/20"
              >
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-electric-lime/20 rounded-lg text-electric-lime">
                    {achievement.icon}
                  </div>
                </div>
                <h4 className="text-white font-semibold mb-2 text-sm">
                  {achievement.title}
                </h4>
                <p className="text-gray-400 text-xs">
                  {achievement.description}
                </p>
              </motion.div>
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
            <motion.h2 
              className="text-4xl font-bold text-white mb-6"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Ready to Experience the Future of DeFi?
            </motion.h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of users who trust VeloFi for their decentralized finance needs.
              Start earning, trading, and governing with confidence.
            </p>
            <Link href="/signin">
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 20px 40px rgba(255, 0, 170, 0.4)"
                }}
                whileTap={{ scale: 0.95 }}
                className="px-12 py-4 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-lg font-semibold text-jet-black text-lg hover:shadow-xl hover:shadow-neon-magenta/30 transition-all duration-300 inline-flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Get Started Now
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
