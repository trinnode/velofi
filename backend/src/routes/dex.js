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
 * @route   POST /api/dex/swap
 * @desc    Execute a token swap
 * @access  Private
 */
router.post('/swap', [
  transactionLimiter,
  body('tokenA').isEthereumAddress().withMessage('Valid token A address required'),
  body('tokenB').isEthereumAddress().withMessage('Valid token B address required'),
  body('amountA').isNumeric().custom(value => parseFloat(value) > 0).withMessage('Valid amount A required'),
  body('expectedAmountB').isNumeric().custom(value => parseFloat(value) > 0).withMessage('Valid expected amount B required'),
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

  const { tokenA, tokenB, amountA, expectedAmountB, transactionHash } = req.body;

  try {
    // Check if transaction already processed
    const existingTx = await query(
      'SELECT * FROM dex_transactions WHERE transaction_hash = $1',
      [transactionHash]
    );

    if (existingTx.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Transaction already processed',
        message: 'This transaction has already been processed',
        statusCode: 409
      });
    }

    // Get current market rates
    const rate = await getExchangeRate(tokenA, tokenB);
    const actualAmountB = parseFloat(amountA) * rate;
    
    // Check slippage tolerance (5%)
    const slippageTolerance = 0.05;
    const minExpected = parseFloat(expectedAmountB) * (1 - slippageTolerance);
    const maxExpected = parseFloat(expectedAmountB) * (1 + slippageTolerance);

    if (actualAmountB < minExpected || actualAmountB > maxExpected) {
      return res.status(400).json({
        success: false,
        error: 'Slippage tolerance exceeded',
        message: 'Price has moved beyond acceptable slippage tolerance',
        data: {
          expectedAmountB,
          actualAmountB: actualAmountB.toFixed(18),
          slippage: ((Math.abs(actualAmountB - parseFloat(expectedAmountB)) / parseFloat(expectedAmountB)) * 100).toFixed(2)
        },
        statusCode: 400
      });
    }

    // Record swap transaction
    const result = await transaction(async (client) => {
      const swapResult = await client.query(
        `INSERT INTO dex_transactions 
         (user_id, transaction_hash, transaction_type, token_a_address, token_b_address, amount_a, amount_b, status, created_at)
         VALUES ($1, $2, 'swap', $3, $4, $5, $6, 'completed', CURRENT_TIMESTAMP)
         RETURNING *`,
        [req.user.id, transactionHash, tokenA, tokenB, amountA, actualAmountB]
      );

      return swapResult.rows[0];
    });

    logger.logTransaction('Swap completed', transactionHash, req.user.address, {
      tokenA,
      tokenB,
      amountA,
      amountB: actualAmountB,
      rate
    });

    res.status(200).json({
      success: true,
      message: 'Swap completed successfully',
      data: {
        transactionId: result.id,
        transactionHash,
        tokenA,
        tokenB,
        amountA,
        amountB: actualAmountB.toFixed(18),
        rate: rate.toFixed(18),
        timestamp: result.created_at
      }
    });

  } catch (error) {
    logger.error('Swap error:', {
      userId: req.user.id,
      tokenA,
      tokenB,
      amountA,
      transactionHash,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Swap failed',
      message: 'Internal server error during swap',
      statusCode: 500
    });
  }
}));

/**
 * @route   POST /api/dex/liquidity/add
 * @desc    Add liquidity to a pool
 * @access  Private
 */
router.post('/liquidity/add', [
  transactionLimiter,
  body('tokenA').isEthereumAddress().withMessage('Valid token A address required'),
  body('tokenB').isEthereumAddress().withMessage('Valid token B address required'),
  body('amountA').isNumeric().custom(value => parseFloat(value) > 0).withMessage('Valid amount A required'),
  body('amountB').isNumeric().custom(value => parseFloat(value) > 0).withMessage('Valid amount B required'),
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

  const { tokenA, tokenB, amountA, amountB, transactionHash } = req.body;

  try {
    // Check if transaction already processed
    const existingTx = await query(
      'SELECT * FROM dex_transactions WHERE transaction_hash = $1',
      [transactionHash]
    );

    if (existingTx.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Transaction already processed',
        message: 'This transaction has already been processed',
        statusCode: 409
      });
    }

    // Calculate liquidity tokens to be minted (simplified)
    const liquidityTokens = Math.sqrt(parseFloat(amountA) * parseFloat(amountB));

    // Record liquidity addition
    const result = await transaction(async (client) => {
      const liquidityResult = await client.query(
        `INSERT INTO dex_transactions 
         (user_id, transaction_hash, transaction_type, token_a_address, token_b_address, amount_a, amount_b, status, created_at)
         VALUES ($1, $2, 'add_liquidity', $3, $4, $5, $6, 'completed', CURRENT_TIMESTAMP)
         RETURNING *`,
        [req.user.id, transactionHash, tokenA, tokenB, amountA, amountB]
      );

      return liquidityResult.rows[0];
    });

    logger.logTransaction('Liquidity added', transactionHash, req.user.address, {
      tokenA,
      tokenB,
      amountA,
      amountB,
      liquidityTokens
    });

    res.status(200).json({
      success: true,
      message: 'Liquidity added successfully',
      data: {
        transactionId: result.id,
        transactionHash,
        tokenA,
        tokenB,
        amountA,
        amountB,
        liquidityTokens: liquidityTokens.toFixed(18),
        timestamp: result.created_at
      }
    });

  } catch (error) {
    logger.error('Add liquidity error:', {
      userId: req.user.id,
      tokenA,
      tokenB,
      transactionHash,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Add liquidity failed',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/dex/pairs
 * @desc    Get available trading pairs
 * @access  Public
 */
router.get('/pairs', asyncHandler(async (req, res) => {
  try {
    const cacheKey = 'dex:trading_pairs';
    let pairs = await cache.get(cacheKey);

    if (!pairs) {
      // Get unique token pairs from transactions
      const result = await query(
        `SELECT DISTINCT 
           token_a_address,
           token_b_address,
           COUNT(*) as transaction_count,
           SUM(amount_a) as total_volume_a,
           SUM(amount_b) as total_volume_b,
           MAX(created_at) as last_trade
         FROM dex_transactions 
         WHERE transaction_type = 'swap'
         GROUP BY token_a_address, token_b_address
         ORDER BY transaction_count DESC`
      );

      pairs = result.rows.map(pair => ({
        tokenA: pair.token_a_address,
        tokenB: pair.token_b_address,
        transactionCount: parseInt(pair.transaction_count),
        totalVolumeA: pair.total_volume_a,
        totalVolumeB: pair.total_volume_b,
        lastTrade: pair.last_trade
      }));

      // Cache for 5 minutes
      await cache.set(cacheKey, pairs, 300);
    }

    res.status(200).json({
      success: true,
      message: 'Trading pairs retrieved successfully',
      data: {
        pairs,
        count: pairs.length
      }
    });

  } catch (error) {
    logger.error('Get trading pairs error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve trading pairs',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/dex/rate/:tokenA/:tokenB
 * @desc    Get exchange rate between two tokens
 * @access  Public
 */
router.get('/rate/:tokenA/:tokenB', asyncHandler(async (req, res) => {
  const { tokenA, tokenB } = req.params;

  // Basic validation
  if (!tokenA.match(/^0x[a-fA-F0-9]{40}$/) || !tokenB.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid token address format',
      statusCode: 400
    });
  }

  try {
    const cacheKey = `dex:rate:${tokenA.toLowerCase()}:${tokenB.toLowerCase()}`;
    let rateData = await cache.get(cacheKey);

    if (!rateData) {
      const rate = await getExchangeRate(tokenA, tokenB);
      const reverseRate = 1 / rate;

      // Get 24h volume and price change
      const volumeData = await get24hVolumeAndChange(tokenA, tokenB);

      rateData = {
        tokenA,
        tokenB,
        rate: rate.toFixed(18),
        reverseRate: reverseRate.toFixed(18),
        volume24h: volumeData.volume,
        priceChange24h: volumeData.priceChange,
        lastUpdated: new Date().toISOString()
      };

      // Cache for 1 minute
      await cache.set(cacheKey, rateData, 60);
    }

    res.status(200).json({
      success: true,
      message: 'Exchange rate retrieved successfully',
      data: rateData
    });

  } catch (error) {
    logger.error('Get exchange rate error:', {
      tokenA,
      tokenB,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve exchange rate',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/dex/transactions
 * @desc    Get user's DEX transaction history
 * @access  Private
 */
router.get('/transactions', [
  queryValidator('type').optional().isIn(['swap', 'add_liquidity', 'remove_liquidity']).withMessage('Invalid transaction type'),
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

  const type = req.query.type;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    let whereClause = 'WHERE user_id = $1';
    let queryParams = [req.user.id];

    if (type) {
      whereClause += ' AND transaction_type = $2';
      queryParams.push(type);
    }

    const result = await query(
      `SELECT * FROM dex_transactions 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM dex_transactions ${whereClause}`,
      queryParams
    );

    const totalCount = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      message: 'DEX transactions retrieved successfully',
      data: {
        transactions: result.rows,
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
    logger.error('Get DEX transactions error:', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve DEX transactions',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

// Helper functions
const getExchangeRate = async (tokenA, tokenB) => {
  try {
    // In a real implementation, this would fetch rates from the DEX contract or price oracles
    // For now, we'll use a simplified mock rate
    
    const cacheKey = `rate:${tokenA.toLowerCase()}:${tokenB.toLowerCase()}`;
    let rate = await cache.get(cacheKey);

    if (rate === null) {
      // Mock exchange rate calculation based on recent transactions
      const recentTrades = await query(
        `SELECT amount_a, amount_b 
         FROM dex_transactions 
         WHERE token_a_address = $1 AND token_b_address = $2 
         AND transaction_type = 'swap'
         AND created_at > NOW() - INTERVAL '1 hour'
         ORDER BY created_at DESC
         LIMIT 10`,
        [tokenA, tokenB]
      );

      if (recentTrades.rows.length > 0) {
        // Calculate average rate from recent trades
        const totalA = recentTrades.rows.reduce((sum, trade) => sum + parseFloat(trade.amount_a), 0);
        const totalB = recentTrades.rows.reduce((sum, trade) => sum + parseFloat(trade.amount_b), 0);
        rate = totalB / totalA;
      } else {
        // Default rate if no recent trades
        rate = 1.0 + (Math.random() - 0.5) * 0.1; // ±5% from 1:1
      }

      // Cache for 30 seconds
      await cache.set(cacheKey, rate, 30);
    }

    return parseFloat(rate);
  } catch (error) {
    logger.error('Get exchange rate error:', error);
    return 1.0; // Default 1:1 rate
  }
};

const get24hVolumeAndChange = async (tokenA, tokenB) => {
  try {
    const result = await query(
      `SELECT 
         SUM(amount_a) as volume_a,
         SUM(amount_b) as volume_b,
         COUNT(*) as trade_count,
         MIN(created_at) as first_trade,
         MAX(created_at) as last_trade
       FROM dex_transactions 
       WHERE token_a_address = $1 AND token_b_address = $2
       AND transaction_type = 'swap'
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [tokenA, tokenB]
    );

    const data = result.rows[0] || {};
    
    return {
      volume: (parseFloat(data.volume_a || 0) + parseFloat(data.volume_b || 0)).toFixed(18),
      priceChange: '0.00', // Mock price change - would calculate from first/last trade prices
      tradeCount: parseInt(data.trade_count || 0)
    };
  } catch (error) {
    logger.error('Get 24h volume error:', error);
    return {
      volume: '0',
      priceChange: '0.00',
      tradeCount: 0
    };
  }
};

module.exports = router;
