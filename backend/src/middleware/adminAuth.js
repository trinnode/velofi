const { asyncHandler } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Admin authorization middleware
 * Ensures the authenticated user has admin privileges
 */
const adminAuth = asyncHandler(async (req, res, next) => {
  // Check if user is authenticated (should be handled by siweAuth middleware first)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please authenticate first',
      statusCode: 401
    });
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    logger.warn('Unauthorized admin access attempt:', {
      userId: req.user.id,
      userAddress: req.user.address,
      userRole: req.user.role,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      message: 'Admin access required',
      statusCode: 403
    });
  }

  // Log admin access
  logger.info('Admin access granted:', {
    adminId: req.user.id,
    adminAddress: req.user.address,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  next();
});

module.exports = {
  adminAuth
};
