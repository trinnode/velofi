const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  verifySiweMessage, 
  generateAuthToken, 
  generateRefreshToken,
  generateNonce,
  isValidEthereumAddress 
} = require('../middleware/siweAuth');
const { authLimiter } = require('../middleware/rateLimit');
const { getUserByAddress, createUser, updateUserLastLogin } = require('../models/User');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @route   GET /api/auth/nonce
 * @desc    Generate a nonce for SIWE authentication
 * @access  Public
 */
router.get('/nonce', asyncHandler(async (req, res) => {
  const nonce = generateNonce();
  
  // Store nonce in session for verification
  req.session.nonce = nonce;
  
  logger.logAuth('Nonce generated', 'anonymous', true, { 
    sessionId: req.sessionID,
    ip: req.ip 
  });

  res.status(200).json({
    success: true,
    nonce,
    message: 'Nonce generated successfully'
  });
}));

/**
 * @route   POST /api/auth/verify
 * @desc    Verify SIWE message and authenticate user
 * @access  Public
 */
router.post('/verify', [
  authLimiter,
  body('message').notEmpty().withMessage('SIWE message is required'),
  body('signature').notEmpty().withMessage('Signature is required'),
  body('address').custom((value) => {
    if (!isValidEthereumAddress(value)) {
      throw new Error('Invalid Ethereum address');
    }
    return true;
  })
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.logAuth('Verification failed', req.body.address || 'unknown', false, {
      errors: errors.array(),
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
      statusCode: 400
    });
  }

  const { message, signature, address } = req.body;
  const sessionNonce = req.session.nonce;

  try {
    // Parse SIWE message to check nonce
    const parsedMessage = JSON.parse(message);
    
    if (!sessionNonce || parsedMessage.nonce !== sessionNonce) {
      logger.logAuth('Invalid nonce', address, false, {
        sessionNonce,
        messageNonce: parsedMessage.nonce,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        error: 'Invalid nonce',
        message: 'Nonce mismatch or expired session',
        statusCode: 400
      });
    }

    // Verify SIWE message
    const verification = await verifySiweMessage(message, signature);
    
    if (!verification.success) {
      logger.logAuth('SIWE verification failed', address, false, {
        error: verification.error,
        ip: req.ip
      });

      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: verification.error,
        statusCode: 401
      });
    }

    const normalizedAddress = address.toLowerCase();

    // Check if user exists, create if not
    let user = await getUserByAddress(normalizedAddress);
    
    if (!user) {
      user = await createUser({
        wallet_address: normalizedAddress,
        nonce: sessionNonce
      });
      
      logger.logAuth('New user created', normalizedAddress, true, {
        userId: user.id,
        ip: req.ip
      });
    } else {
      // Update last login
      await updateUserLastLogin(user.id);
      
      logger.logAuth('Existing user login', normalizedAddress, true, {
        userId: user.id,
        ip: req.ip
      });
    }

    // Generate tokens
    const accessToken = generateAuthToken(normalizedAddress);
    const refreshToken = generateRefreshToken(normalizedAddress);

    // Clear the nonce from session
    delete req.session.nonce;

    // Store user session
    req.session.userId = user.id;
    req.session.userAddress = normalizedAddress;

    logger.logAuth('Authentication successful', normalizedAddress, true, {
      userId: user.id,
      sessionId: req.sessionID,
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: user.id,
        address: user.wallet_address,
        isAdmin: user.is_admin,
        createdAt: user.created_at,
        lastLogin: user.last_login_at
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });

  } catch (error) {
    logger.logAuth('Authentication error', address, false, {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Internal server error during authentication',
      statusCode: 500
    });
  }
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', [
  authLimiter,
  body('refreshToken').notEmpty().withMessage('Refresh token is required')
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

  const { refreshToken } = req.body;

  try {
    // Verify refresh token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        message: 'Not a refresh token',
        statusCode: 401
      });
    }

    // Check if user still exists and is active
    const user = await getUserByAddress(decoded.address);
    
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        message: 'Authentication failed',
        statusCode: 401
      });
    }

    // Generate new access token
    const newAccessToken = generateAuthToken(decoded.address);

    logger.logAuth('Token refreshed', decoded.address, true, {
      userId: user.id,
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      tokens: {
        accessToken: newAccessToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      logger.logAuth('Token refresh failed', 'unknown', false, {
        error: error.message,
        ip: req.ip
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        message: 'Please login again',
        statusCode: 401
      });
    }

    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate session
 * @access  Private
 */
router.post('/logout', asyncHandler(async (req, res) => {
  const sessionId = req.sessionID;
  const userAddress = req.session?.userAddress;

  // Destroy session
  req.session.destroy((error) => {
    if (error) {
      logger.error('Session destruction failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Logout failed',
        message: 'Could not destroy session',
        statusCode: 500
      });
    }

    logger.logAuth('User logged out', userAddress || 'unknown', true, {
      sessionId,
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  });
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user information
 * @access  Private
 */
router.get('/me', require('../middleware/siweAuth').siweAuth, asyncHandler(async (req, res) => {
  try {
    const user = await getUserByAddress(req.user.address);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User data not found',
        statusCode: 404
      });
    }

    res.status(200).json({
      success: true,
      message: 'User data retrieved successfully',
      user: {
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
    logger.error('Get user data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user data',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', [
  require('../middleware/siweAuth').siweAuth,
  // Add validation middleware as needed for profile updates
], asyncHandler(async (req, res) => {
  try {
    // For now, this is a placeholder since we only store wallet address
    // In the future, you might want to add fields like email, username, etc.
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: req.user.id,
        address: req.user.address,
        isAdmin: req.user.isAdmin,
        lastLogin: req.user.lastLogin
      }
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Profile update failed',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

module.exports = router;
