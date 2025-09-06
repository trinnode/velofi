import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { useEffect, useState } from 'react'
import { getContract } from 'viem'

// Contract ABIs (simplified for demo - in production, import from compiled artifacts)
const SAVINGS_ABI = [
  {
    "inputs": [{"type": "uint256", "name": "amount"}],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"type": "uint256", "name": "amount"}],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"type": "address", "name": "user"}],
    "name": "getBalance",
    "outputs": [
      {"type": "uint256", "name": "principal"},
      {"type": "uint256", "name": "accruedInterest"},
      {"type": "uint256", "name": "totalBalance"},
      {"type": "uint256", "name": "lastUpdate"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

const EXCHANGE_ABI = [
  {
    "inputs": [
      {"type": "uint256", "name": "tokenAmount"},
      {"type": "uint256", "name": "minEthAmount"}
    ],
    "name": "swapTokensForEth",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"type": "uint256", "name": "minTokenAmount"}],
    "name": "swapEthForTokens",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const

const MOCK_TOKEN_ABI = [
  {
    "inputs": [
      {"type": "address", "name": "spender"},
      {"type": "uint256", "name": "amount"}
    ],
    "name": "approve",
    "outputs": [{"type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"type": "address", "name": "account"}],
    "name": "balanceOf",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

const CREDIT_SCORE_ABI = [
  {
    "inputs": [{"type": "address", "name": "user"}],
    "name": "getCreditScore",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

const LENDING_ABI = [
  {
    "inputs": [
      {"type": "uint256", "name": "amount"},
      {"type": "uint256", "name": "duration"},
      {"type": "uint256", "name": "interestRate"}
    ],
    "name": "requestLoan",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

const GOVERNANCE_ABI = [
  {
    "inputs": [
      {"type": "string", "name": "title"},
      {"type": "string", "name": "description"}
    ],
    "name": "createProposal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"type": "uint256", "name": "proposalId"},
      {"type": "bool", "name": "support"}
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

// Contract addresses (from environment variables)
const CONTRACT_ADDRESSES = {
  SAVINGS: process.env.NEXT_PUBLIC_SAVINGS_CONTRACT as `0x${string}`,
  EXCHANGE: process.env.NEXT_PUBLIC_EXCHANGE_CONTRACT as `0x${string}`,
  MOCK_TOKEN: process.env.NEXT_PUBLIC_MOCK_TOKEN_ADDRESS as `0x${string}`,
  CREDIT_SCORE: process.env.NEXT_PUBLIC_CREDIT_SCORE_CONTRACT as `0x${string}`,
  LENDING: process.env.NEXT_PUBLIC_LENDING_CONTRACT as `0x${string}`,
  GOVERNANCE: process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT as `0x${string}`,
}

export function useContract() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [contracts, setContracts] = useState<{
    savingsContract: any
    exchangeContract: any
    mockTokenContract: any
    creditScoreContract: any
    lendingContract: any
    governanceContract: any
  }>({
    savingsContract: null,
    exchangeContract: null,
    mockTokenContract: null,
    creditScoreContract: null,
    lendingContract: null,
    governanceContract: null,
  })

  useEffect(() => {
    if (!publicClient || !walletClient) return

    try {
      const savingsContract = CONTRACT_ADDRESSES.SAVINGS ? getContract({
        address: CONTRACT_ADDRESSES.SAVINGS,
        abi: SAVINGS_ABI,
        client: { public: publicClient, wallet: walletClient }
      }) : null

      const exchangeContract = CONTRACT_ADDRESSES.EXCHANGE ? getContract({
        address: CONTRACT_ADDRESSES.EXCHANGE,
        abi: EXCHANGE_ABI,
        client: { public: publicClient, wallet: walletClient }
      }) : null

      const mockTokenContract = CONTRACT_ADDRESSES.MOCK_TOKEN ? getContract({
        address: CONTRACT_ADDRESSES.MOCK_TOKEN,
        abi: MOCK_TOKEN_ABI,
        client: { public: publicClient, wallet: walletClient }
      }) : null

      const creditScoreContract = CONTRACT_ADDRESSES.CREDIT_SCORE ? getContract({
        address: CONTRACT_ADDRESSES.CREDIT_SCORE,
        abi: CREDIT_SCORE_ABI,
        client: { public: publicClient, wallet: walletClient }
      }) : null

      const lendingContract = CONTRACT_ADDRESSES.LENDING ? getContract({
        address: CONTRACT_ADDRESSES.LENDING,
        abi: LENDING_ABI,
        client: { public: publicClient, wallet: walletClient }
      }) : null

      const governanceContract = CONTRACT_ADDRESSES.GOVERNANCE ? getContract({
        address: CONTRACT_ADDRESSES.GOVERNANCE,
        abi: GOVERNANCE_ABI,
        client: { public: publicClient, wallet: walletClient }
      }) : null

      setContracts({
        savingsContract,
        exchangeContract,
        mockTokenContract,
        creditScoreContract,
        lendingContract,
        governanceContract,
      })
    } catch (error) {
      console.error('Error initializing contracts:', error)
    }
  }, [publicClient, walletClient, address])

  return contracts
}
