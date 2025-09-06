const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const logger = require('../utils/logger');

/**
 * General API Rate Limiting
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429,
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      statusCode: 429,
      timestamp: new Date().toISOString(),
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Strict Rate Limiting for Authentication Endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts, please try again later.',
    statusCode: 429,
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many authentication attempts from this IP. Please try again later.',
      statusCode: 429,
      timestamp: new Date().toISOString(),
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Stricter Rate Limiting for Sensitive Operations
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 requests per hour
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests for sensitive operations, please try again later.',
    statusCode: 429,
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Strict rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Rate limit for sensitive operations exceeded. Please try again later.',
      statusCode: 429,
      timestamp: new Date().toISOString(),
      retryAfter: '1 hour'
    });
  }
});

/**
 * Rate Limiting for Transaction-related Endpoints
 */
const transactionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit each IP to 50 transaction requests per 5 minutes
  message: {
    error: 'Transaction rate limit exceeded',
    message: 'Too many transaction requests, please try again later.',
    statusCode: 429,
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user address if authenticated, otherwise use IP
    return req.user ? req.user.address : req.ip;
  },
  handler: (req, res) => {
    logger.warn('Transaction rate limit exceeded:', {
      ip: req.ip,
      user: req.user?.address,
      url: req.url,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      error: 'Transaction rate limit exceeded',
      message: 'Too many transaction requests. Please try again later.',
      statusCode: 429,
      timestamp: new Date().toISOString(),
      retryAfter: '5 minutes'
    });
  }
});

/**
 * Slow Down Middleware - Gradually increase response time
 */
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per windowMs without delay
  delayMs: 500, // add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // maximum delay of 20 seconds
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  headers: true,
  onLimitReached: (req, res, options) => {
    logger.warn('Speed limit threshold reached:', {
      ip: req.ip,
      url: req.url,
      delay: options.delay
    });
  }
});

/**
 * File Upload Rate Limiting
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 file uploads per hour
  message: {
    error: 'Upload rate limit exceeded',
    message: 'Too many file uploads, please try again later.',
    statusCode: 429,
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      error: 'Upload rate limit exceeded',
      message: 'Too many file uploads from this IP. Please try again later.',
      statusCode: 429,
      timestamp: new Date().toISOString(),
      retryAfter: '1 hour'
    });
  }
});

/**
 * Admin Operations Rate Limiting
 */
const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // limit admin users to 200 requests per hour
  message: {
    error: 'Admin rate limit exceeded',
    message: 'Too many admin operations, please try again later.',
    statusCode: 429,
    retryAfter: '1 hour'
  },
  keyGenerator: (req) => {
    return req.user ? req.user.address : req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Admin rate limit exceeded:', {
      ip: req.ip,
      user: req.user?.address,
      url: req.url,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      error: 'Admin rate limit exceeded',
      message: 'Too many admin operations. Please try again later.',
      statusCode: 429,
      timestamp: new Date().toISOString(),
      retryAfter: '1 hour'
    });
  }
});

/**
 * Webhook Rate Limiting
 */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 webhook calls per minute
  message: {
    error: 'Webhook rate limit exceeded',
    message: 'Too many webhook requests, please try again later.',
    statusCode: 429,
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Webhook rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      error: 'Webhook rate limit exceeded',
      message: 'Too many webhook requests from this IP. Please try again later.',
      statusCode: 429,
      timestamp: new Date().toISOString(),
      retryAfter: '1 minute'
    });
  }
});

/**
 * Create Custom Rate Limiter
 */
const createCustomLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later.',
      statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false
  };

  return rateLimit({ ...defaultOptions, ...options });
};

module.exports = {
  apiLimiter,
  authLimiter,
  strictLimiter,
  transactionLimiter,
  speedLimiter,
  uploadLimiter,
  adminLimiter,
  webhookLimiter,
  createCustomLimiter
};
