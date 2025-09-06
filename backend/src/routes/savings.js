const express = require('express');
const { body, query: queryValidator, validationResult } = require('express-validator');
const { siweAuth } = require('../middleware/siweAuth');
const { transactionLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { cache } = require('../utils/redis');
const SavingsService = require('../services/savingsService');

const router = express.Router();

/**
 * @route   GET /api/savings/account
 * @desc    Get user's savings account information
 * @access  Private
 */
router.get('/account', asyncHandler(async (req, res) => {
  try {
    // Try to get cached data first
    const cacheKey = `savings:account:${req.user.address}`;
    let accountData = await cache.get(cacheKey);

    if (!accountData) {
      // Fetch from database
      accountData = await SavingsService.getSavingsAccount(req.user.id);
      
      if (accountData) {
        // Cache for 5 minutes
        await cache.set(cacheKey, accountData, 300);
      }
    }

    if (!accountData) {
      return res.status(404).json({
        success: false,
        error: 'Savings account not found',
        message: 'No savings account found for this user',
        statusCode: 404
      });
    }

    // Get current interest rate from blockchain
    const currentRate = await SavingsService.getCurrentInterestRate();

    res.status(200).json({
      success: true,
      message: 'Savings account retrieved successfully',
      data: {
        ...accountData,
        currentInterestRate: currentRate,
        formattedBalance: SavingsService.formatBalance(accountData.balance),
        formattedInterestEarned: SavingsService.formatBalance(accountData.interest_earned)
      }
    });

  } catch (error) {
    logger.error('Get savings account error:', {
      userId: req.user.id,
      address: req.user.address,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve savings account',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   POST /api/savings/deposit
 * @desc    Deposit tokens to savings account
 * @access  Private
 */
router.post('/deposit', [
  transactionLimiter,
  body('amount')
    .isNumeric()
    .custom((value) => {
      if (parseFloat(value) <= 0) {
        throw new Error('Deposit amount must be greater than 0');
      }
      return true;
    })
    .withMessage('Valid deposit amount is required'),
  body('transactionHash')
    .isLength({ min: 66, max: 66 })
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Valid transaction hash is required')
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

  const { amount, transactionHash } = req.body;

  try {
    // Check if transaction already processed
    const existingTx = await SavingsService.getTransactionByHash(transactionHash);
    if (existingTx) {
      return res.status(409).json({
        success: false,
        error: 'Transaction already processed',
        message: 'This transaction has already been processed',
        statusCode: 409
      });
    }

    // Verify transaction on blockchain
    const verification = await SavingsService.verifyDepositTransaction(
      transactionHash,
      req.user.address,
      amount
    );

    if (!verification.valid) {
      logger.logTransaction('Deposit verification failed', transactionHash, req.user.address, {
        reason: verification.reason,
        amount
      });

      return res.status(400).json({
        success: false,
        error: 'Transaction verification failed',
        message: verification.reason,
        statusCode: 400
      });
    }

    // Process the deposit
    const result = await SavingsService.processDeposit({
      userId: req.user.id,
      address: req.user.address,
      amount: amount,
      transactionHash: transactionHash,
      blockNumber: verification.blockNumber,
      gasUsed: verification.gasUsed,
      gasPrice: verification.gasPrice
    });

    // Clear cache
    await cache.del(`savings:account:${req.user.address}`);

    logger.logTransaction('Deposit processed', transactionHash, req.user.address, {
      amount,
      newBalance: result.newBalance,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Deposit processed successfully',
      data: {
        transactionHash,
        amount: amount,
        formattedAmount: SavingsService.formatBalance(amount),
        newBalance: result.newBalance,
        formattedNewBalance: SavingsService.formatBalance(result.newBalance),
        interestEarned: result.interestEarned,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Deposit processing error:', {
      userId: req.user.id,
      address: req.user.address,
      amount,
      transactionHash,
      error: error.message,
      stack: error.stack
    });

    // Handle specific errors
    if (error.message.includes('insufficient funds')) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient funds',
        message: 'Insufficient funds for this transaction',
        statusCode: 400
      });
    }

    if (error.message.includes('transaction not found')) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
        message: 'Transaction not found on the blockchain',
        statusCode: 404
      });
    }

    res.status(500).json({
      success: false,
      error: 'Deposit processing failed',
      message: 'Internal server error during deposit processing',
      statusCode: 500
    });
  }
}));

/**
 * @route   POST /api/savings/withdraw
 * @desc    Withdraw tokens from savings account
 * @access  Private
 */
router.post('/withdraw', [
  transactionLimiter,
  body('amount')
    .isNumeric()
    .custom((value) => {
      if (parseFloat(value) <= 0) {
        throw new Error('Withdrawal amount must be greater than 0');
      }
      return true;
    })
    .withMessage('Valid withdrawal amount is required')
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

  const { amount } = req.body;

  try {
    // Check current balance
    const account = await SavingsService.getSavingsAccount(req.user.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Savings account not found',
        message: 'No savings account found for this user',
        statusCode: 404
      });
    }

    if (parseFloat(account.balance) < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        message: 'Insufficient balance for withdrawal',
        data: {
          requestedAmount: amount,
          availableBalance: account.balance,
          formattedBalance: SavingsService.formatBalance(account.balance)
        },
        statusCode: 400
      });
    }

    // Process withdrawal (this would interact with blockchain)
    const result = await SavingsService.processWithdrawal({
      userId: req.user.id,
      address: req.user.address,
      amount: amount
    });

    // Clear cache
    await cache.del(`savings:account:${req.user.address}`);

    logger.logTransaction('Withdrawal processed', result.transactionHash, req.user.address, {
      amount,
      newBalance: result.newBalance,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Withdrawal processed successfully',
      data: {
        transactionHash: result.transactionHash,
        amount: amount,
        formattedAmount: SavingsService.formatBalance(amount),
        newBalance: result.newBalance,
        formattedNewBalance: SavingsService.formatBalance(result.newBalance),
        fee: result.fee,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Withdrawal processing error:', {
      userId: req.user.id,
      address: req.user.address,
      amount,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Withdrawal processing failed',
      message: 'Internal server error during withdrawal processing',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/savings/history
 * @desc    Get savings account transaction history
 * @access  Private
 */
router.get('/history', [
  queryValidator('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  queryValidator('type').optional().isIn(['deposit', 'withdrawal', 'interest']).withMessage('Type must be deposit, withdrawal, or interest')
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

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const type = req.query.type;

  try {
    const result = await SavingsService.getTransactionHistory({
      userId: req.user.id,
      page,
      limit,
      type
    });

    res.status(200).json({
      success: true,
      message: 'Transaction history retrieved successfully',
      data: result
    });

  } catch (error) {
    logger.error('Get transaction history error:', {
      userId: req.user.id,
      address: req.user.address,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve transaction history',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/savings/interest
 * @desc    Get current interest information
 * @access  Private
 */
router.get('/interest', asyncHandler(async (req, res) => {
  try {
    const interestInfo = await SavingsService.getInterestInfo(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Interest information retrieved successfully',
      data: interestInfo
    });

  } catch (error) {
    logger.error('Get interest info error:', {
      userId: req.user.id,
      address: req.user.address,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve interest information',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   POST /api/savings/compound
 * @desc    Compound interest into principal
 * @access  Private
 */
router.post('/compound', [
  transactionLimiter
], asyncHandler(async (req, res) => {
  try {
    const result = await SavingsService.compoundInterest(req.user.id, req.user.address);

    // Clear cache
    await cache.del(`savings:account:${req.user.address}`);

    logger.logTransaction('Interest compounded', result.transactionHash, req.user.address, {
      compoundedAmount: result.compoundedAmount,
      newBalance: result.newBalance,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Interest compounded successfully',
      data: {
        transactionHash: result.transactionHash,
        compoundedAmount: result.compoundedAmount,
        formattedCompoundedAmount: SavingsService.formatBalance(result.compoundedAmount),
        newBalance: result.newBalance,
        formattedNewBalance: SavingsService.formatBalance(result.newBalance),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Compound interest error:', {
      userId: req.user.id,
      address: req.user.address,
      error: error.message,
      stack: error.stack
    });

    if (error.message.includes('no interest to compound')) {
      return res.status(400).json({
        success: false,
        error: 'No interest to compound',
        message: 'There is no accumulated interest to compound',
        statusCode: 400
      });
    }

    res.status(500).json({
      success: false,
      error: 'Interest compounding failed',
      message: 'Internal server error during interest compounding',
      statusCode: 500
    });
  }
}));

module.exports = router;
