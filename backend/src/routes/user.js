const express = require('express');
const { query: queryValidator, validationResult } = require('express-validator');
const { siweAuth, adminOnly } = require('../middleware/siweAuth');
const { apiLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/errorHandler');
const { getUserById, getAllUsers, getUserStats, searchUsers } = require('../models/User');
const logger = require('../utils/logger');
const { cache } = require('../utils/redis');

const router = express.Router();

/**
 * @route   GET /api/user/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/profile', asyncHandler(async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User profile not found',
        statusCode: 404
      });
    }

    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        id: user.id,
        address: user.wallet_address,
        isAdmin: user.is_admin,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login_at
      }
    });

  } catch (error) {
    logger.error('Get user profile error:', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user profile',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/user/dashboard
 * @desc    Get user dashboard data
 * @access  Private
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  try {
    // Try to get cached dashboard data
    const cacheKey = `user:dashboard:${req.user.id}`;
    let dashboardData = await cache.get(cacheKey);

    if (!dashboardData) {
      // Fetch dashboard data from various sources
      dashboardData = await getUserDashboardData(req.user.id);
      
      // Cache for 2 minutes
      await cache.set(cacheKey, dashboardData, 120);
    }

    res.status(200).json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboardData
    });

  } catch (error) {
    logger.error('Get user dashboard error:', {
      userId: req.user.id,
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
 * @route   GET /api/user/activity
 * @desc    Get user activity history
 * @access  Private
 */
router.get('/activity', [
  queryValidator('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  queryValidator('type').optional().isIn(['savings', 'lending', 'dex', 'governance']).withMessage('Invalid activity type')
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
    const activity = await getUserActivity({
      userId: req.user.id,
      page,
      limit,
      type
    });

    res.status(200).json({
      success: true,
      message: 'User activity retrieved successfully',
      data: activity
    });

  } catch (error) {
    logger.error('Get user activity error:', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user activity',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/user/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const cacheKey = `user:stats:${req.user.id}`;
    let stats = await cache.get(cacheKey);

    if (!stats) {
      stats = await getUserDetailedStats(req.user.id);
      
      // Cache for 5 minutes
      await cache.set(cacheKey, stats, 300);
    }

    res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logger.error('Get user stats error:', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user statistics',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/user/search
 * @desc    Search users (admin only)
 * @access  Private (Admin)
 */
router.get('/search', [
  adminOnly,
  queryValidator('q').notEmpty().withMessage('Search query is required'),
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

  const searchTerm = req.query.q;
  const limit = parseInt(req.query.limit) || 20;

  try {
    const users = await searchUsers(searchTerm, limit);

    res.status(200).json({
      success: true,
      message: 'User search completed successfully',
      data: {
        query: searchTerm,
        results: users,
        count: users.length
      }
    });

  } catch (error) {
    logger.error('Search users error:', {
      searchTerm,
      adminId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'User search failed',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/user/list
 * @desc    Get list of all users (admin only)
 * @access  Private (Admin)
 */
router.get('/list', [
  adminOnly,
  queryValidator('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  queryValidator('orderBy').optional().isIn(['id', 'wallet_address', 'created_at', 'updated_at', 'last_login_at']).withMessage('Invalid orderBy field'),
  queryValidator('orderDirection').optional().isIn(['ASC', 'DESC']).withMessage('Order direction must be ASC or DESC')
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
  const orderBy = req.query.orderBy || 'created_at';
  const orderDirection = req.query.orderDirection || 'DESC';
  const offset = (page - 1) * limit;

  try {
    const result = await getAllUsers(limit, offset, orderBy, orderDirection);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result
    });

  } catch (error) {
    logger.error('Get users list error:', {
      adminId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users list',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/user/admin-stats
 * @desc    Get user statistics for admin dashboard
 * @access  Private (Admin)
 */
router.get('/admin-stats', adminOnly, asyncHandler(async (req, res) => {
  try {
    const cacheKey = 'admin:user_stats';
    let stats = await cache.get(cacheKey);

    if (!stats) {
      stats = await getUserStats();
      
      // Cache for 10 minutes
      await cache.set(cacheKey, stats, 600);
    }

    res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logger.error('Get admin user stats error:', {
      adminId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user statistics',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * Helper function to get user dashboard data
 */
const getUserDashboardData = async (userId) => {
  try {
    const { query } = require('../utils/database');

    // Get savings data
    const savingsResult = await query(
      'SELECT balance, interest_earned FROM savings_accounts WHERE user_id = $1',
      [userId]
    );

    // Get credit score
    const creditResult = await query(
      'SELECT score FROM credit_scores WHERE user_id = $1',
      [userId]
    );

    // Get active loans
    const loansResult = await query(
      'SELECT COUNT(*) as count, SUM(amount) as total FROM loans WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );

    // Get recent activity count
    const activityResult = await query(
      `SELECT COUNT(*) as count FROM (
        SELECT created_at FROM savings_transactions WHERE user_id = $1
        UNION ALL
        SELECT created_at FROM dex_transactions WHERE user_id = $1
        UNION ALL
        SELECT created_at FROM loans WHERE user_id = $1
      ) activities WHERE created_at > NOW() - INTERVAL '30 days'`,
      [userId]
    );

    return {
      savings: {
        balance: savingsResult.rows[0]?.balance || '0',
        interestEarned: savingsResult.rows[0]?.interest_earned || '0'
      },
      creditScore: creditResult.rows[0]?.score || 0,
      loans: {
        active: parseInt(loansResult.rows[0]?.count || 0),
        totalAmount: loansResult.rows[0]?.total || '0'
      },
      recentActivity: parseInt(activityResult.rows[0]?.count || 0)
    };
  } catch (error) {
    logger.error('Get user dashboard data error:', error);
    throw error;
  }
};

/**
 * Helper function to get user activity
 */
const getUserActivity = async (params) => {
  try {
    const { userId, page, limit, type } = params;
    const offset = (page - 1) * limit;
    const { query } = require('../utils/database');

    let activities = [];

    if (!type || type === 'savings') {
      const savingsActivities = await query(
        `SELECT 'savings' as type, transaction_type as action, amount, created_at, transaction_hash
         FROM savings_transactions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      activities = activities.concat(savingsActivities.rows);
    }

    if (!type || type === 'dex') {
      const dexActivities = await query(
        `SELECT 'dex' as type, transaction_type as action, amount_a as amount, created_at, transaction_hash
         FROM dex_transactions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      activities = activities.concat(dexActivities.rows);
    }

    if (!type || type === 'lending') {
      const lendingActivities = await query(
        `SELECT 'lending' as type, 'loan_created' as action, amount, created_at, id::text as transaction_hash
         FROM loans 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      activities = activities.concat(lendingActivities.rows);
    }

    if (!type || type === 'governance') {
      const governanceActivities = await query(
        `SELECT 'governance' as type, 'vote' as action, voting_power as amount, created_at, transaction_hash
         FROM governance_votes 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      activities = activities.concat(governanceActivities.rows);
    }

    // Sort by created_at and limit
    activities = activities
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);

    return {
      activities,
      pagination: {
        currentPage: page,
        totalCount: activities.length,
        hasNext: activities.length === limit,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    logger.error('Get user activity error:', error);
    throw error;
  }
};

/**
 * Helper function to get detailed user statistics
 */
const getUserDetailedStats = async (userId) => {
  try {
    const { query } = require('../utils/database');

    // Get comprehensive user statistics
    const statsResult = await query(
      `SELECT 
        -- Savings stats
        (SELECT balance FROM savings_accounts WHERE user_id = $1) as savings_balance,
        (SELECT interest_earned FROM savings_accounts WHERE user_id = $1) as total_interest,
        
        -- Transaction counts
        (SELECT COUNT(*) FROM savings_transactions WHERE user_id = $1) as savings_transactions,
        (SELECT COUNT(*) FROM dex_transactions WHERE user_id = $1) as dex_transactions,
        (SELECT COUNT(*) FROM loans WHERE user_id = $1) as loan_count,
        (SELECT COUNT(*) FROM governance_votes WHERE user_id = $1) as votes_cast,
        
        -- Credit score
        (SELECT score FROM credit_scores WHERE user_id = $1) as credit_score`,
      [userId]
    );

    const stats = statsResult.rows[0] || {};

    return {
      financial: {
        savingsBalance: stats.savings_balance || '0',
        totalInterest: stats.total_interest || '0',
        creditScore: stats.credit_score || 0
      },
      activity: {
        savingsTransactions: parseInt(stats.savings_transactions || 0),
        dexTransactions: parseInt(stats.dex_transactions || 0),
        loanCount: parseInt(stats.loan_count || 0),
        votesCast: parseInt(stats.votes_cast || 0)
      }
    };
  } catch (error) {
    logger.error('Get user detailed stats error:', error);
    throw error;
  }
};

module.exports = router;
