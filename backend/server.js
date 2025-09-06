const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
require('dotenv').config();

// Import custom middleware and utilities
const errorHandler = require('./src/middleware/errorHandler');
const siweAuth = require('./src/middleware/siweAuth');
const rateLimitConfig = require('./src/middleware/rateLimit');
const { initializeDatabase } = require('./src/utils/database');
const { initializeRedis } = require('./src/utils/redis');
const { setupBlockchainListener } = require('./src/services/blockchainListener');
const logger = require('./src/utils/logger');

// Import routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/user');
const savingsRoutes = require('./src/routes/savings');
const creditRoutes = require('./src/routes/credit');
const lendingRoutes = require('./src/routes/lending');
const dexRoutes = require('./src/routes/dex');
const governanceRoutes = require('./src/routes/governance');
const adminRoutes = require('./src/routes/admin');
const webhookRoutes = require('./src/routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Redis client
let redisClient;

async function initializeServer() {
  try {
    // Initialize Redis
    redisClient = await initializeRedis();
    logger.info('Redis initialized successfully');

    // Initialize Database
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Setup blockchain listener
    await setupBlockchainListener();
    logger.info('Blockchain listener initialized successfully');

    // Basic middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "https:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    }));

    app.use(compression());
    app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

    // CORS configuration
    app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL || 'https://velofi.com']
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        statusCode: 429
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);

    // API-specific rate limiting
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50, // limit each IP to 50 API requests per windowMs
    });
    app.use('/api/', apiLimiter);

    // Session configuration
    app.use(session({
      store: new RedisStore({ client: redisClient }),
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
      },
      name: 'velofi.session'
    }));

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/savings', siweAuth, savingsRoutes);
    app.use('/api/credit', siweAuth, creditRoutes);
    app.use('/api/lending', siweAuth, lendingRoutes);
    app.use('/api/dex', siweAuth, dexRoutes);
    app.use('/api/governance', siweAuth, governanceRoutes);
    app.use('/api/admin', siweAuth, adminRoutes);
    app.use('/api/webhooks', webhookRoutes);

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        message: `The requested endpoint ${req.originalUrl} was not found on this server.`,
        statusCode: 404
      });
    });

    // Global error handler
    app.use(errorHandler);

    // Graceful shutdown
    const gracefulShutdown = () => {
      logger.info('Received kill signal, shutting down gracefully...');
      
      if (redisClient) {
        redisClient.quit();
      }
      
      process.exit(0);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Start the server
    app.listen(PORT, () => {
      logger.info(`🚀 VeloFi Backend Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 CORS enabled for: ${process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3000'}`);
    });

  } catch (error) {
    logger.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection at:', promise, 'reason:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown:', err);
  process.exit(1);
});

// Initialize the server
initializeServer();

module.exports = app;
