const express = require('express');
const { body, query: queryValidator, param, validationResult } = require('express-validator');
const { siweAuth } = require('../middleware/siweAuth');
const { adminAuth } = require('../middleware/adminAuth');
const { generalLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { cache } = require('../utils/redis');
const { query, transaction } = require('../utils/database');

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(siweAuth);
router.use(adminAuth);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Admin
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  try {
    const cacheKey = 'admin:dashboard';
    let dashboardData = await cache.get(cacheKey);

    if (!dashboardData) {
      const results = await Promise.all([
        // User statistics
        query('SELECT COUNT(*) FROM users'),
        query('SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL \'24 hours\''),
        query('SELECT COUNT(*) FROM users WHERE last_login > NOW() - INTERVAL \'24 hours\''),
        
        // Transaction statistics
        query('SELECT COUNT(*) FROM user_transactions'),
        query('SELECT COUNT(*) FROM user_transactions WHERE created_at > NOW() - INTERVAL \'24 hours\''),
        query('SELECT SUM(amount) FROM user_transactions WHERE transaction_type = \'deposit\' AND created_at > NOW() - INTERVAL \'24 hours\''),
        
        // Savings statistics
        query('SELECT COUNT(*) FROM user_savings'),
        query('SELECT SUM(balance) FROM user_savings'),
        query('SELECT AVG(balance) FROM user_savings WHERE balance > 0'),
        
        // DEX statistics
        query('SELECT COUNT(*) FROM dex_transactions'),
        query('SELECT SUM(amount_a) FROM dex_transactions WHERE created_at > NOW() - INTERVAL \'24 hours\''),
        
        // Lending statistics
        query('SELECT COUNT(*) FROM loans'),
        query('SELECT COUNT(*) FROM loans WHERE status = \'active\''),
        query('SELECT SUM(amount) FROM loans WHERE status = \'active\''),
        
        // Governance statistics
        query('SELECT COUNT(*) FROM governance_proposals'),
        query('SELECT COUNT(*) FROM governance_votes'),
        
        // System health
        query('SELECT COUNT(*) FROM blockchain_events WHERE created_at > NOW() - INTERVAL \'1 hour\''),
      ]);

      dashboardData = {
        users: {
          total: parseInt(results[0].rows[0].count),
          newToday: parseInt(results[1].rows[0].count),
          activeToday: parseInt(results[2].rows[0].count)
        },
        transactions: {
          total: parseInt(results[3].rows[0].count),
          todayCount: parseInt(results[4].rows[0].count),
          todayVolume: parseFloat(results[5].rows[0].sum || 0)
        },
        savings: {
          totalAccounts: parseInt(results[6].rows[0].count),
          totalValue: parseFloat(results[7].rows[0].sum || 0),
          averageBalance: parseFloat(results[8].rows[0].avg || 0)
        },
        dex: {
          totalTrades: parseInt(results[9].rows[0].count),
          todayVolume: parseFloat(results[10].rows[0].sum || 0)
        },
        lending: {
          totalLoans: parseInt(results[11].rows[0].count),
          activeLoans: parseInt(results[12].rows[0].count),
          activeLoanValue: parseFloat(results[13].rows[0].sum || 0)
        },
        governance: {
          totalProposals: parseInt(results[14].rows[0].count),
          totalVotes: parseInt(results[15].rows[0].count)
        },
        system: {
          recentEvents: parseInt(results[16].rows[0].count),
          lastUpdated: new Date().toISOString()
        }
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, dashboardData, 300);
    }

    res.status(200).json({
      success: true,
      message: 'Admin dashboard data retrieved successfully',
      data: dashboardData
    });

  } catch (error) {
    logger.error('Admin dashboard error:', {
      adminId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering and pagination
 * @access  Admin
 */
router.get('/users', [
  queryValidator('search').optional().isLength({ min: 1 }).withMessage('Search term required'),
  queryValidator('status').optional().isIn(['active', 'inactive', 'banned']).withMessage('Invalid status'),
  queryValidator('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  queryValidator('sortBy').optional().isIn(['created_at', 'last_login', 'total_balance']).withMessage('Invalid sort field'),
  queryValidator('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
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

  const search = req.query.search;
  const status = req.query.status;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const sortBy = req.query.sortBy || 'created_at';
  const sortOrder = req.query.sortOrder || 'desc';
  const offset = (page - 1) * limit;

  try {
    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    if (search) {
      whereClause += ` AND (u.address ILIKE $${queryParams.length + 1} OR u.email ILIKE $${queryParams.length + 1})`;
      queryParams.push(`%${search}%`);
    }

    if (status) {
      whereClause += ` AND u.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    const usersResult = await query(
      `SELECT 
         u.id,
         u.address,
         u.email,
         u.status,
         u.role,
         u.created_at,
         u.last_login,
         COALESCE(s.total_balance, 0) as total_balance,
         COALESCE(t.transaction_count, 0) as transaction_count,
         COALESCE(l.active_loans, 0) as active_loans
       FROM users u
       LEFT JOIN (
         SELECT user_id, SUM(balance) as total_balance
         FROM user_savings
         GROUP BY user_id
       ) s ON u.id = s.user_id
       LEFT JOIN (
         SELECT user_id, COUNT(*) as transaction_count
         FROM user_transactions
         GROUP BY user_id
       ) t ON u.id = t.user_id
       LEFT JOIN (
         SELECT user_id, COUNT(*) as active_loans
         FROM loans
         WHERE status = 'active'
         GROUP BY user_id
       ) l ON u.id = l.user_id
       ${whereClause}
       ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      queryParams
    );

    const totalCount = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: usersResult.rows,
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
    logger.error('Admin get users error:', {
      adminId: req.user.id,
      search,
      status,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Update user status
 * @access  Admin
 */
router.put('/users/:id/status', [
  generalLimiter,
  param('id').isInt({ min: 1 }).withMessage('Valid user ID required'),
  body('status').isIn(['active', 'inactive', 'banned']).withMessage('Invalid status'),
  body('reason').optional().isLength({ min: 5, max: 500 }).withMessage('Reason must be between 5 and 500 characters')
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

  const userId = req.params.id;
  const { status, reason } = req.body;

  try {
    // Check if user exists
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        statusCode: 404
      });
    }

    const user = userResult.rows[0];

    // Prevent admin from changing their own status
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change your own status',
        statusCode: 400
      });
    }

    const result = await transaction(async (client) => {
      // Update user status
      const updateResult = await client.query(
        'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, userId]
      );

      // Log admin action
      await client.query(
        `INSERT INTO admin_actions 
         (admin_id, action_type, target_type, target_id, details, created_at)
         VALUES ($1, 'status_change', 'user', $2, $3, CURRENT_TIMESTAMP)`,
        [req.user.id, userId, JSON.stringify({ oldStatus: user.status, newStatus: status, reason })]
      );

      return updateResult.rows[0];
    });

    logger.info('User status changed by admin:', {
      adminId: req.user.id,
      adminAddress: req.user.address,
      userId,
      userAddress: user.address,
      oldStatus: user.status,
      newStatus: status,
      reason
    });

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      data: {
        userId: result.id,
        address: result.address,
        oldStatus: user.status,
        newStatus: result.status,
        updatedAt: result.updated_at
      }
    });

  } catch (error) {
    logger.error('Admin update user status error:', {
      adminId: req.user.id,
      userId,
      status,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/admin/transactions
 * @desc    Get all transactions with filtering
 * @access  Admin
 */
router.get('/transactions', [
  queryValidator('type').optional().isIn(['deposit', 'withdrawal', 'swap', 'loan', 'repayment']).withMessage('Invalid transaction type'),
  queryValidator('userId').optional().isInt({ min: 1 }).withMessage('Valid user ID required'),
  queryValidator('status').optional().isIn(['pending', 'completed', 'failed']).withMessage('Invalid status'),
  queryValidator('startDate').optional().isISO8601().withMessage('Valid start date required'),
  queryValidator('endDate').optional().isISO8601().withMessage('Valid end date required'),
  queryValidator('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
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

  const { type, userId, status, startDate, endDate } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  try {
    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    if (type) {
      whereClause += ` AND transaction_type = $${queryParams.length + 1}`;
      queryParams.push(type);
    }

    if (userId) {
      whereClause += ` AND user_id = $${queryParams.length + 1}`;
      queryParams.push(userId);
    }

    if (status) {
      whereClause += ` AND status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    if (startDate) {
      whereClause += ` AND created_at >= $${queryParams.length + 1}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${queryParams.length + 1}`;
      queryParams.push(endDate);
    }

    const transactionsResult = await query(
      `SELECT 
         ut.*,
         u.address as user_address
       FROM user_transactions ut
       LEFT JOIN users u ON ut.user_id = u.id
       ${whereClause}
       ORDER BY ut.created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM user_transactions ut ${whereClause}`,
      queryParams
    );

    const totalCount = parseInt(countResult.rows[0].count);

    // Get summary statistics
    const statsResult = await query(
      `SELECT 
         transaction_type,
         status,
         COUNT(*) as count,
         SUM(amount) as total_amount
       FROM user_transactions ut
       ${whereClause}
       GROUP BY transaction_type, status
       ORDER BY transaction_type, status`,
      queryParams
    );

    res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: {
        transactions: transactionsResult.rows,
        statistics: statsResult.rows,
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
    logger.error('Admin get transactions error:', {
      adminId: req.user.id,
      filters: { type, userId, status, startDate, endDate },
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve transactions',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/admin/system/health
 * @desc    Get system health status
 * @access  Admin
 */
router.get('/system/health', asyncHandler(async (req, res) => {
  try {
    const cacheKey = 'admin:system_health';
    let healthData = await cache.get(cacheKey);

    if (!healthData) {
      const results = await Promise.all([
        // Database connection test
        query('SELECT NOW()'),
        
        // Recent blockchain events
        query('SELECT COUNT(*) FROM blockchain_events WHERE created_at > NOW() - INTERVAL \'1 hour\''),
        
        // Failed transactions in last hour
        query('SELECT COUNT(*) FROM user_transactions WHERE status = \'failed\' AND created_at > NOW() - INTERVAL \'1 hour\''),
        
        // Active user sessions
        query('SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE expires_at > NOW()'),
        
        // System errors in last hour
        query('SELECT COUNT(*) FROM system_logs WHERE level = \'error\' AND created_at > NOW() - INTERVAL \'1 hour\'')
      ]);

      const dbConnected = results[0].rows.length > 0;
      const recentEvents = parseInt(results[1].rows[0].count);
      const failedTxs = parseInt(results[2].rows[0].count);
      const activeSessions = parseInt(results[3].rows[0].count);
      const systemErrors = parseInt(results[4].rows[0].count);

      // Determine overall health status
      let status = 'healthy';
      let issues = [];

      if (!dbConnected) {
        status = 'critical';
        issues.push('Database connection failed');
      }

      if (recentEvents === 0) {
        status = status === 'healthy' ? 'warning' : status;
        issues.push('No recent blockchain events');
      }

      if (failedTxs > 10) {
        status = 'warning';
        issues.push(`High number of failed transactions: ${failedTxs}`);
      }

      if (systemErrors > 5) {
        status = status === 'healthy' ? 'warning' : status;
        issues.push(`System errors detected: ${systemErrors}`);
      }

      healthData = {
        status,
        issues,
        metrics: {
          databaseConnected: dbConnected,
          recentBlockchainEvents: recentEvents,
          failedTransactionsLastHour: failedTxs,
          activeUserSessions: activeSessions,
          systemErrorsLastHour: systemErrors
        },
        timestamp: new Date().toISOString()
      };

      // Cache for 1 minute
      await cache.set(cacheKey, healthData, 60);
    }

    res.status(200).json({
      success: true,
      message: 'System health retrieved successfully',
      data: healthData
    });

  } catch (error) {
    logger.error('Admin system health check error:', {
      adminId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to check system health',
      message: 'Internal server error',
      statusCode: 500,
      data: {
        status: 'critical',
        issues: ['Health check system failure'],
        timestamp: new Date().toISOString()
      }
    });
  }
}));

/**
 * @route   GET /api/admin/actions
 * @desc    Get admin action history
 * @access  Admin
 */
router.get('/actions', [
  queryValidator('adminId').optional().isInt({ min: 1 }).withMessage('Valid admin ID required'),
  queryValidator('actionType').optional().isAlpha().withMessage('Valid action type required'),
  queryValidator('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
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

  const { adminId, actionType } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    if (adminId) {
      whereClause += ` AND admin_id = $${queryParams.length + 1}`;
      queryParams.push(adminId);
    }

    if (actionType) {
      whereClause += ` AND action_type = $${queryParams.length + 1}`;
      queryParams.push(actionType);
    }

    const actionsResult = await query(
      `SELECT 
         aa.*,
         u.address as admin_address
       FROM admin_actions aa
       LEFT JOIN users u ON aa.admin_id = u.id
       ${whereClause}
       ORDER BY aa.created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM admin_actions aa ${whereClause}`,
      queryParams
    );

    const totalCount = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      message: 'Admin actions retrieved successfully',
      data: {
        actions: actionsResult.rows,
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
    logger.error('Admin get actions error:', {
      adminId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin actions',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

module.exports = router;
