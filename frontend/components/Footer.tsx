import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Github, Twitter, MessageCircle, Mail, Heart, ExternalLink } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const socialLinks = [
    {
      name: 'GitHub',
      href: 'https://github.com/trinnode/velofi',
      icon: <Github className="w-5 h-5" />
    },
    {
      name: 'Twitter',
      href: 'https://twitter.com/_trinnex',
      icon: <Twitter className="w-5 h-5" />
    },
    {
      name: 'Discord',
      href: 'https://discord.gg/trinnex',
      icon: <MessageCircle className="w-5 h-5" />
    },
    {
      name: 'Email',
      href: 'mailto:trinnextrin404nex@gmail.com',
      icon: <Mail className="w-5 h-5" />
    }
  ]

  const quickLinks = [
    { name: 'Documentation', href: 'https://github.com/trinnode/velofi/blob/main/README.md' },
    { name: 'Security', href: 'https://github.com/trinnode/velofi/blob/main/README.md' },
    { name: 'Terms of Service', href: 'https://github.com/trinnode/velofi/blob/main/README.md' },
    { name: 'Privacy Policy', href: 'https://github.com/trinnode/velofi/blob/main/README.md' }
  ]

  const productLinks = [
    { name: 'Savings', href: '/savings' },
    { name: 'Credit Scoring', href: '/credit' },
    { name: 'DEX Trading', href: '/dex' },
    { name: 'Governance', href: '/governance' }
  ]

  const resourceLinks = [
    { name: 'Whitepaper', href: 'https://github.com/trinnode/velofi/blob/main/README.md' },
    { name: 'API Documentation', href: '/api-docs' },
    { name: 'Bug Reports', href: '/bugs' },
    { name: 'Feature Requests', href: '/features' }
  ]

  return (
    <footer className="bg-jet-black border-t border-gunmetal-gray/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 group">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Image
                  src="/Logo.png"
                  alt="VeloFi Logo"
                  width={40}
                  height={40}
                  className="rounded-lg"
                  priority
                />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-neon-magenta to-electric-lime bg-clip-text text-transparent">
                VeloFi
              </span>
            </Link>
            
            <p className="text-gray-300 mb-6 leading-relaxed max-w-md">
              The next-generation DeFi ecosystem built on Somnia Network. 
              Experience lightning-fast transactions, real-time yields, and transparent on-chain credit scoring.
            </p>

            <div className="flex items-center gap-4">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gunmetal-gray/50 hover:bg-neon-magenta/20 rounded-lg flex items-center justify-center text-gray-400 hover:text-neon-magenta transition-all duration-300"
                  aria-label={link.name}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-white font-semibold mb-4">Products</h3>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-electric-lime transition-colors duration-300 flex items-center gap-2 group"
                  >
                    {link.name}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-electric-lime transition-colors duration-300 flex items-center gap-2 group"
                  >
                    {link.name}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-electric-lime transition-colors duration-300 flex items-center gap-2 group"
                  >
                    {link.name}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Network Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 pt-8 border-t border-gunmetal-gray/50"
        >
          <div className="bg-gradient-to-r from-electric-lime/10 to-neon-magenta/10 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <div className="text-white font-medium">Somnia Network Status</div>
                  <div className="text-gray-400 text-sm">All systems operational</div>
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-electric-lime font-medium">99.9%</div>
                  <div className="text-gray-400">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-electric-lime font-medium">&lt;100ms</div>
                  <div className="text-gray-400">Latency</div>
                </div>
                <div className="text-center">
                  <div className="text-electric-lime font-medium">2.1M+</div>
                  <div className="text-gray-400">Transactions</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gunmetal-gray/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <span>© {currentYear} VeloFi Protocol. Built with</span>
            <Heart className="w-4 h-4 text-red-500 animate-pulse" />
            <span>on Somnia Network</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-400">
            <span>Version 1.0.0</span>
            <span>•</span>
            <span>Chain ID: 50311</span>
            <span>•</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-electric-lime rounded-full animate-pulse"></div>
              <span>Testnet</span>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-8 pt-6 border-t border-gunmetal-gray/20">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong>Disclaimer:</strong> VeloFi is experimental DeFi software. Users interact with smart contracts at their own risk. 
            This platform has not been audited and may contain bugs or vulnerabilities. Never invest more than you can afford to lose. 
            Past performance does not guarantee future results. Always conduct your own research before participating in any DeFi protocol.
          </p>
        </div>
      </div>
    </footer>
  )
}
