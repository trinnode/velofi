const express = require('express');
const { body, query: queryValidator, param, validationResult } = require('express-validator');
const { siweAuth } = require('../middleware/siweAuth');
const { generalLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { cache } = require('../utils/redis');
const { query, transaction } = require('../utils/database');

const router = express.Router();

/**
 * @route   GET /api/governance/proposals
 * @desc    Get all governance proposals
 * @access  Public
 */
router.get('/proposals', [
  queryValidator('status').optional().isIn(['active', 'pending', 'executed', 'defeated', 'queued']).withMessage('Invalid status'),
  queryValidator('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  queryValidator('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  queryValidator('sort').optional().isIn(['created', 'deadline', 'votes']).withMessage('Invalid sort field')
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
  const sort = req.query.sort || 'created';
  const offset = (page - 1) * limit;

  try {
    const cacheKey = `governance:proposals:${status || 'all'}:${page}:${limit}:${sort}`;
    let result = await cache.get(cacheKey);

    if (!result) {
      let whereClause = '';
      let queryParams = [];

      if (status) {
        whereClause = 'WHERE status = $1';
        queryParams.push(status);
      }

      let orderBy = 'created_at DESC';
      if (sort === 'deadline') orderBy = 'voting_deadline ASC';
      if (sort === 'votes') orderBy = 'total_votes DESC';

      const proposalsResult = await query(
        `SELECT 
           p.*,
           u.address as proposer_address,
           COALESCE(v.vote_count, 0) as vote_count,
           COALESCE(v.for_votes, 0) as for_votes,
           COALESCE(v.against_votes, 0) as against_votes,
           CASE 
             WHEN p.voting_deadline > NOW() THEN 'active'
             WHEN p.status = 'pending' THEN 'pending'
             ELSE p.status
           END as current_status
         FROM governance_proposals p
         LEFT JOIN users u ON p.proposer_id = u.id
         LEFT JOIN (
           SELECT 
             proposal_id,
             COUNT(*) as vote_count,
             SUM(CASE WHEN vote = true THEN voting_power ELSE 0 END) as for_votes,
             SUM(CASE WHEN vote = false THEN voting_power ELSE 0 END) as against_votes
           FROM governance_votes
           GROUP BY proposal_id
         ) v ON p.id = v.proposal_id
         ${whereClause}
         ORDER BY ${orderBy}
         LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
        [...queryParams, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM governance_proposals ${whereClause}`,
        queryParams
      );

      const totalCount = parseInt(countResult.rows[0].count);

      result = {
        proposals: proposalsResult.rows,
        totalCount,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: offset + limit < totalCount,
          hasPrev: page > 1
        }
      };

      // Cache for 2 minutes
      await cache.set(cacheKey, result, 120);
    }

    res.status(200).json({
      success: true,
      message: 'Governance proposals retrieved successfully',
      data: result
    });

  } catch (error) {
    logger.error('Get governance proposals error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve proposals',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/governance/proposals/:id
 * @desc    Get a specific proposal with detailed information
 * @access  Public
 */
router.get('/proposals/:id', [
  param('id').isInt({ min: 1 }).withMessage('Valid proposal ID required')
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

  const proposalId = req.params.id;

  try {
    const cacheKey = `governance:proposal:${proposalId}`;
    let proposalData = await cache.get(cacheKey);

    if (!proposalData) {
      // Get proposal details
      const proposalResult = await query(
        `SELECT 
           p.*,
           u.address as proposer_address,
           COALESCE(v.vote_count, 0) as vote_count,
           COALESCE(v.for_votes, 0) as for_votes,
           COALESCE(v.against_votes, 0) as against_votes,
           CASE 
             WHEN p.voting_deadline > NOW() THEN 'active'
             WHEN p.status = 'pending' THEN 'pending'
             ELSE p.status
           END as current_status
         FROM governance_proposals p
         LEFT JOIN users u ON p.proposer_id = u.id
         LEFT JOIN (
           SELECT 
             proposal_id,
             COUNT(*) as vote_count,
             SUM(CASE WHEN vote = true THEN voting_power ELSE 0 END) as for_votes,
             SUM(CASE WHEN vote = false THEN voting_power ELSE 0 END) as against_votes
           FROM governance_votes
           GROUP BY proposal_id
         ) v ON p.id = v.proposal_id
         WHERE p.id = $1`,
        [proposalId]
      );

      if (proposalResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Proposal not found',
          statusCode: 404
        });
      }

      // Get recent votes
      const votesResult = await query(
        `SELECT 
           gv.vote,
           gv.voting_power,
           gv.created_at,
           u.address as voter_address
         FROM governance_votes gv
         LEFT JOIN users u ON gv.user_id = u.id
         WHERE gv.proposal_id = $1
         ORDER BY gv.created_at DESC
         LIMIT 20`,
        [proposalId]
      );

      proposalData = {
        proposal: proposalResult.rows[0],
        recentVotes: votesResult.rows
      };

      // Cache for 1 minute
      await cache.set(cacheKey, proposalData, 60);
    }

    res.status(200).json({
      success: true,
      message: 'Proposal details retrieved successfully',
      data: proposalData
    });

  } catch (error) {
    logger.error('Get proposal details error:', {
      proposalId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve proposal details',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   POST /api/governance/proposals
 * @desc    Create a new governance proposal
 * @access  Private
 */
router.post('/proposals', [
  siweAuth,
  generalLimiter,
  body('title').isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
  body('description').isLength({ min: 50, max: 5000 }).withMessage('Description must be between 50 and 5000 characters'),
  body('category').isIn(['protocol', 'treasury', 'governance', 'feature']).withMessage('Invalid category'),
  body('votingDeadline').isISO8601().withMessage('Valid voting deadline required'),
  body('executionData').optional().isString()
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

  const { title, description, category, votingDeadline, executionData } = req.body;

  try {
    // Check if user has minimum voting power to create proposals
    const userVotingPower = await getUserVotingPower(req.user.id);
    const minimumProposalPower = 1000; // Example threshold

    if (userVotingPower < minimumProposalPower) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient voting power',
        message: `Minimum ${minimumProposalPower} voting power required to create proposals`,
        data: { userVotingPower, required: minimumProposalPower },
        statusCode: 403
      });
    }

    // Validate voting deadline (must be at least 24 hours in future)
    const deadline = new Date(votingDeadline);
    const minDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    if (deadline < minDeadline) {
      return res.status(400).json({
        success: false,
        error: 'Invalid voting deadline',
        message: 'Voting deadline must be at least 24 hours in the future',
        statusCode: 400
      });
    }

    const result = await transaction(async (client) => {
      const proposalResult = await client.query(
        `INSERT INTO governance_proposals 
         (proposer_id, title, description, category, voting_deadline, execution_data, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', CURRENT_TIMESTAMP)
         RETURNING *`,
        [req.user.id, title, description, category, deadline, executionData || null]
      );

      return proposalResult.rows[0];
    });

    logger.info('Governance proposal created:', {
      proposalId: result.id,
      userId: req.user.id,
      userAddress: req.user.address,
      title,
      category,
      votingDeadline
    });

    // Clear proposals cache
    const cachePattern = 'governance:proposals:*';
    await cache.deletePattern(cachePattern);

    res.status(201).json({
      success: true,
      message: 'Governance proposal created successfully',
      data: {
        proposalId: result.id,
        title: result.title,
        description: result.description,
        category: result.category,
        votingDeadline: result.voting_deadline,
        status: result.status,
        createdAt: result.created_at
      }
    });

  } catch (error) {
    logger.error('Create governance proposal error:', {
      userId: req.user.id,
      title,
      category,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create proposal',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   POST /api/governance/proposals/:id/vote
 * @desc    Vote on a governance proposal
 * @access  Private
 */
router.post('/proposals/:id/vote', [
  siweAuth,
  generalLimiter,
  param('id').isInt({ min: 1 }).withMessage('Valid proposal ID required'),
  body('vote').isBoolean().withMessage('Vote must be true (for) or false (against)'),
  body('reason').optional().isLength({ max: 1000 }).withMessage('Reason must be less than 1000 characters')
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

  const proposalId = req.params.id;
  const { vote, reason } = req.body;

  try {
    // Check if proposal exists and is active
    const proposalResult = await query(
      'SELECT * FROM governance_proposals WHERE id = $1',
      [proposalId]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found',
        statusCode: 404
      });
    }

    const proposal = proposalResult.rows[0];

    // Check if voting is still active
    if (proposal.voting_deadline < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Voting period has ended',
        statusCode: 400
      });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Proposal is not accepting votes',
        message: `Proposal status: ${proposal.status}`,
        statusCode: 400
      });
    }

    // Check if user already voted
    const existingVote = await query(
      'SELECT * FROM governance_votes WHERE proposal_id = $1 AND user_id = $2',
      [proposalId, req.user.id]
    );

    if (existingVote.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Already voted',
        message: 'You have already voted on this proposal',
        statusCode: 409
      });
    }

    // Get user's voting power
    const votingPower = await getUserVotingPower(req.user.id);

    if (votingPower === 0) {
      return res.status(403).json({
        success: false,
        error: 'No voting power',
        message: 'You have no voting power for this proposal',
        statusCode: 403
      });
    }

    const result = await transaction(async (client) => {
      const voteResult = await client.query(
        `INSERT INTO governance_votes 
         (proposal_id, user_id, vote, voting_power, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING *`,
        [proposalId, req.user.id, vote, votingPower, reason || null]
      );

      return voteResult.rows[0];
    });

    logger.info('Governance vote cast:', {
      proposalId,
      userId: req.user.id,
      userAddress: req.user.address,
      vote,
      votingPower,
      reason
    });

    // Clear cache
    await cache.del(`governance:proposal:${proposalId}`);
    await cache.deletePattern('governance:proposals:*');

    res.status(201).json({
      success: true,
      message: 'Vote cast successfully',
      data: {
        voteId: result.id,
        proposalId: proposalId,
        vote: result.vote,
        votingPower: result.voting_power,
        reason: result.reason,
        timestamp: result.created_at
      }
    });

  } catch (error) {
    logger.error('Cast governance vote error:', {
      proposalId,
      userId: req.user.id,
      vote,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to cast vote',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/governance/user/votes
 * @desc    Get user's voting history
 * @access  Private
 */
router.get('/user/votes', [
  siweAuth,
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

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const result = await query(
      `SELECT 
         gv.*,
         gp.title,
         gp.category,
         gp.status as proposal_status
       FROM governance_votes gv
       JOIN governance_proposals gp ON gv.proposal_id = gp.id
       WHERE gv.user_id = $1
       ORDER BY gv.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM governance_votes WHERE user_id = $1',
      [req.user.id]
    );

    const totalCount = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      message: 'User voting history retrieved successfully',
      data: {
        votes: result.rows,
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
    logger.error('Get user voting history error:', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve voting history',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/governance/stats
 * @desc    Get governance statistics
 * @access  Public
 */
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const cacheKey = 'governance:stats';
    let stats = await cache.get(cacheKey);

    if (!stats) {
      const results = await Promise.all([
        query('SELECT COUNT(*) FROM governance_proposals'),
        query('SELECT COUNT(*) FROM governance_proposals WHERE status = \'pending\''),
        query('SELECT COUNT(*) FROM governance_proposals WHERE status = \'executed\''),
        query('SELECT COUNT(*) FROM governance_votes'),
        query('SELECT COUNT(DISTINCT user_id) FROM governance_votes'),
        query(`SELECT 
                 category,
                 COUNT(*) as count
               FROM governance_proposals 
               GROUP BY category
               ORDER BY count DESC`)
      ]);

      stats = {
        totalProposals: parseInt(results[0].rows[0].count),
        activeProposals: parseInt(results[1].rows[0].count),
        executedProposals: parseInt(results[2].rows[0].count),
        totalVotes: parseInt(results[3].rows[0].count),
        uniqueVoters: parseInt(results[4].rows[0].count),
        proposalsByCategory: results[5].rows
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, stats, 300);
    }

    res.status(200).json({
      success: true,
      message: 'Governance statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logger.error('Get governance stats error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve governance statistics',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

// Helper functions
const getUserVotingPower = async (userId) => {
  try {
    // In a real implementation, this would calculate voting power based on token holdings
    // For now, we'll use a simple mock calculation
    const result = await query(
      `SELECT 
         COALESCE(SUM(balance), 0) as total_balance
       FROM user_savings
       WHERE user_id = $1`,
      [userId]
    );

    const balance = parseFloat(result.rows[0]?.total_balance || 0);
    
    // Simple voting power calculation (1 token = 1 vote)
    return Math.floor(balance);
  } catch (error) {
    logger.error('Get user voting power error:', {
      userId,
      error: error.message
    });
    return 0;
  }
};

module.exports = router;
