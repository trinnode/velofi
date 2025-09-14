import { useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, AlertCircle, Info, Loader2 } from 'lucide-react'
import { useContract } from '../hooks/useContract'
import { useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { toast } from 'react-hot-toast'

interface LoanRequestFormProps {
  userCreditScore?: number
  maxLoanAmount?: number
  onLoanRequested?: () => void
}

export default function LoanRequestForm({ 
  userCreditScore = 0, 
  maxLoanAmount = 0,
  onLoanRequested
}: LoanRequestFormProps) {
  const [loanAmount, setLoanAmount] = useState('')
  const [loanDuration, setLoanDuration] = useState(30)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { address } = useAccount()
  const { lendingContract } = useContract()

  const calculateInterestRate = (creditScore: number) => {
    if (creditScore >= 750) return 5.0
    if (creditScore >= 700) return 7.5
    if (creditScore >= 650) return 10.0
    if (creditScore >= 600) return 15.0
    if (creditScore >= 500) return 20.0
    return 25.0
  }

  const interestRate = calculateInterestRate(userCreditScore)
  const monthlyPayment = loanAmount && loanDuration 
    ? (parseFloat(loanAmount) * (interestRate / 100 / 12) * Math.pow(1 + interestRate / 100 / 12, loanDuration)) / 
      (Math.pow(1 + interestRate / 100 / 12, loanDuration) - 1)
    : 0

  const totalRepayment = monthlyPayment * loanDuration

  const handleSubmitLoan = async () => {
    if (!lendingContract || !address || !loanAmount || !loanDuration) {
      toast.error('Please fill in all fields')
      return
    }

    if (parseFloat(loanAmount) > maxLoanAmount) {
      toast.error(`Loan amount exceeds maximum allowed: ${maxLoanAmount} VLFI`)
      return
    }

    if (userCreditScore < 500) {
      toast.error('Minimum credit score of 500 required for loans')
      return
    }

    try {
      setIsSubmitting(true)
      
      const amount = parseEther(loanAmount)
      const durationSeconds = loanDuration * 24 * 60 * 60 // Convert days to seconds
      
      const loanTx = await lendingContract.write.requestLoan([
        amount,
        durationSeconds,
        Math.floor(interestRate * 100) // Interest rate in basis points
      ])
      
      toast.success('Loan request submitted!')
      await loanTx.wait()
      toast.success('Loan request confirmed!')
      
      setLoanAmount('')
      setLoanDuration(30)
      onLoanRequested?.()
      
    } catch (error) {
      console.error('Loan request failed:', error)
      toast.error('Loan request failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRiskLevel = (score: number) => {
    if (score >= 750) return { level: 'Low Risk', color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' }
    if (score >= 650) return { level: 'Medium Risk', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' }
    if (score >= 500) return { level: 'High Risk', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' }
    return { level: 'Very High Risk', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' }
  }

  const risk = getRiskLevel(userCreditScore)

  return (
    <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-8">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-neon-magenta" />
        Request a Loan
      </h2>

      {userCreditScore < 500 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-xl font-bold text-white mb-2">Credit Score Too Low</h3>
          <p className="text-gray-400 mb-6">
            You need a minimum credit score of 500 to request a loan. 
            Build your credit score by using VeloFi services.
          </p>
          <div className="text-sm text-gray-500">
            Current Score: {userCreditScore} | Required: 500+
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Credit Score Display */}
          <div className={`p-4 rounded-lg border ${risk.bg}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400 mb-1">Your Credit Score</div>
                <div className="text-2xl font-bold text-white">{userCreditScore}</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${risk.color} mb-1`}>{risk.level}</div>
                <div className="text-sm text-gray-400">Interest Rate: {interestRate}%</div>
              </div>
            </div>
          </div>

          {/* Loan Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Loan Amount (VLFI)
            </label>
            <div className="relative">
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="w-full px-4 py-3 bg-jet-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-neon-magenta focus:ring-1 focus:ring-neon-magenta outline-none transition-colors"
                placeholder="0.00"
                max={maxLoanAmount}
                step="0.01"
              />
              <div className="absolute right-3 top-3 text-gray-400">VLFI</div>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-400">Available: {maxLoanAmount} VLFI</span>
              <button
                onClick={() => setLoanAmount(maxLoanAmount.toString())}
                className="text-electric-lime hover:text-electric-lime/80 transition-colors"
              >
                Max
              </button>
            </div>
          </div>

          {/* Loan Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Loan Duration (Days)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setLoanDuration(days)}
                  className={`p-3 rounded-lg border-2 transition-all duration-300 ${
                    loanDuration === days
                      ? 'border-neon-magenta bg-neon-magenta/10 text-neon-magenta'
                      : 'border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium">{days} Days</div>
                  <div className="text-xs opacity-75">{Math.round(days / 30)} Month{days > 30 ? 's' : ''}</div>
                </button>
              ))}
            </div>
            
            <div className="mt-3">
              <input
                type="range"
                min="7"
                max="365"
                value={loanDuration}
                onChange={(e) => setLoanDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>7 days</span>
                <span className="text-neon-magenta">{loanDuration} days</span>
                <span>365 days</span>
              </div>
            </div>
          </div>

          {/* Loan Summary */}
          {loanAmount && loanDuration && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-jet-black/50 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-electric-lime" />
                <span className="text-sm font-medium text-gray-300">Loan Summary</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {monthlyPayment.toFixed(6)} VLFI
                  </div>
                  <div className="text-xs text-gray-400">Daily Payment</div>
                </div>

                <div className="text-center">
                  <div className="text-lg font-bold text-neon-magenta">
                    {totalRepayment.toFixed(6)} VLFI
                  </div>
                  <div className="text-xs text-gray-400">Total Repayment</div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Principal:</span>
                  <span className="text-white">{loanAmount} VLFI</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Interest:</span>
                  <span className="text-white">{(totalRepayment - parseFloat(loanAmount)).toFixed(6)} VLFI</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">APR:</span>
                  <span className="text-white">{interestRate}%</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmitLoan}
            disabled={isSubmitting || !loanAmount || !loanDuration || parseFloat(loanAmount) <= 0 || parseFloat(loanAmount) > maxLoanAmount}
            className="w-full px-6 py-3 bg-gradient-to-r from-neon-magenta to-electric-lime rounded-lg font-semibold text-jet-black hover:shadow-lg hover:shadow-neon-magenta/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting Request...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Request Loan
              </>
            )}
          </button>

          {/* Terms Notice */}
          <div className="text-xs text-gray-500 leading-relaxed">
            By requesting a loan, you agree to the VeloFi lending terms and conditions. 
            Late payments may affect your credit score and incur additional fees. 
            Loan approval is subject to credit assessment and available liquidity.
          </div>
        </div>
      )}
    </div>
  )
}
