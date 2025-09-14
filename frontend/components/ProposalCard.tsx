import { motion } from 'framer-motion'
import { Calendar, User, MessageSquare, CheckCircle, XCircle, Clock, Vote } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useState } from 'react'
import { toast } from 'react-hot-toast'

interface Proposal {
  id: number
  title: string
  description: string
  proposer: string
  forVotes: number
  againstVotes: number
  startTime: number
  endTime: number
  executed: boolean
  hasUserVoted?: boolean
  userVote?: boolean
}

interface ProposalCardProps {
  proposal: Proposal
  onVote?: (proposalId: number, support: boolean) => void
  isVoting?: boolean
  className?: string
}

export default function ProposalCard({ 
  proposal, 
  onVote, 
  isVoting = false,
  className = '' 
}: ProposalCardProps) {
  const { isConnected } = useAccount()
  const [showFullDescription, setShowFullDescription] = useState(false)

  const getProposalStatus = () => {
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
      case 'active': return <Clock className="w-4 h-4" />
      case 'passed': return <CheckCircle className="w-4 h-4" />
      case 'executed': return <CheckCircle className="w-4 h-4" />
      case 'rejected': return <XCircle className="w-4 h-4" />
      default: return <MessageSquare className="w-4 h-4" />
    }
  }

  const status = getProposalStatus()
  const totalVotes = proposal.forVotes + proposal.againstVotes
  const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0
  const againstPercentage = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0
  const timeRemaining = Math.max(0, proposal.endTime - Date.now() / 1000)

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Voting ended'
    
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((seconds % (60 * 60)) / 60)
    
    if (days > 0) return `${days}d ${hours}h remaining`
    if (hours > 0) return `${hours}h ${minutes}m remaining`
    return `${minutes}m remaining`
  }

  const handleVote = (support: boolean) => {
    if (!isConnected) {
      toast.error('Please connect your wallet to vote')
      return
    }
    
    if (proposal.hasUserVoted) {
      toast.error('You have already voted on this proposal')
      return
    }
    
    if (status !== 'active') {
      toast.error('Voting period has ended')
      return
    }

    onVote?.(proposal.id, support)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className={`bg-jet-black/30 rounded-xl border border-gray-700 p-6 hover:border-neon-magenta/30 transition-all duration-300 ${className}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-white">{proposal.title}</h3>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
              {getStatusIcon(status)}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(proposal.startTime * 1000).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatTimeRemaining(timeRemaining)}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <p className="text-gray-300 leading-relaxed">
          {showFullDescription 
            ? proposal.description 
            : `${proposal.description.slice(0, 150)}${proposal.description.length > 150 ? '...' : ''}`
          }
        </p>
        
        {proposal.description.length > 150 && (
          <button
            onClick={() => setShowFullDescription(!showFullDescription)}
            className="text-electric-lime hover:text-electric-lime/80 text-sm mt-2 transition-colors"
          >
            {showFullDescription ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Voting Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-300">Voting Results</span>
          <span className="text-sm text-gray-400">{totalVotes} votes</span>
        </div>
        
        <div className="space-y-3">
          {/* For Votes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-green-500 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                For ({proposal.forVotes})
              </span>
              <span className="text-sm text-white">{forPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${forPercentage}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className="bg-green-500 h-2 rounded-full"
              />
            </div>
          </div>
          
          {/* Against Votes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-red-500 flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                Against ({proposal.againstVotes})
              </span>
              <span className="text-sm text-white">{againstPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${againstPercentage}%` }}
                transition={{ duration: 1, delay: 0.4 }}
                className="bg-red-500 h-2 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* User Vote Status */}
      {proposal.hasUserVoted && (
        <div className="mb-4 p-3 bg-electric-lime/10 border border-electric-lime/20 rounded-lg">
          <div className="flex items-center gap-2 text-electric-lime">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              You voted {proposal.userVote ? 'FOR' : 'AGAINST'} this proposal
            </span>
          </div>
        </div>
      )}

      {/* Voting Buttons */}
      {isConnected && status === 'active' && !proposal.hasUserVoted && (
        <div className="flex gap-3">
          <button
            onClick={() => handleVote(true)}
            disabled={isVoting}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Vote For
          </button>
          
          <button
            onClick={() => handleVote(false)}
            disabled={isVoting}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Vote Against
          </button>
        </div>
      )}

      {/* Not Connected State */}
      {!isConnected && status === 'active' && (
        <div className="text-center p-4 bg-gray-700/30 rounded-lg">
          <p className="text-gray-400 text-sm mb-2">Connect your wallet to vote</p>
          <button className="px-4 py-2 bg-neon-magenta hover:bg-neon-magenta/80 text-white rounded-lg text-sm transition-colors">
            Connect Wallet
          </button>
        </div>
      )}

      {/* Voting Ended State */}
      {status !== 'active' && (
        <div className="text-center p-4 bg-gray-700/30 rounded-lg">
          <p className="text-gray-400 text-sm">
            Voting period has ended • 
            {status === 'passed' && ' Proposal passed'}
            {status === 'rejected' && ' Proposal rejected'}
            {status === 'executed' && ' Proposal executed'}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between items-center text-xs text-gray-400">
        <span>Proposal #{proposal.id}</span>
        <div className="flex items-center gap-2">
          <Vote className="w-3 h-3" />
          <span>
            {status === 'active' 
              ? `Ends ${new Date(proposal.endTime * 1000).toLocaleDateString()}`
              : `Ended ${new Date(proposal.endTime * 1000).toLocaleDateString()}`
            }
          </span>
        </div>
      </div>
    </motion.div>
  )
}
