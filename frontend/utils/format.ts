import { formatUnits, parseUnits } from 'viem'

/**
 * Format a balance amount for display
 */
export function formatBalance(
  balance: bigint | string | undefined,
  decimals: number = 18,
  displayDecimals: number = 6
): string {
  if (!balance) return '0.00'
  
  try {
    const formatted = formatUnits(BigInt(balance.toString()), decimals)
    const num = parseFloat(formatted)
    
    // Return with specified decimal places
    return num.toFixed(displayDecimals)
  } catch (error) {
    console.error('Error formatting balance:', error)
    return '0.00'
  }
}

/**
 * Parse a user input amount to wei
 */
export function parseAmount(amount: string, decimals: number = 18): bigint {
  if (!amount || amount === '') return BigInt(0)
  
  try {
    return parseUnits(amount, decimals)
  } catch (error) {
    console.error('Error parsing amount:', error)
    return BigInt(0)
  }
}

/**
 * Format a number with commas for thousands separators
 */
export function formatNumber(num: number | string, decimals: number = 2): string {
  const number = typeof num === 'string' ? parseFloat(num) : num
  
  if (isNaN(number)) return '0'
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number)
}

/**
 * Format a large number with K, M, B suffixes
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B'
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M'
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K'
  }
  return num.toString()
}

/**
 * Format percentage with appropriate decimal places
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

/**
 * Format currency with dollar sign
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  decimals: number = 2
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount)
}

/**
 * Truncate a string with ellipsis
 */
export function truncateString(
  str: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (str.length <= startChars + endChars) return str
  
  return `${str.substring(0, startChars)}...${str.substring(
    str.length - endChars
  )}`
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Get a random color from the brand palette
 */
export function getRandomBrandColor(): string {
  const colors = [
    '#FF00AA', // neon-magenta
    '#CCFF00', // electric-lime
    '#0D0D0D', // jet-black
    '#1F1F1F'  // gunmetal-gray
  ]
  
  if (colors.length === 0) return '#FF00AA' // default to neon-magenta if no colors available
  
  const randomIndex = Math.floor(Math.random() * colors.length)
  return colors[randomIndex] || '#FF00AA' // fallback to neon-magenta
}

/**
 * Debounce function for input handling
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Check if a value is numeric
 */
export function isNumeric(value: string): boolean {
  return !isNaN(Number(value)) && !isNaN(parseFloat(value))
}

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Generate a range of numbers
 */
export function range(start: number, end: number, step: number = 1): number[] {
  const result = []
  for (let i = start; i < end; i += step) {
    result.push(i)
  }
  return result
}

/**
 * Sleep function for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
