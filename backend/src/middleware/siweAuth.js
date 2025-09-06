const { SiweMessage } = require('siwe');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { getUserByAddress, createUser } = require('../models/User');

/**
 * SIWE Authentication Middleware
 * Handles Sign-In with Ethereum authentication
 */
const siweAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided or invalid token format',
        statusCode: 401
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user exists in database
      const user = await getUserByAddress(decoded.address);
      
      if (!user) {
        return res.status(401).json({
          error: 'Access denied',
          message: 'User not found',
          statusCode: 401
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'User account is deactivated',
          statusCode: 403
        });
      }

      // Add user info to request object
      req.user = {
        id: user.id,
        address: user.wallet_address,
        isAdmin: user.is_admin,
        createdAt: user.created_at,
        lastLogin: user.last_login_at
      };

      // Update last activity
      await updateUserLastActivity(user.id);

      next();
    } catch (jwtError) {
      logger.warn('JWT verification failed:', jwtError.message);
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid or expired token',
        statusCode: 401
      });
    }

  } catch (error) {
    logger.error('SIWE auth middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed',
      statusCode: 500
    });
  }
};

/**
 * SIWE Message Verification
 * Verifies a SIWE message signature
 */
const verifySiweMessage = async (message, signature) => {
  try {
    const siweMessage = new SiweMessage(message);
    
    // Verify the signature
    const fields = await siweMessage.verify({ signature });
    
    // Validate message fields
    if (!fields.success) {
      throw new Error('SIWE message verification failed');
    }

    // Check if message is not expired
    const now = new Date();
    if (siweMessage.expirationTime && new Date(siweMessage.expirationTime) < now) {
      throw new Error('SIWE message has expired');
    }

    // Check if message is not used too early
    if (siweMessage.notBefore && new Date(siweMessage.notBefore) > now) {
      throw new Error('SIWE message is not valid yet');
    }

    return {
      success: true,
      address: siweMessage.address,
      domain: siweMessage.domain,
      nonce: siweMessage.nonce,
      uri: siweMessage.uri
    };

  } catch (error) {
    logger.warn('SIWE message verification failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate JWT Token for authenticated user
 */
const generateAuthToken = (address, options = {}) => {
  const payload = {
    address: address.toLowerCase(),
    type: 'access',
    iat: Math.floor(Date.now() / 1000)
  };

  const tokenOptions = {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'velofi-backend',
    audience: 'velofi-frontend'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, tokenOptions);
};

/**
 * Generate Refresh Token
 */
const generateRefreshToken = (address) => {
  const payload = {
    address: address.toLowerCase(),
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };

  const tokenOptions = {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'velofi-backend',
    audience: 'velofi-frontend'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, tokenOptions);
};

/**
 * Admin Only Middleware
 * Requires user to be authenticated and have admin privileges
 */
const adminOnly = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'Authentication required',
      statusCode: 401
    });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin privileges required',
      statusCode: 403
    });
  }

  next();
};

/**
 * Update user's last activity timestamp
 */
const updateUserLastActivity = async (userId) => {
  try {
    // This would be implemented in the User model
    // For now, we'll just log it
    logger.debug(`Updated last activity for user ${userId}`);
  } catch (error) {
    logger.warn('Failed to update user last activity:', error.message);
  }
};

/**
 * Generate SIWE Nonce
 */
const generateNonce = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Validate Ethereum Address
 */
const isValidEthereumAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

module.exports = {
  siweAuth,
  verifySiweMessage,
  generateAuthToken,
  generateRefreshToken,
  adminOnly,
  generateNonce,
  isValidEthereumAddress
};
