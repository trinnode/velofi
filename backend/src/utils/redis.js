const { createClient } = require('redis');
const logger = require('./logger');

let redisClient;

/**
 * Initialize Redis Connection
 */
const initializeRedis = async () => {
  try {
    const redisConfig = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        connectTimeout: 10000,
      },
      // Add password if provided
      ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
    };

    redisClient = createClient(redisConfig);

    // Error handling
    redisClient.on('error', (error) => {
      logger.error('Redis error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Reconnecting to Redis...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis is ready');
    });

    redisClient.on('end', () => {
      logger.info('Redis connection ended');
    });

    // Connect to Redis
    await redisClient.connect();

    // Test the connection
    await redisClient.ping();
    logger.info('Redis connected successfully');

    return redisClient;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
};

/**
 * Get Redis Client
 */
const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redisClient;
};

/**
 * Set a key-value pair with optional expiration
 */
const set = async (key, value, options = {}) => {
  try {
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
    
    if (options.ttl) {
      await redisClient.setEx(key, options.ttl, serializedValue);
    } else {
      await redisClient.set(key, serializedValue);
    }

    logger.logCache('SET', false, { key, ttl: options.ttl });
    return true;
  } catch (error) {
    logger.error('Redis SET error:', { key, error: error.message });
    return false;
  }
};

/**
 * Get a value by key
 */
const get = async (key) => {
  try {
    const value = await redisClient.get(key);
    
    if (value === null) {
      logger.logCache('GET', false, { key, result: 'miss' });
      return null;
    }

    logger.logCache('GET', true, { key, result: 'hit' });

    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    logger.error('Redis GET error:', { key, error: error.message });
    return null;
  }
};

/**
 * Delete a key
 */
const del = async (key) => {
  try {
    const result = await redisClient.del(key);
    logger.logCache('DELETE', false, { key, deleted: result });
    return result;
  } catch (error) {
    logger.error('Redis DELETE error:', { key, error: error.message });
    return 0;
  }
};

/**
 * Check if a key exists
 */
const exists = async (key) => {
  try {
    const result = await redisClient.exists(key);
    logger.logCache('EXISTS', result > 0, { key, exists: result > 0 });
    return result > 0;
  } catch (error) {
    logger.error('Redis EXISTS error:', { key, error: error.message });
    return false;
  }
};

/**
 * Set expiration for a key
 */
const expire = async (key, seconds) => {
  try {
    const result = await redisClient.expire(key, seconds);
    logger.logCache('EXPIRE', false, { key, seconds, success: result });
    return result;
  } catch (error) {
    logger.error('Redis EXPIRE error:', { key, error: error.message });
    return false;
  }
};

/**
 * Increment a numeric value
 */
const incr = async (key) => {
  try {
    const result = await redisClient.incr(key);
    logger.logCache('INCR', false, { key, value: result });
    return result;
  } catch (error) {
    logger.error('Redis INCR error:', { key, error: error.message });
    return null;
  }
};

/**
 * Decrement a numeric value
 */
const decr = async (key) => {
  try {
    const result = await redisClient.decr(key);
    logger.logCache('DECR', false, { key, value: result });
    return result;
  } catch (error) {
    logger.error('Redis DECR error:', { key, error: error.message });
    return null;
  }
};

/**
 * Add items to a set
 */
const sadd = async (key, ...members) => {
  try {
    const result = await redisClient.sAdd(key, members);
    logger.logCache('SADD', false, { key, members: members.length, added: result });
    return result;
  } catch (error) {
    logger.error('Redis SADD error:', { key, error: error.message });
    return 0;
  }
};

/**
 * Get all members of a set
 */
const smembers = async (key) => {
  try {
    const result = await redisClient.sMembers(key);
    logger.logCache('SMEMBERS', true, { key, count: result.length });
    return result;
  } catch (error) {
    logger.error('Redis SMEMBERS error:', { key, error: error.message });
    return [];
  }
};

/**
 * Check if a member is in a set
 */
const sismember = async (key, member) => {
  try {
    const result = await redisClient.sIsMember(key, member);
    logger.logCache('SISMEMBER', result, { key, member, isMember: result });
    return result;
  } catch (error) {
    logger.error('Redis SISMEMBER error:', { key, member, error: error.message });
    return false;
  }
};

/**
 * Add items to a hash
 */
const hset = async (key, field, value) => {
  try {
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
    const result = await redisClient.hSet(key, field, serializedValue);
    logger.logCache('HSET', false, { key, field, isNew: result === 1 });
    return result;
  } catch (error) {
    logger.error('Redis HSET error:', { key, field, error: error.message });
    return 0;
  }
};

/**
 * Get a field from a hash
 */
const hget = async (key, field) => {
  try {
    const value = await redisClient.hGet(key, field);
    
    if (value === null) {
      logger.logCache('HGET', false, { key, field, result: 'miss' });
      return null;
    }

    logger.logCache('HGET', true, { key, field, result: 'hit' });

    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    logger.error('Redis HGET error:', { key, field, error: error.message });
    return null;
  }
};

/**
 * Get all fields and values from a hash
 */
const hgetall = async (key) => {
  try {
    const result = await redisClient.hGetAll(key);
    logger.logCache('HGETALL', Object.keys(result).length > 0, { 
      key, 
      fieldCount: Object.keys(result).length 
    });

    // Try to parse JSON values
    const parsed = {};
    for (const [field, value] of Object.entries(result)) {
      try {
        parsed[field] = JSON.parse(value);
      } catch {
        parsed[field] = value;
      }
    }

    return parsed;
  } catch (error) {
    logger.error('Redis HGETALL error:', { key, error: error.message });
    return {};
  }
};

/**
 * Cache with automatic serialization and TTL
 */
const cache = {
  set: async (key, value, ttl = 3600) => {
    return await set(key, value, { ttl });
  },
  
  get: async (key) => {
    return await get(key);
  },
  
  del: async (key) => {
    return await del(key);
  },
  
  wrap: async (key, fn, ttl = 3600) => {
    // Try to get cached value
    let value = await get(key);
    
    if (value !== null) {
      return value;
    }
    
    // If not cached, execute function and cache result
    try {
      value = await fn();
      await set(key, value, { ttl });
      return value;
    } catch (error) {
      logger.error('Cache wrap error:', { key, error: error.message });
      throw error;
    }
  }
};

/**
 * Session management
 */
const session = {
  create: async (sessionId, userData, ttl = 86400) => {
    return await set(`session:${sessionId}`, userData, { ttl });
  },
  
  get: async (sessionId) => {
    return await get(`session:${sessionId}`);
  },
  
  update: async (sessionId, userData, ttl = 86400) => {
    return await set(`session:${sessionId}`, userData, { ttl });
  },
  
  destroy: async (sessionId) => {
    return await del(`session:${sessionId}`);
  }
};

/**
 * Rate limiting helper
 */
const rateLimit = {
  check: async (key, limit, window) => {
    const current = await get(key) || 0;
    
    if (current >= limit) {
      return { allowed: false, current, limit, window };
    }
    
    if (current === 0) {
      await set(key, 1, { ttl: window });
    } else {
      await incr(key);
    }
    
    return { allowed: true, current: current + 1, limit, window };
  }
};

/**
 * Close Redis connection
 */
const closeRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

/**
 * Health check for Redis
 */
const healthCheck = async () => {
  try {
    const start = Date.now();
    const pong = await redisClient.ping();
    const duration = Date.now() - start;
    
    return {
      status: 'healthy',
      ping: pong,
      responseTime: `${duration}ms`,
      connected: redisClient.isOpen
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      connected: false
    };
  }
};

module.exports = {
  initializeRedis,
  getRedisClient,
  set,
  get,
  del,
  exists,
  expire,
  incr,
  decr,
  sadd,
  smembers,
  sismember,
  hset,
  hget,
  hgetall,
  cache,
  session,
  rateLimit,
  closeRedis,
  healthCheck
};
