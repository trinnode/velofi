const express = require('express');
const { body, query: queryValidator, validationResult } = require('express-validator');
const { siweAuth } = require('../middleware/siweAuth');
const { transactionLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { cache } = require('../utils/redis');
const { query, transaction } = require('../utils/database');

const router = express.Router();

/**
 * @route   POST /api/lending/request
 * @desc    Request a loan
 * @access  Private
 */
router.post('/request', [
  transactionLimiter,
  body('amount').isNumeric().custom(value => parseFloat(value) > 0).withMessage('Valid loan amount required'),
  body('duration').isInt({ min: 86400, max: 31536000 }).withMessage('Duration must be between 1 day and 1 year (in seconds)'),
  body('collateral').isNumeric().custom(value => parseFloat(value) > 0).withMessage('Valid collateral amount required')
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

  const { amount, duration, collateral } = req.body;

  try {
    // Check credit score requirement
    const creditResult = await query(
      'SELECT score FROM credit_scores WHERE user_id = $1',
      [req.user.id]
    );

    const creditScore = creditResult.rows[0]?.score || 0;
    const minCreditScore = calculateMinCreditScore(amount);

    if (creditScore < minCreditScore) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient credit score',
        message: `Minimum credit score of ${minCreditScore} required for this loan amount`,
        data: { currentScore: creditScore, requiredScore: minCreditScore },
        statusCode: 400
      });
    }

    // Calculate interest rate based on credit score and amount
    const interestRate = calculateInterestRate(creditScore, amount, duration);

    // Check collateral ratio
    const collateralRatio = (parseFloat(collateral) / parseFloat(amount)) * 100;
    const minCollateralRatio = 150; // 150%

    if (collateralRatio < minCollateralRatio) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient collateral',
        message: `Minimum collateral ratio of ${minCollateralRatio}% required`,
        data: { currentRatio: collateralRatio.toFixed(2), requiredRatio: minCollateralRatio },
        statusCode: 400
      });
    }

    // Create loan request
    const result = await transaction(async (client) => {
      const loanResult = await client.query(
        `INSERT INTO loans 
         (user_id, amount, interest_rate, duration, collateral, status, created_at, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 second' * $4)
         RETURNING *`,
        [req.user.id, amount, interestRate, duration, collateral, 'requested']
      );

      return loanResult.rows[0];
    });

    logger.info('Loan requested:', {
      loanId: result.id,
      userId: req.user.id,
      address: req.user.address,
      amount,
      interestRate,
      collateral
    });

    res.status(201).json({
      success: true,
      message: 'Loan request created successfully',
      data: {
        loanId: result.id,
        amount,
        interestRate: interestRate.toFixed(2),
        duration,
        collateral,
        collateralRatio: collateralRatio.toFixed(2),
        status: result.status,
        dueDate: result.due_date,
        createdAt: result.created_at
      }
    });

  } catch (error) {
    logger.error('Loan request error:', {
      userId: req.user.id,
      amount,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Loan request failed',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/lending/loans
 * @desc    Get user's loans
 * @access  Private
 */
router.get('/loans', [
  queryValidator('status').optional().isIn(['requested', 'active', 'repaid', 'defaulted']).withMessage('Invalid status'),
  queryValidator('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  queryValidator('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
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

  const status = req.query.status;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    let whereClause = 'WHERE user_id = $1';
    let queryParams = [req.user.id];

    if (status) {
      whereClause += ' AND status = $2';
      queryParams.push(status);
    }

    const result = await query(
      `SELECT * FROM loans 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM loans ${whereClause}`,
      queryParams
    );

    const totalCount = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      message: 'Loans retrieved successfully',
      data: {
        loans: result.rows.map(loan => ({
          ...loan,
          formattedAmount: formatCurrency(loan.amount),
          formattedCollateral: formatCurrency(loan.collateral),
          daysRemaining: loan.due_date ? Math.ceil((new Date(loan.due_date) - new Date()) / (1000 * 60 * 60 * 24)) : null
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: offset + limit < totalCount,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Get loans error:', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve loans',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   POST /api/lending/:loanId/repay
 * @desc    Repay a loan
 * @access  Private
 */
router.post('/:loanId/repay', [
  transactionLimiter,
  body('amount').isNumeric().custom(value => parseFloat(value) > 0).withMessage('Valid repayment amount required'),
  body('transactionHash').isLength({ min: 66, max: 66 }).matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Valid transaction hash required')
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

  const { loanId } = req.params;
  const { amount, transactionHash } = req.body;

  try {
    // Get loan details
    const loanResult = await query(
      'SELECT * FROM loans WHERE id = $1 AND user_id = $2',
      [loanId, req.user.id]
    );

    if (loanResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Loan not found',
        message: 'Loan not found or you do not have permission to access it',
        statusCode: 404
      });
    }

    const loan = loanResult.rows[0];

    if (loan.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Invalid loan status',
        message: 'Only active loans can be repaid',
        statusCode: 400
      });
    }

    // Calculate total amount due (principal + interest)
    const totalDue = calculateTotalDue(loan);
    
    if (parseFloat(amount) < totalDue) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient repayment amount',
        message: 'Repayment amount is less than total amount due',
        data: {
          amountProvided: amount,
          totalDue: totalDue.toFixed(18),
          shortfall: (totalDue - parseFloat(amount)).toFixed(18)
        },
        statusCode: 400
      });
    }

    // Process repayment
    const result = await transaction(async (client) => {
      // Update loan status
      await client.query(
        `UPDATE loans 
         SET status = 'repaid', repaid_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [loanId]
      );

      // Record payment
      await client.query(
        `INSERT INTO loan_payments 
         (user_id, loan_id, amount, status, transaction_hash, created_at)
         VALUES ($1, $2, $3, 'completed', $4, CURRENT_TIMESTAMP)`,
        [req.user.id, loanId, amount, transactionHash]
      );

      return { totalDue, overpayment: parseFloat(amount) - totalDue };
    });

    logger.info('Loan repaid:', {
      loanId,
      userId: req.user.id,
      address: req.user.address,
      amount,
      transactionHash
    });

    res.status(200).json({
      success: true,
      message: 'Loan repaid successfully',
      data: {
        loanId: parseInt(loanId),
        repaidAmount: amount,
        totalDue: result.totalDue.toFixed(18),
        overpayment: result.overpayment.toFixed(18),
        transactionHash,
        repaidAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Loan repayment error:', {
      loanId,
      userId: req.user.id,
      amount,
      transactionHash,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Loan repayment failed',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

// Helper functions
const calculateMinCreditScore = (amount) => {
  const loanAmount = parseFloat(amount);
  if (loanAmount <= 1000) return 500;
  if (loanAmount <= 5000) return 600;
  if (loanAmount <= 10000) return 650;
  return 700;
};

const calculateInterestRate = (creditScore, amount, duration) => {
  let baseRate = 10; // 10% base rate
  
  // Adjust based on credit score
  if (creditScore >= 750) baseRate -= 3;
  else if (creditScore >= 650) baseRate -= 1;
  else if (creditScore < 550) baseRate += 5;
  
  // Adjust based on loan amount
  const loanAmount = parseFloat(amount);
  if (loanAmount > 10000) baseRate += 1;
  if (loanAmount > 50000) baseRate += 2;
  
  // Adjust based on duration (longer = higher rate)
  const durationDays = duration / 86400;
  if (durationDays > 180) baseRate += 1;
  if (durationDays > 365) baseRate += 2;
  
  return Math.max(5, Math.min(25, baseRate)); // Min 5%, Max 25%
};

const calculateTotalDue = (loan) => {
  const principal = parseFloat(loan.amount);
  const rate = parseFloat(loan.interest_rate) / 100;
  const durationYears = loan.duration / (365 * 24 * 3600);
  
  return principal * (1 + rate * durationYears);
};

const formatCurrency = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0.00';
  return num.toFixed(6);
};

module.exports = router;
