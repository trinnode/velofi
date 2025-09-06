const logger = require('../utils/logger');

/**
 * Global Error Handler Middleware
 * Handles all errors that occur in the application
 */
const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || error.status || 500;
  let message = error.message || 'Internal Server Error';
  
  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  switch (error.name) {
    case 'ValidationError':
      statusCode = 400;
      message = 'Validation Error';
      break;
      
    case 'CastError':
      statusCode = 400;
      message = 'Invalid data format';
      break;
      
    case 'JsonWebTokenError':
      statusCode = 401;
      message = 'Invalid token';
      break;
      
    case 'TokenExpiredError':
      statusCode = 401;
      message = 'Token expired';
      break;
      
    case 'MongoError':
    case 'PostgresError':
      statusCode = 500;
      message = 'Database error';
      break;
      
    case 'MulterError':
      statusCode = 400;
      if (error.code === 'LIMIT_FILE_SIZE') {
        message = 'File too large';
      } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        message = 'Unexpected file field';
      } else {
        message = 'File upload error';
      }
      break;
      
    case 'SyntaxError':
      if (error.message.includes('JSON')) {
        statusCode = 400;
        message = 'Invalid JSON format';
      }
      break;
  }

  // Handle Joi validation errors
  if (error.isJoi) {
    statusCode = 400;
    message = error.details[0].message;
  }

  // Handle express-validator errors
  if (error.type === 'validation') {
    statusCode = 400;
    message = error.errors[0].msg;
  }

  // Don't leak error details in production
  const errorResponse = {
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  };

  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.details = error;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res) => {
  const message = `Route ${req.originalUrl} not found`;
  
  logger.warn('404 Not Found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    error: 'Not Found',
    message,
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  });
};

/**
 * Async Error Wrapper
 * Wraps async functions to catch errors and pass them to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom Error Class
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Rate Limit Error Handler
 */
const rateLimitErrorHandler = (req, res) => {
  logger.warn('Rate limit exceeded:', {
    ip: req.ip,
    url: req.url,
    userAgent: req.get('User-Agent')
  });

  res.status(429).json({
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    statusCode: 429,
    timestamp: new Date().toISOString(),
    retryAfter: '15 minutes'
  });
};

/**
 * CORS Error Handler
 */
const corsErrorHandler = (error, req, res, next) => {
  if (error.message && error.message.includes('CORS')) {
    logger.warn('CORS error:', {
      origin: req.get('Origin'),
      url: req.url,
      method: req.method
    });

    return res.status(403).json({
      error: 'CORS Error',
      message: 'Cross-origin request not allowed',
      statusCode: 403,
      timestamp: new Date().toISOString()
    });
  }
  next(error);
};

/**
 * Database Connection Error Handler
 */
const dbErrorHandler = (error, req, res, next) => {
  if (error.code && (error.code.startsWith('ECONNREFUSED') || error.code === 'ENOTFOUND')) {
    logger.error('Database connection error:', error.message);

    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database connection failed',
      statusCode: 503,
      timestamp: new Date().toISOString()
    });
  }
  next(error);
};

/**
 * Security Error Handler
 */
const securityErrorHandler = (error, req, res, next) => {
  // Handle potential security threats
  if (error.message && error.message.includes('CSP')) {
    logger.warn('CSP violation:', {
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(403).json({
      error: 'Security Policy Violation',
      message: 'Request blocked by security policy',
      statusCode: 403,
      timestamp: new Date().toISOString()
    });
  }
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  rateLimitErrorHandler,
  corsErrorHandler,
  dbErrorHandler,
  securityErrorHandler
};
