import { useAccount } from "wagmi";
import { useContract } from "./useContract";
import { useState, useEffect, useCallback } from "react";
import { formatEther } from "viem";

// Type definitions
interface SavingsData {
  userBalance: {
    principal: bigint;
    accruedInterest: bigint;
    totalBalance: bigint;
    lastUpdate: number;
  } | null;
  totalDeposits: string;
  totalDepositors: number;
  accumulatedInterest: string;
  currentAPY: number;
}

interface CreditData {
  userScore: number;
  paymentHistory: number;
  creditUtilization: number;
  accountAge: number;
  protocolActivity: number;
  recentActivity: Array<{
    action: string;
    points: number;
    date: string;
  }>;
}

interface DexData {
  volume24h: string;
  totalLiquidity: string;
  vlfiPrice: string;
  activePairs: number;
  recentTrades: Array<{
    type: "buy" | "sell";
    fromAmount: string;
    fromToken: string;
    toAmount: string;
    toToken: string;
    value: string;
    time: string;
  }>;
}

interface GovernanceData {
  totalProposals: number;
  activeVoters: number;
  totalVotingPower: string;
  participationRate: number;
  userVotingPower: number;
  proposals: Array<{
    id: number;
    title: string;
    description: string;
    proposer: string;
    forVotes: number;
    againstVotes: number;
    startTime: number;
    endTime: number;
    executed: boolean;
    hasUserVoted: boolean;
    userVote?: boolean;
  }>;
}

export function useRealTimeData() {
  const { address, isConnected } = useAccount();
  const {
    savingsContract,
    creditScoreContract,
    exchangeContract,
    governanceContract,
  } = useContract();

  // State for different data types
  const [savingsData, setSavingsData] = useState<SavingsData>({
    userBalance: null,
    totalDeposits: "0",
    totalDepositors: 0,
    accumulatedInterest: "0",
    currentAPY: 5.0,
  });

  const [creditData, setCreditData] = useState<CreditData>({
    userScore: 0,
    paymentHistory: 0,
    creditUtilization: 0,
    accountAge: 0,
    protocolActivity: 0,
    recentActivity: [],
  });

  const [dexData, setDexData] = useState<DexData>({
    volume24h: "0",
    totalLiquidity: "0",
    vlfiPrice: "1.25",
    activePairs: 3,
    recentTrades: [],
  });

  const [governanceData, setGovernanceData] = useState<GovernanceData>({
    totalProposals: 0,
    activeVoters: 0,
    totalVotingPower: "0",
    participationRate: 0,
    userVotingPower: 0,
    proposals: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic dashboard stats
  const [totalValueLocked, setTotalValueLocked] = useState(28467095);
  const [activeUsers, setActiveUsers] = useState(12483);
  const [totalTransactions, setTotalTransactions] = useState(687542);

  // Helper function to get activity name from type
  const getActivityName = (activityType: number): string => {
    const activityTypes = [
      "Deposit",
      "Withdrawal",
      "Loan Request",
      "Loan Repayment",
      "Governance Vote",
    ];
    return activityTypes[activityType] || "Unknown Activity";
  }; // Fetch savings data
  const fetchSavingsData = useCallback(async () => {
    if (!savingsContract || !isConnected || !address) return;

    try {
      setIsLoading(true);
      // Get user balance using the real contract function
      const userBalance = await savingsContract.read.getUserBalance([address]);
      // Get contract stats
      const [totalDeposits, contractBalance, currentAPY] = await Promise.all([
        savingsContract.read.getTotalDeposits(),
        savingsContract.read.getContractBalance(),
        savingsContract.read.getCurrentAPY(),
      ]);
      // Calculate interest for display
      const calculatedInterest = await savingsContract.read.calculateInterest([
        address,
      ]);
      setSavingsData({
        userBalance: {
          principal: userBalance[0],
          accruedInterest: calculatedInterest,
          totalBalance: userBalance[0] + calculatedInterest,
          lastUpdate: Number(userBalance[2]),
        },
        totalDeposits: formatEther(totalDeposits),
        totalDepositors: 342, // This would need to be tracked separately
        accumulatedInterest: formatEther(calculatedInterest),
        currentAPY: Number(currentAPY) / 100,
      });
    } catch (error) {
      console.error("Error fetching savings data:", error);
      // Do not set fallback data
    } finally {
      setIsLoading(false);
    }
  }, [savingsContract, isConnected, address]); // Fetch credit data
  const fetchCreditData = useCallback(async () => {
    if (!creditScoreContract || !isConnected || !address) return;

    try {
      // Get user credit score using real contract function
      const [score, tier, activities] = await Promise.all([
        creditScoreContract.read.getCreditScore([address]),
        creditScoreContract.read.getTier([address]),
        creditScoreContract.read.getActivities([address]),
      ]);
      // Get credit details
      const creditDetails = await creditScoreContract.read.getCreditDetails([
        address,
      ]);
      setCreditData({
        userScore: Number(score),
        paymentHistory: Number(creditDetails[0]), // Payment history score
        creditUtilization: Number(creditDetails[1]), // Utilization score
        accountAge: Number(creditDetails[2]), // Age score
        protocolActivity: Number(creditDetails[3]), // Activity score
        recentActivity: activities.map((activity: any) => ({
          action: getActivityName(Number(activity.activityType)),
          points: Number(activity.points),
          date: new Date(
            Number(activity.timestamp) * 1000
          ).toLocaleDateString(),
        })),
      });
    } catch (error) {
      console.error("Error fetching credit data:", error);
      // Do not set fallback data
    }
  }, [creditScoreContract, isConnected, address]); // Fetch DEX data
  const fetchDexData = useCallback(async () => {
    if (!exchangeContract) return;

    try {
      // Get real exchange data
      const [reserveA, reserveB, totalLiquidity, totalVolume, totalFees] =
        await exchangeContract.read.getExchangeStats();
      const [priceAtoB] = await exchangeContract.read.currentPrice();
      setDexData({
        volume24h: formatEther(totalVolume),
        totalLiquidity: formatEther(totalLiquidity),
        vlfiPrice: (Number(priceAtoB) / 1e18).toFixed(4),
        activePairs: 3, // This would be tracked separately
        recentTrades: [], // Recent trades would need event listening
      });
    } catch (error) {
      console.error("Error fetching DEX data:", error);
      // Do not set fallback data
    }
  }, [exchangeContract]);

  // Fetch governance data
  const fetchGovernanceData = useCallback(async () => {
    if (!governanceContract) return;
    try {
      // Fetch proposal count and total delegated votes
      const [proposalCount, totalDelegatedVotes] = await Promise.all([
        governanceContract.read.proposalCount(),
        governanceContract.read.totalDelegatedVotes(),
      ]);

      // Fetch user voting power if connected
      let userVotingPower = 0;
      if (isConnected && address) {
        userVotingPower = await governanceContract.read.getCurrentVotes([
          address,
        ]);
      }

      // Fetch recent proposals (last 5)
      const proposals: GovernanceData["proposals"] = [];
      const maxProposals = Math.min(Number(proposalCount), 5);
      for (
        let i = Number(proposalCount);
        i > Number(proposalCount) - maxProposals && i > 0;
        i--
      ) {
        try {
          const proposal = await governanceContract.read.getProposal([
            BigInt(i),
          ]);
          let hasUserVoted: [boolean, number, number] = [false, 0, 0];
          if (isConnected && address) {
            hasUserVoted = await governanceContract.read.getReceipt([
              BigInt(i),
              address,
            ]);
          }
          proposals.push({
            id: i,
            title: String(proposal.title),
            description: String(proposal.description),
            proposer: String(proposal.proposer),
            forVotes: Number(proposal.forVotes),
            againstVotes: Number(proposal.againstVotes),
            startTime: Number(proposal.startTime),
            endTime: Number(proposal.endTime),
            executed: Boolean(proposal.executed),
            hasUserVoted: Boolean(hasUserVoted[0]),
            userVote: hasUserVoted[0] ? hasUserVoted[1] === 1 : undefined,
          });
        } catch (proposalError) {
          console.error(`Error fetching proposal ${i}:`, proposalError);
        }
      }

      setGovernanceData({
        totalProposals: Number(proposalCount),
        activeVoters: 156, // This would need to be tracked separately
        totalVotingPower: formatEther(totalDelegatedVotes),
        participationRate: 67.5, // This would need calculation
        userVotingPower: Number(userVotingPower),
        proposals,
      });
    } catch (error) {
      console.error("Error fetching governance data:", error);
      // Do not set fallback data
    }
  }, [governanceContract, isConnected, address]);
  // ...existing code...

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchSavingsData(),
        fetchCreditData(),
        fetchDexData(),
        fetchGovernanceData(),
      ]);
      // Optionally update dashboard stats here if needed
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError("Failed to refresh data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchSavingsData, fetchCreditData, fetchDexData, fetchGovernanceData]);

  // Individual refresh functions
  const refreshSavingsData = useCallback(() => {
    fetchSavingsData();
  }, [fetchSavingsData]);

  const refreshCreditData = useCallback(() => {
    fetchCreditData();
  }, [fetchCreditData]);

  const refreshDexData = useCallback(() => {
    fetchDexData();
  }, [fetchDexData]);

  const refreshGovernanceData = useCallback(() => {
    fetchGovernanceData();
  }, [fetchGovernanceData]);

  // Initial data fetch
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh contract data every 2 minutes to avoid too many calls
      if (Date.now() % 120000 < 30000) {
        refreshAllData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshAllData]);

  return {
    // Data
    savingsData,
    creditData,
    dexData,
    governanceData,

    // Dashboard stats
    totalValueLocked,
    activeUsers,
    totalTransactions,

    // Loading and error states
    isLoading,
    error,

    // Refresh functions
    refreshAllData,
    refreshSavingsData,
    refreshCreditData,
    refreshDexData,
    refreshGovernanceData,
  };
}
