// Network configuration utilities
export const NETWORK_CONFIG = {
  SOMNIA_TESTNET: {
    id: 50311,
    name: 'Somnia Testnet',
    symbol: 'ETH',
    rpcUrl: 'https://testnet-rpc.somnia.network',
    blockExplorer: 'https://explorer-testnet.somnia.network',
  },
  ETHEREUM_MAINNET: {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io',
  },
} as const

// Contract addresses (should be moved to environment variables)
export const CONTRACT_ADDRESSES = {
  SAVINGS: process.env.NEXT_PUBLIC_SAVINGS_CONTRACT as `0x${string}`,
  LENDING: process.env.NEXT_PUBLIC_LENDING_CONTRACT as `0x${string}`,
  EXCHANGE: process.env.NEXT_PUBLIC_EXCHANGE_CONTRACT as `0x${string}`,
  GOVERNANCE: process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT as `0x${string}`,
  CREDIT_SCORE: process.env.NEXT_PUBLIC_CREDIT_SCORE_CONTRACT as `0x${string}`,
  MOCK_TOKEN: process.env.NEXT_PUBLIC_MOCK_TOKEN_ADDRESS as `0x${string}`,
} as const

// App constants
export const APP_CONFIG = {
  APP_NAME: 'VeloFi',
  APP_DESCRIPTION: 'Next-Generation DeFi Platform',
  SOCIAL_LINKS: {
    twitter: 'https://twitter.com/velofi',
    discord: 'https://discord.gg/velofi',
    github: 'https://github.com/velofi',
    telegram: 'https://t.me/velofi',
  },
  DOCS_URL: 'https://docs.velofi.com',
  SUPPORT_EMAIL: 'support@velofi.com',
} as const

// UI constants
export const UI_CONFIG = {
  TOAST_DURATION: 5000,
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 500,
  MAX_SLIPPAGE: 5, // 5%
  DEFAULT_DEADLINE: 20, // 20 minutes
} as const

// Validation patterns
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ADDRESS_REGEX: /^0x[a-fA-F0-9]{40}$/,
  POSITIVE_NUMBER: /^\d*\.?\d+$/,
  PERCENTAGE: /^(100(\.0{1,2})?|[1-9]?\d(\.\d{1,2})?)$/,
} as const

// Error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet to continue',
  INSUFFICIENT_BALANCE: 'Insufficient balance for this transaction',
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INVALID_AMOUNT: 'Please enter a valid amount',
  USER_REJECTED: 'Transaction was rejected by user',
  CONTRACT_ERROR: 'Smart contract error occurred',
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  WALLET_CONNECTED: 'Wallet connected successfully!',
  TRANSACTION_SUCCESS: 'Transaction completed successfully!',
  SIGN_IN_SUCCESS: 'Successfully signed in!',
  SIGN_OUT_SUCCESS: 'Successfully signed out!',
} as const

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'velofi_theme',
  LANGUAGE: 'velofi_language',
  SLIPPAGE: 'velofi_slippage',
  DEADLINE: 'velofi_deadline',
  DISMISSED_NOTIFICATIONS: 'velofi_dismissed_notifications',
} as const

export default {
  NETWORK_CONFIG,
  CONTRACT_ADDRESSES,
  APP_CONFIG,
  UI_CONFIG,
  VALIDATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STORAGE_KEYS,
}
