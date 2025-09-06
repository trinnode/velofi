const express = require('express');
const { body, query: queryValidator, validationResult } = require('express-validator');
const { siweAuth } = require('../middleware/siweAuth');
const { transactionLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { cache } = require('../utils/redis');
const { query } = require('../utils/database');

const router = express.Router();

/**
 * @route   GET /api/credit/score
 * @desc    Get user's credit score
 * @access  Private
 */
router.get('/score', asyncHandler(async (req, res) => {
  try {
    const cacheKey = `credit:score:${req.user.address}`;
    let creditData = await cache.get(cacheKey);

    if (!creditData) {
      const result = await query(
        `SELECT cs.*, u.wallet_address 
         FROM credit_scores cs 
         JOIN users u ON cs.user_id = u.id 
         WHERE cs.user_id = $1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Credit score not found',
          message: 'No credit score found for this user',
          statusCode: 404
        });
      }

      creditData = result.rows[0];
      
      // Cache for 10 minutes
      await cache.set(cacheKey, creditData, 600);
    }

    // Get score factors
    const factors = await getCreditScoreFactors(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Credit score retrieved successfully',
      data: {
        score: creditData.score,
        rating: getCreditRating(creditData.score),
        lastUpdated: creditData.last_updated,
        factors,
        recommendations: getCreditRecommendations(creditData.score, factors)
      }
    });

  } catch (error) {
    logger.error('Get credit score error:', {
      userId: req.user.id,
      address: req.user.address,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve credit score',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/credit/history
 * @desc    Get credit score history
 * @access  Private
 */
router.get('/history', [
  queryValidator('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
      statusCode: 400
    });
  }

  const period = req.query.period || '30d';

  try {
    const history = await getCreditScoreHistory(req.user.id, period);

    res.status(200).json({
      success: true,
      message: 'Credit score history retrieved successfully',
      data: {
        period,
        history,
        summary: {
          current: history[history.length - 1]?.score || 0,
          highest: Math.max(...history.map(h => h.score)),
          lowest: Math.min(...history.map(h => h.score)),
          average: history.length ? Math.round(history.reduce((sum, h) => sum + h.score, 0) / history.length) : 0
        }
      }
    });

  } catch (error) {
    logger.error('Get credit score history error:', {
      userId: req.user.id,
      period,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve credit score history',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   POST /api/credit/improve
 * @desc    Request credit score improvement suggestions
 * @access  Private
 */
router.post('/improve', asyncHandler(async (req, res) => {
  try {
    const currentScore = await getCurrentCreditScore(req.user.id);
    const factors = await getCreditScoreFactors(req.user.id);
    const suggestions = await getCreditImprovementSuggestions(currentScore, factors);

    res.status(200).json({
      success: true,
      message: 'Credit improvement suggestions generated',
      data: {
        currentScore,
        targetScore: Math.min(currentScore + 50, 850),
        suggestions,
        estimatedTimeFrame: getImprovementTimeframe(currentScore, suggestions)
      }
    });

  } catch (error) {
    logger.error('Get credit improvement suggestions error:', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate improvement suggestions',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   POST /api/credit/update
 * @desc    Manual credit score update (for testing/admin purposes)
 * @access  Private
 */
router.post('/update', [
  transactionLimiter,
  body('transactionHash')
    .isLength({ min: 66, max: 66 })
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Valid transaction hash is required'),
  body('action')
    .isIn(['payment', 'default', 'loan_repaid', 'savings_deposit'])
    .withMessage('Valid action is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
      statusCode: 400
    });
  }

  const { transactionHash, action } = req.body;

  try {
    // Check if transaction already processed
    const existingUpdate = await query(
      'SELECT * FROM credit_score_updates WHERE transaction_hash = $1',
      [transactionHash]
    );

    if (existingUpdate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Transaction already processed',
        message: 'This transaction has already been processed for credit score update',
        statusCode: 409
      });
    }

    // Calculate score change based on action
    const scoreChange = calculateScoreChange(action);
    
    // Update credit score
    const result = await updateCreditScore(req.user.id, scoreChange, action, transactionHash);

    // Clear cache
    await cache.del(`credit:score:${req.user.address}`);

    logger.info('Credit score updated:', {
      userId: req.user.id,
      address: req.user.address,
      action,
      scoreChange,
      newScore: result.newScore,
      transactionHash
    });

    res.status(200).json({
      success: true,
      message: 'Credit score updated successfully',
      data: {
        oldScore: result.oldScore,
        newScore: result.newScore,
        change: scoreChange,
        action,
        rating: getCreditRating(result.newScore),
        transactionHash,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Update credit score error:', {
      userId: req.user.id,
      action,
      transactionHash,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Credit score update failed',
      message: 'Internal server error during credit score update',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/credit/factors
 * @desc    Get detailed credit score factors
 * @access  Private
 */
router.get('/factors', asyncHandler(async (req, res) => {
  try {
    const factors = await getDetailedCreditFactors(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Credit score factors retrieved successfully',
      data: factors
    });

  } catch (error) {
    logger.error('Get credit factors error:', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve credit factors',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * Helper function to get current credit score
 */
const getCurrentCreditScore = async (userId) => {
  try {
    const result = await query(
      'SELECT score FROM credit_scores WHERE user_id = $1',
      [userId]
    );

    return result.rows[0]?.score || 0;
  } catch (error) {
    logger.error('Get current credit score error:', error);
    throw error;
  }
};

/**
 * Helper function to get credit score factors
 */
const getCreditScoreFactors = async (userId) => {
  try {
    // Get various factors that affect credit score
    const results = await Promise.all([
      // Payment history
      query(`
        SELECT COUNT(*) as total_payments, 
               COUNT(*) FILTER (WHERE status = 'completed') as on_time_payments
        FROM loan_payments WHERE user_id = $1
      `, [userId]),
      
      // Loan history
      query(`
        SELECT COUNT(*) as total_loans,
               COUNT(*) FILTER (WHERE status = 'repaid') as repaid_loans,
               COUNT(*) FILTER (WHERE status = 'defaulted') as defaulted_loans
        FROM loans WHERE user_id = $1
      `, [userId]),
      
      // Savings behavior
      query(`
        SELECT balance, 
               EXTRACT(DAYS FROM NOW() - created_at) as account_age
        FROM savings_accounts WHERE user_id = $1
      `, [userId]),
      
      // DeFi activity
      query(`
        SELECT COUNT(*) as total_transactions,
               SUM(CASE WHEN transaction_type = 'swap' THEN 1 ELSE 0 END) as swap_count
        FROM dex_transactions WHERE user_id = $1
      `, [userId])
    ]);

    const [paymentData, loanData, savingsData, dexData] = results;
    
    const payment = paymentData.rows[0] || {};
    const loan = loanData.rows[0] || {};
    const savings = savingsData.rows[0] || {};
    const dex = dexData.rows[0] || {};

    return {
      paymentHistory: {
        score: calculatePaymentHistoryScore(payment),
        totalPayments: parseInt(payment.total_payments || 0),
        onTimePayments: parseInt(payment.on_time_payments || 0),
        paymentRatio: payment.total_payments > 0 ? 
          (payment.on_time_payments / payment.total_payments * 100).toFixed(1) : 100
      },
      loanHistory: {
        score: calculateLoanHistoryScore(loan),
        totalLoans: parseInt(loan.total_loans || 0),
        repaidLoans: parseInt(loan.repaid_loans || 0),
        defaultedLoans: parseInt(loan.defaulted_loans || 0)
      },
      savingsBehavior: {
        score: calculateSavingsScore(savings),
        balance: savings.balance || '0',
        accountAge: parseInt(savings.account_age || 0)
      },
      defiActivity: {
        score: calculateDeFiActivityScore(dex),
        totalTransactions: parseInt(dex.total_transactions || 0),
        swapCount: parseInt(dex.swap_count || 0)
      }
    };
  } catch (error) {
    logger.error('Get credit score factors error:', error);
    throw error;
  }
};

/**
 * Helper function to get credit score history
 */
const getCreditScoreHistory = async (userId, period) => {
  try {
    let interval;
    switch (period) {
      case '7d': interval = '7 days'; break;
      case '30d': interval = '30 days'; break;
      case '90d': interval = '90 days'; break;
      case '1y': interval = '1 year'; break;
      default: interval = '30 days';
    }

    const result = await query(
      `SELECT score, created_at, action, score_change
       FROM credit_score_history 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${interval}'
       ORDER BY created_at ASC`,
      [userId]
    );

    return result.rows || [];
  } catch (error) {
    logger.error('Get credit score history error:', error);
    throw error;
  }
};

/**
 * Helper function to get detailed credit factors
 */
const getDetailedCreditFactors = async (userId) => {
  try {
    const factors = await getCreditScoreFactors(userId);
    
    return {
      ...factors,
      overallScore: calculateOverallScore(factors),
      recommendations: getCreditRecommendations(await getCurrentCreditScore(userId), factors),
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    };
  } catch (error) {
    logger.error('Get detailed credit factors error:', error);
    throw error;
  }
};

/**
 * Helper function to calculate score change based on action
 */
const calculateScoreChange = (action) => {
  const scoreChanges = {
    'payment': 5,
    'loan_repaid': 20,
    'savings_deposit': 2,
    'default': -50
  };

  return scoreChanges[action] || 0;
};

/**
 * Helper function to update credit score
 */
const updateCreditScore = async (userId, scoreChange, action, transactionHash) => {
  try {
    const { transaction } = require('../utils/database');
    
    return await transaction(async (client) => {
      // Get current score
      const currentResult = await client.query(
        'SELECT score FROM credit_scores WHERE user_id = $1',
        [userId]
      );

      const oldScore = currentResult.rows[0]?.score || 0;
      const newScore = Math.max(0, Math.min(850, oldScore + scoreChange));

      // Update credit score
      await client.query(
        `UPDATE credit_scores 
         SET score = $1, last_updated = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [newScore, userId]
      );

      // Record the update
      await client.query(
        `INSERT INTO credit_score_updates 
         (user_id, old_score, new_score, score_change, action, transaction_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [userId, oldScore, newScore, scoreChange, action, transactionHash]
      );

      // Record in history
      await client.query(
        `INSERT INTO credit_score_history 
         (user_id, score, action, score_change, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [userId, newScore, action, scoreChange]
      );

      return { oldScore, newScore };
    });
  } catch (error) {
    logger.error('Update credit score error:', error);
    throw error;
  }
};

/**
 * Helper functions for score calculations
 */
const calculatePaymentHistoryScore = (data) => {
  if (data.total_payments === 0) return 100; // No history is neutral
  const ratio = data.on_time_payments / data.total_payments;
  return Math.round(ratio * 100);
};

const calculateLoanHistoryScore = (data) => {
  if (data.total_loans === 0) return 100;
  const successRatio = data.repaid_loans / data.total_loans;
  const defaultPenalty = data.defaulted_loans * 20;
  return Math.max(0, Math.round(successRatio * 100 - defaultPenalty));
};

const calculateSavingsScore = (data) => {
  const balance = parseFloat(data.balance || 0);
  const age = data.account_age || 0;
  
  let score = 50;
  if (balance > 1000) score += 20;
  if (balance > 10000) score += 15;
  if (age > 30) score += 10;
  if (age > 90) score += 5;
  
  return Math.min(100, score);
};

const calculateDeFiActivityScore = (data) => {
  const transactions = data.total_transactions || 0;
  let score = Math.min(50, transactions * 2);
  if (transactions > 10) score += 10;
  if (transactions > 50) score += 10;
  return Math.min(100, score);
};

const calculateOverallScore = (factors) => {
  const weights = {
    paymentHistory: 0.35,
    loanHistory: 0.30,
    savingsBehavior: 0.20,
    defiActivity: 0.15
  };

  return Math.round(
    factors.paymentHistory.score * weights.paymentHistory +
    factors.loanHistory.score * weights.loanHistory +
    factors.savingsBehavior.score * weights.savingsBehavior +
    factors.defiActivity.score * weights.defiActivity
  );
};

/**
 * Helper function to get credit rating
 */
const getCreditRating = (score) => {
  if (score >= 800) return 'Excellent';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
};

/**
 * Helper function to get credit recommendations
 */
const getCreditRecommendations = (score, factors) => {
  const recommendations = [];

  if (factors.paymentHistory.score < 80) {
    recommendations.push({
      category: 'Payment History',
      suggestion: 'Make all loan payments on time to improve your payment history',
      impact: 'High',
      timeFrame: '3-6 months'
    });
  }

  if (parseFloat(factors.savingsBehavior.balance) < 1000) {
    recommendations.push({
      category: 'Savings',
      suggestion: 'Increase your savings balance to demonstrate financial stability',
      impact: 'Medium',
      timeFrame: '1-3 months'
    });
  }

  if (factors.defiActivity.totalTransactions < 10) {
    recommendations.push({
      category: 'DeFi Activity',
      suggestion: 'Engage more with DeFi protocols to show active participation',
      impact: 'Low',
      timeFrame: '1-2 months'
    });
  }

  return recommendations;
};

/**
 * Helper function to get credit improvement suggestions
 */
const getCreditImprovementSuggestions = async (currentScore, factors) => {
  const suggestions = getCreditRecommendations(currentScore, factors);
  
  return {
    immediate: suggestions.filter(s => s.timeFrame.includes('1')),
    shortTerm: suggestions.filter(s => s.timeFrame.includes('3')),
    longTerm: suggestions.filter(s => s.timeFrame.includes('6'))
  };
};

/**
 * Helper function to get improvement timeframe
 */
const getImprovementTimeframe = (currentScore, suggestions) => {
  const totalSuggestions = suggestions.immediate.length + suggestions.shortTerm.length + suggestions.longTerm.length;
  
  if (totalSuggestions === 0) return '1-2 months';
  if (suggestions.longTerm.length > 0) return '6-12 months';
  if (suggestions.shortTerm.length > 0) return '3-6 months';
  return '1-3 months';
};

// Create additional tables if they don't exist
const createCreditTables = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS credit_score_updates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        old_score INTEGER NOT NULL,
        new_score INTEGER NOT NULL,
        score_change INTEGER NOT NULL,
        action VARCHAR(50) NOT NULL,
        transaction_hash VARCHAR(66),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS credit_score_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        action VARCHAR(50),
        score_change INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS loan_payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
        amount DECIMAL(78, 18) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        transaction_hash VARCHAR(66),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_credit_score_updates_user_id ON credit_score_updates(user_id);
      CREATE INDEX IF NOT EXISTS idx_credit_score_updates_hash ON credit_score_updates(transaction_hash);
      CREATE INDEX IF NOT EXISTS idx_credit_score_history_user_id ON credit_score_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_loan_payments_user_id ON loan_payments(user_id);
    `);

    logger.debug('Credit tables created/verified');
  } catch (error) {
    logger.error('Create credit tables error:', error);
  }
};

// Initialize tables on module load
createCreditTables();

module.exports = router;
