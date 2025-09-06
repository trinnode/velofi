const { query, transaction } = require('../utils/database');
const logger = require('../utils/logger');

/**
 * User Model
 * Handles all user-related database operations
 */

/**
 * Get user by wallet address
 */
const getUserByAddress = async (walletAddress) => {
  try {
    const normalizedAddress = walletAddress.toLowerCase();
    const result = await query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [normalizedAddress]
    );

    logger.logDatabase('getUserByAddress', true, {
      address: normalizedAddress,
      found: result.rows.length > 0
    });

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.logDatabase('getUserByAddress', false, {
      address: walletAddress,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
  try {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    logger.logDatabase('getUserById', true, {
      userId,
      found: result.rows.length > 0
    });

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.logDatabase('getUserById', false, {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Create a new user
 */
const createUser = async (userData) => {
  try {
    const { wallet_address, nonce } = userData;
    const normalizedAddress = wallet_address.toLowerCase();

    const result = await query(
      `INSERT INTO users (wallet_address, nonce, is_admin, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [normalizedAddress, nonce, false, true]
    );

    const newUser = result.rows[0];

    // Create associated records
    await createUserAssociatedRecords(newUser.id);

    logger.logDatabase('createUser', true, {
      userId: newUser.id,
      address: normalizedAddress
    });

    return newUser;
  } catch (error) {
    logger.logDatabase('createUser', false, {
      address: userData.wallet_address,
      error: error.message
    });
    throw error;
  }
};

/**
 * Create associated records for new user (savings account, credit score)
 */
const createUserAssociatedRecords = async (userId) => {
  try {
    await transaction(async (client) => {
      // Create savings account
      await client.query(
        `INSERT INTO savings_accounts (user_id, balance, interest_earned, last_interest_calculation, created_at, updated_at) 
         VALUES ($1, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId]
      );

      // Create credit score record
      await client.query(
        `INSERT INTO credit_scores (user_id, score, last_updated, created_at) 
         VALUES ($1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId]
      );
    });

    logger.logDatabase('createUserAssociatedRecords', true, { userId });
  } catch (error) {
    logger.logDatabase('createUserAssociatedRecords', false, {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Update user's last login timestamp
 */
const updateUserLastLogin = async (userId) => {
  try {
    const result = await query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING last_login_at',
      [userId]
    );

    logger.logDatabase('updateUserLastLogin', true, {
      userId,
      lastLogin: result.rows[0]?.last_login_at
    });

    return result.rows[0]?.last_login_at;
  } catch (error) {
    logger.logDatabase('updateUserLastLogin', false, {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Update user's nonce
 */
const updateUserNonce = async (userId, nonce) => {
  try {
    await query(
      'UPDATE users SET nonce = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [nonce, userId]
    );

    logger.logDatabase('updateUserNonce', true, { userId });
    return true;
  } catch (error) {
    logger.logDatabase('updateUserNonce', false, {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Update user active status
 */
const updateUserActiveStatus = async (userId, isActive) => {
  try {
    const result = await query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [isActive, userId]
    );

    logger.logDatabase('updateUserActiveStatus', true, {
      userId,
      isActive,
      found: result.rows.length > 0
    });

    return result.rows[0];
  } catch (error) {
    logger.logDatabase('updateUserActiveStatus', false, {
      userId,
      isActive,
      error: error.message
    });
    throw error;
  }
};

/**
 * Update user admin status
 */
const updateUserAdminStatus = async (userId, isAdmin) => {
  try {
    const result = await query(
      'UPDATE users SET is_admin = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [isAdmin, userId]
    );

    logger.logDatabase('updateUserAdminStatus', true, {
      userId,
      isAdmin,
      found: result.rows.length > 0
    });

    return result.rows[0];
  } catch (error) {
    logger.logDatabase('updateUserAdminStatus', false, {
      userId,
      isAdmin,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get all users (admin only)
 */
const getAllUsers = async (limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC') => {
  try {
    const allowedOrderBy = ['id', 'wallet_address', 'created_at', 'updated_at', 'last_login_at'];
    const allowedDirection = ['ASC', 'DESC'];

    if (!allowedOrderBy.includes(orderBy)) {
      orderBy = 'created_at';
    }
    if (!allowedDirection.includes(orderDirection.toUpperCase())) {
      orderDirection = 'DESC';
    }

    const result = await query(
      `SELECT id, wallet_address, is_admin, is_active, created_at, updated_at, last_login_at
       FROM users 
       ORDER BY ${orderBy} ${orderDirection.toUpperCase()} 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count
    const countResult = await query('SELECT COUNT(*) FROM users');
    const totalCount = parseInt(countResult.rows[0].count);

    logger.logDatabase('getAllUsers', true, {
      count: result.rows.length,
      totalCount,
      limit,
      offset
    });

    return {
      users: result.rows,
      totalCount,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: offset + limit < totalCount,
      hasPrev: offset > 0
    };
  } catch (error) {
    logger.logDatabase('getAllUsers', false, {
      error: error.message
    });
    throw error;
  }
};

/**
 * Get user statistics
 */
const getUserStats = async () => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_users,
        COUNT(*) FILTER (WHERE is_admin = true) as admin_users,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '24 hours') as recent_logins,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_today,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_users_week
      FROM users
    `);

    logger.logDatabase('getUserStats', true);

    return result.rows[0];
  } catch (error) {
    logger.logDatabase('getUserStats', false, {
      error: error.message
    });
    throw error;
  }
};

/**
 * Delete user and all associated data
 */
const deleteUser = async (userId) => {
  try {
    await transaction(async (client) => {
      // Delete from child tables first (foreign key constraints)
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM savings_accounts WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM credit_scores WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM loans WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM dex_transactions WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM governance_votes WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM audit_logs WHERE user_id = $1', [userId]);

      // Delete user
      const result = await client.query(
        'DELETE FROM users WHERE id = $1 RETURNING wallet_address',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    });

    logger.logDatabase('deleteUser', true, { userId });
    return true;
  } catch (error) {
    logger.logDatabase('deleteUser', false, {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Search users by address
 */
const searchUsers = async (searchTerm, limit = 20) => {
  try {
    const result = await query(
      `SELECT id, wallet_address, is_admin, is_active, created_at, last_login_at
       FROM users 
       WHERE wallet_address ILIKE $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [`%${searchTerm}%`, limit]
    );

    logger.logDatabase('searchUsers', true, {
      searchTerm,
      count: result.rows.length
    });

    return result.rows;
  } catch (error) {
    logger.logDatabase('searchUsers', false, {
      searchTerm,
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  getUserByAddress,
  getUserById,
  createUser,
  createUserAssociatedRecords,
  updateUserLastLogin,
  updateUserNonce,
  updateUserActiveStatus,
  updateUserAdminStatus,
  getAllUsers,
  getUserStats,
  deleteUser,
  searchUsers
};
