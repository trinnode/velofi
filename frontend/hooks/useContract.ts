import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { useEffect, useState } from 'react'
import { getContract } from 'viem'
import { 
  CONTRACT_ADDRESSES, 
  SavingsABI, 
  ExchangeABI, 
  MockERC20ABI, 
  CreditScoreABI, 
  LendingABI, 
  GovernanceABI 
} from '../contracts'

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
      const savingsContract = getContract({
        address: CONTRACT_ADDRESSES.Savings,
        abi: SavingsABI.abi,
        client: { public: publicClient, wallet: walletClient }
      })

      const exchangeContract = getContract({
        address: CONTRACT_ADDRESSES.Exchange,
        abi: ExchangeABI.abi,
        client: { public: publicClient, wallet: walletClient }
      })

      const mockTokenContract = getContract({
        address: CONTRACT_ADDRESSES.MockERC20,
        abi: MockERC20ABI.abi,
        client: { public: publicClient, wallet: walletClient }
      })

      const creditScoreContract = getContract({
        address: CONTRACT_ADDRESSES.CreditScore,
        abi: CreditScoreABI.abi,
        client: { public: publicClient, wallet: walletClient }
      })

      const lendingContract = getContract({
        address: CONTRACT_ADDRESSES.Lending,
        abi: LendingABI.abi,
        client: { public: publicClient, wallet: walletClient }
      })

      const governanceContract = getContract({
        address: CONTRACT_ADDRESSES.Governance,
        abi: GovernanceABI.abi,
        client: { public: publicClient, wallet: walletClient }
      })

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
