import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// Define Somnia Network
export const somniaTestnet = {
  id: 50311,
  name: 'Somnia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.somnia.network'],
      webSocket: ['wss://testnet-rpc.somnia.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://explorer-testnet.somnia.network',
    },
  },
  testnet: true,
} as const

// WalletConnect project ID (replace with your actual project ID)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

// Create wagmi config
export const config = createConfig({
  chains: [somniaTestnet, mainnet, sepolia],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId,
      metadata: {
        name: 'VeloFi',
        description: 'Next-generation DeFi ecosystem on Somnia Network',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://velofi.com',
        icons: ['/favicon.ico'],
      },
    }),
  ],
  transports: {
    [somniaTestnet.id]: http('https://testnet-rpc.somnia.network'),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: true,
})

// Network configuration
export const SUPPORTED_CHAINS = [somniaTestnet.id, mainnet.id, sepolia.id]
export const DEFAULT_CHAIN = somniaTestnet

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  [somniaTestnet.id]: {
    SAVINGS: process.env.NEXT_PUBLIC_SAVINGS_CONTRACT as `0x${string}`,
    CREDIT_SCORE: process.env.NEXT_PUBLIC_CREDIT_SCORE_CONTRACT as `0x${string}`,
    LENDING: process.env.NEXT_PUBLIC_LENDING_CONTRACT as `0x${string}`,
    EXCHANGE: process.env.NEXT_PUBLIC_EXCHANGE_CONTRACT as `0x${string}`,
    LIQUIDITY_POOL: process.env.NEXT_PUBLIC_LIQUIDITY_POOL_CONTRACT as `0x${string}`,
    GOVERNANCE: process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT as `0x${string}`,
    MOCK_TOKEN: process.env.NEXT_PUBLIC_MOCK_TOKEN_ADDRESS as `0x${string}`,
  },
  // Add other networks as needed
} as const

// Token configurations
export const TOKENS = {
  [somniaTestnet.id]: {
    VLFI: {
      address: process.env.NEXT_PUBLIC_MOCK_TOKEN_ADDRESS as `0x${string}`,
      symbol: 'VLFI',
      name: 'VeloFi Token',
      decimals: 18,
      logoURI: '/tokens/vlfi.png',
    },
    ETH: {
      address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      symbol: 'ETH',
      name: 'Ether',
      decimals: 18,
      logoURI: '/tokens/eth.png',
    },
  },
} as const

// API endpoints
export const API_ENDPOINTS = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  WEBSOCKET_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
} as const

// Application constants
export const APP_CONFIG = {
  NAME: 'VeloFi',
  DESCRIPTION: 'Next-generation DeFi ecosystem',
  VERSION: '1.0.0',
  GITHUB_URL: 'https://github.com/velofi/velofi-protocol',
  DOCS_URL: 'https://docs.velofi.com',
  DISCORD_URL: 'https://discord.gg/velofi',
  TWITTER_URL: 'https://twitter.com/velofi',
} as const

// Feature flags
export const FEATURES = {
  GOVERNANCE_ENABLED: process.env.NEXT_PUBLIC_GOVERNANCE_ENABLED === 'true',
  LENDING_ENABLED: process.env.NEXT_PUBLIC_LENDING_ENABLED === 'true',
  DEX_ENABLED: process.env.NEXT_PUBLIC_DEX_ENABLED === 'true',
  CREDIT_SCORING_ENABLED: process.env.NEXT_PUBLIC_CREDIT_SCORING_ENABLED === 'true',
} as const

// UI Configuration
export const UI_CONFIG = {
  THEME: {
    COLORS: {
      PRIMARY: '#FF00AA', // neon-magenta
      SECONDARY: '#CCFF00', // electric-lime
      BACKGROUND: '#0D0D0D', // jet-black
      SURFACE: '#1F1F1F', // gunmetal-gray
    },
    ANIMATION_DURATION: 300,
  },
  POLLING_INTERVALS: {
    BALANCE_UPDATE: 10000, // 10 seconds
    PRICE_UPDATE: 5000, // 5 seconds
    TRANSACTION_STATUS: 2000, // 2 seconds
  },
} as const
