import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Vote, Users, Target, Trophy, MessageSquare, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useContract } from '../hooks/useContract'
import { useRealTimeData } from '../hooks/useRealTimeData'
// ...existing code...
import { toast } from 'react-hot-toast'
import ConnectWalletButton from '../components/ConnectWalletButton'

export default function GovernancePage() {
  const { address, isConnected } = useAccount()
  const [mounted, setMounted] = useState(false)
  const [selectedTab, setSelectedTab] = useState('active')
  const [newProposalTitle, setNewProposalTitle] = useState('')
  const [newProposalDescription, setNewProposalDescription] = useState('')
  const [isCreatingProposal, setIsCreatingProposal] = useState(false)
  const [votingOnProposal, setVotingOnProposal] = useState<number | null>(null)

  const { governanceContract } = useContract()
  const { governanceData, refreshGovernanceData } = useRealTimeData()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCreateProposal = async () => {
    if (!governanceContract || !address || !newProposalTitle || !newProposalDescription) return

    try {
      setIsCreatingProposal(true)
      
      const proposalTx = await governanceContract.write.createProposal([
        newProposalTitle,
        newProposalDescription
      ])
      
      toast.success('Proposal creation transaction sent!')
      await proposalTx.wait()
      toast.success('Proposal created successfully!')
      
      setNewProposalTitle('')
      setNewProposalDescription('')
      refreshGovernanceData()
    } catch (error) {
      console.error('Failed to create proposal:', error)
      toast.error('Failed to create proposal. Please try again.')
    } finally {
      setIsCreatingProposal(false)
    }
  }

  // Simple analytics event tracker (placeholder)
  function trackEvent(event: string, details?: Record<string, unknown>) {
    // Replace with real analytics integration
    console.log(`[Analytics] ${event}`, details || {})
  }

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (errorMsg) {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
      errorTimeoutRef.current = setTimeout(() => setErrorMsg(null), 5000)
    }
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    }
  }, [errorMsg])

  useEffect(() => {
    if (isConnected && address) {
      trackEvent('governance_wallet_connected', { address })
    }
  }, [isConnected, address])

  const handleVote = async (proposalId: number, support: boolean) => {
    if (!governanceContract || !address) {
      setErrorMsg('Missing contract or wallet.')
      toast.error('Missing contract or wallet.')
      return
    }

    try {
      setVotingOnProposal(proposalId)
      setErrorMsg(null)
      const voteTx = await governanceContract.write.vote([proposalId, support])
      toast('Vote transaction sent!', { icon: support ? '👍' : '👎', style: { background: support ? '#1effa0' : '#ff00c8', color: '#222' } })
      await voteTx.wait()
      toast.success(`Vote ${support ? 'in favor' : 'against'} submitted successfully!`)
      refreshGovernanceData()
      trackEvent('governance_vote', { address, proposalId, support })
    } catch (error) {
      console.error('Failed to vote:', error)
      const msg = (error as Error)?.message || 'Failed to submit vote. Please try again.'
      setErrorMsg(msg)
      toast.error(msg)
      trackEvent('governance_vote_error', { address, proposalId, error: msg })
    } finally {
      setVotingOnProposal(null)
    }
  }

  if (!mounted) return null

  const getProposalStatus = (proposal: { executed: boolean; endTime: number; forVotes: number; againstVotes: number }) => {
    const now = Date.now() / 1000
    if (proposal.executed) return 'executed'
    if (now > proposal.endTime) {
      return proposal.forVotes > proposal.againstVotes ? 'passed' : 'rejected'
    }
    return 'active'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-electric-lime'
      case 'passed': return 'text-green-500'
      case 'executed': return 'text-blue-500'
      case 'rejected': return 'text-red-500'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="w-5 h-5" />
      case 'passed': return <CheckCircle className="w-5 h-5" />
      case 'executed': return <Trophy className="w-5 h-5" />
      case 'rejected': return <XCircle className="w-5 h-5" />
      default: return <MessageSquare className="w-5 h-5" />
    }
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-electric-lime/20 rounded-full">
              <Vote className="w-12 h-12 text-electric-lime" />
            </div>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-electric-lime to-neon-magenta bg-clip-text text-transparent">
            DAO Governance
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Shape the future of VeloFi through decentralized governance. 
            Create proposals, vote on important decisions, and help build the protocol together.
          </p>
        </motion.div>

        {/* Governance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            {
              title: "Total Proposals",
              value: governanceData.totalProposals.toString(),
              change: "+3 this week",
              icon: <MessageSquare className="w-6 h-6" />,
              color: "electric-lime"
            },
            {
              title: "Active Voters",
              value: governanceData.activeVoters.toString(),
              change: "+12% this month", 
              icon: <Users className="w-6 h-6" />,
              color: "neon-magenta"
            },
            {
              title: "Voting Power",
              value: `${governanceData.totalVotingPower} VLFI`,
              change: "Total staked",
              icon: <Vote className="w-6 h-6" />,
              color: "electric-lime"
            },
            {
              title: "Participation Rate",
              value: `${governanceData.participationRate}%`,
              change: "+5.2% avg",
              icon: <Target className="w-6 h-6" />,
              color: "neon-magenta"
            }
          ].map((stat) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-jet-black/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-electric-lime/30 transition-all duration-300"
            >
              <div className={`flex items-center gap-3 mb-4 text-${stat.color}`}>
                {stat.icon}
                <span className="text-sm font-medium text-gray-300">{stat.title}</span>
              </div>
              <div className="text-2xl font-bold text-white mb-2">{stat.value}</div>
              <div className={`text-sm text-${stat.color}`}>{stat.change}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Proposal */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-electric-lime/20 p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-electric-lime" />
                Create Proposal
              </h2>

              {isConnected && governanceData.userVotingPower > 0 ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Proposal Title
                    </label>
                    <input
                      type="text"
                      value={newProposalTitle}
                      onChange={(e) => setNewProposalTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-jet-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-electric-lime focus:ring-1 focus:ring-electric-lime outline-none transition-colors"
                      placeholder="Enter proposal title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newProposalDescription}
                      onChange={(e) => setNewProposalDescription(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 bg-jet-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-electric-lime focus:ring-1 focus:ring-electric-lime outline-none transition-colors resize-none"
                      placeholder="Describe your proposal in detail..."
                    />
                  </div>

                  <div className="bg-jet-black/50 rounded-lg p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Your Voting Power</span>
                      <span className="text-electric-lime">{governanceData.userVotingPower} VLFI</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Minimum Required</span>
                      <span className="text-white">1,000 VLFI</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateProposal}
                    disabled={isCreatingProposal || !newProposalTitle || !newProposalDescription || governanceData.userVotingPower < 1000}
                    className="w-full px-6 py-3 bg-gradient-to-r from-electric-lime to-neon-magenta rounded-lg font-semibold text-jet-black hover:shadow-lg hover:shadow-electric-lime/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCreatingProposal ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-5 h-5" />
                        Create Proposal
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <Vote className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                  {!isConnected ? (
                    <>
                      <p className="mb-4">Connect your wallet to create proposals</p>
                      <ConnectWalletButton 
                        variant="secondary"
                        size="md"
                        className="w-auto"
                      />
                    </>
                  ) : (
                    <>
                      <p className="mb-4">You need at least 1,000 VLFI voting power to create proposals</p>
                      <p className="text-sm">Current: {governanceData.userVotingPower} VLFI</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Proposals List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Vote className="w-6 h-6 text-neon-magenta" />
                  Proposals
                </h2>
                
                <div className="flex gap-2">
                  {['active', 'passed', 'all'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedTab(tab)}
                      className={`px-4 py-2 rounded-lg font-medium capitalize transition-all duration-300 ${
                        selectedTab === tab
                          ? 'bg-neon-magenta text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {governanceData.proposals?.length > 0 ? (
                  governanceData.proposals.map((proposal) => {
                    const status = getProposalStatus(proposal)
                    const shouldShow = selectedTab === 'all' || 
                                     (selectedTab === 'active' && status === 'active') ||
                                     (selectedTab === 'passed' && status === 'passed')
                    
                    if (!shouldShow) return null

                    return (
                      <div key={proposal.id} className="bg-jet-black/30 rounded-lg border border-gray-700 p-6 hover:border-neon-magenta/30 transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-2">{proposal.title}</h3>
                            <p className="text-gray-300 text-sm leading-relaxed mb-4">{proposal.description}</p>
                          </div>
                          
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </div>
                        </div>

                        {/* Voting Progress */}
                        <div className="mb-6">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-400">Voting Results</span>
                            <span className="text-sm text-gray-400">
                              {proposal.forVotes + proposal.againstVotes} votes
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-green-500">For</span>
                                <span className="text-white">{proposal.forVotes}</span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                                  style={{ 
                                    width: `${proposal.forVotes + proposal.againstVotes > 0 
                                      ? (proposal.forVotes / (proposal.forVotes + proposal.againstVotes)) * 100 
                                      : 0}%` 
                                  }}
                                />
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-red-500">Against</span>
                                <span className="text-white">{proposal.againstVotes}</span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                                  style={{ 
                                    width: `${proposal.forVotes + proposal.againstVotes > 0 
                                      ? (proposal.againstVotes / (proposal.forVotes + proposal.againstVotes)) * 100 
                                      : 0}%` 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Voting Buttons */}
                        {isConnected && status === 'active' && !proposal.hasUserVoted && (
                          <div className="flex gap-4">
                            <button
                              onClick={() => handleVote(proposal.id, true)}
                              disabled={votingOnProposal === proposal.id}
                              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {votingOnProposal === proposal.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              Vote For
                            </button>
                            
                            <button
                              onClick={() => handleVote(proposal.id, false)}
                              disabled={votingOnProposal === proposal.id}
                              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {votingOnProposal === proposal.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              Vote Against
                            </button>
                          </div>
                        )}

                        {proposal.hasUserVoted && (
                          <div className="text-center py-2 text-electric-lime">
                            ✓ You have already voted on this proposal
                          </div>
                        )}

                        <div className="flex justify-between items-center text-sm text-gray-400 mt-4 pt-4 border-t border-gray-700">
                          <span>Proposal #{proposal.id}</span>
                          <span>
                            {status === 'active' 
                              ? `Ends: ${new Date(proposal.endTime * 1000).toLocaleDateString()}`
                              : `Ended: ${new Date(proposal.endTime * 1000).toLocaleDateString()}`
                            }
                          </span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <p className="text-lg">No proposals found</p>
                    <p className="text-sm mt-2">Create the first proposal to get started</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Governance Process */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <div className="bg-gradient-to-r from-electric-lime/10 to-neon-magenta/10 rounded-xl p-8">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">How Governance Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  step: "1",
                  title: "Stake VLFI Tokens",
                  description: "Stake your VLFI tokens to gain voting power and participate in governance decisions."
                },
                {
                  step: "2",
                  title: "Create Proposals",
                  description: "Submit proposals for protocol improvements, parameter changes, or new features."
                },
                {
                  step: "3",
                  title: "Community Voting",
                  description: "Token holders vote on proposals during the voting period using their staked tokens."
                },
                {
                  step: "4",
                  title: "Execute Changes",
                  description: "Approved proposals are automatically executed, implementing changes to the protocol."
                }
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-electric-lime to-neon-magenta rounded-full flex items-center justify-center text-jet-black font-bold text-xl mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
