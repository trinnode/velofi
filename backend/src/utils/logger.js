const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Tell winston that we want to link the colors 
winston.addColors(colors);

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define log format for files (without colors)
const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat
  }),
  
  // Daily rotate file for all logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_FILE_MAX_FILES || '14d',
    format: fileLogFormat
  }),
  
  // Daily rotate file for error logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_FILE_MAX_FILES || '14d',
    format: fileLogFormat
  }),
  
  // Daily rotate file for debug logs (only in development)
  ...(process.env.NODE_ENV === 'development' ? [
    new DailyRotateFile({
      filename: path.join(logsDir, 'debug-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'debug',
      maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
      maxFiles: '7d', // Keep debug logs for 7 days only
      format: fileLogFormat
    })
  ] : [])
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: fileLogFormat,
  transports,
  exitOnError: false
});

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({ 
    filename: path.join(logsDir, 'exceptions.log'),
    format: fileLogFormat
  })
);

logger.rejections.handle(
  new winston.transports.File({ 
    filename: path.join(logsDir, 'rejections.log'),
    format: fileLogFormat
  })
);

// Custom logging methods
logger.logRequest = (req, res, next) => {
  logger.http(`${req.method} ${req.url} - ${req.ip}`);
  if (next) next();
};

logger.logResponse = (req, res, responseTime) => {
  logger.http(`${req.method} ${req.url} - ${res.statusCode} - ${responseTime}ms - ${req.ip}`);
};

logger.logError = (error, context = {}) => {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    ...context
  });
};

logger.logAuth = (action, address, success = true, details = {}) => {
  const level = success ? 'info' : 'warn';
  logger[level](`Auth: ${action}`, {
    address,
    success,
    ...details
  });
};

logger.logTransaction = (type, txHash, address, details = {}) => {
  logger.info(`Transaction: ${type}`, {
    txHash,
    address,
    ...details
  });
};

logger.logDatabase = (operation, success = true, details = {}) => {
  const level = success ? 'debug' : 'error';
  logger[level](`Database: ${operation}`, {
    success,
    ...details
  });
};

logger.logSecurity = (event, severity = 'warn', details = {}) => {
  logger[severity](`Security: ${event}`, details);
};

logger.logPerformance = (operation, duration, details = {}) => {
  logger.debug(`Performance: ${operation}`, {
    duration: `${duration}ms`,
    ...details
  });
};

logger.logBlockchain = (event, details = {}) => {
  logger.info(`Blockchain: ${event}`, details);
};

logger.logCache = (operation, hit = false, details = {}) => {
  logger.debug(`Cache: ${operation}`, {
    hit,
    ...details
  });
};

// Development helper
if (process.env.NODE_ENV === 'development') {
  logger.debug('Logger initialized in development mode');
}

module.exports = logger;
