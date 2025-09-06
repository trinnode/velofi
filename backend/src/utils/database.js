const { Pool } = require('pg');
const logger = require('./logger');

// Database connection pool
let pool;

/**
 * Initialize Database Connection
 */
const initializeDatabase = async () => {
  try {
    const config = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
      connectionTimeoutMillis: 2000, // How long to wait for a connection
    };

    pool = new Pool(config);

    // Test the connection
    const client = await pool.connect();
    logger.info('Database connected successfully');
    client.release();

    // Create tables if they don't exist
    await createTables();
    
    return pool;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

/**
 * Get Database Pool
 */
const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
};

/**
 * Execute a query with error handling
 */
const query = async (text, params = []) => {
  const start = Date.now();
  
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    logger.logPerformance('Database Query', duration, {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      rows: res.rowCount
    });
    
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    
    logger.logDatabase('Query Error', false, {
      error: error.message,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration
    });
    
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 */
const getClient = async () => {
  try {
    return await pool.connect();
  } catch (error) {
    logger.error('Failed to get database client:', error);
    throw error;
  }
};

/**
 * Execute a transaction
 */
const transaction = async (callback) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    
    logger.logDatabase('Transaction', true, { operation: 'commit' });
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    
    logger.logDatabase('Transaction', false, {
      operation: 'rollback',
      error: error.message
    });
    
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Create database tables
 */
const createTables = async () => {
  try {
    const createTablesSQL = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) UNIQUE NOT NULL,
        nonce VARCHAR(255),
        is_admin BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP WITH TIME ZONE
      );

      -- User sessions table
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Savings accounts table
      CREATE TABLE IF NOT EXISTS savings_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        balance DECIMAL(78, 18) DEFAULT 0,
        interest_earned DECIMAL(78, 18) DEFAULT 0,
        last_interest_calculation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Credit scores table
      CREATE TABLE IF NOT EXISTS credit_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Loans table
      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(78, 18) NOT NULL,
        interest_rate DECIMAL(5, 2) NOT NULL,
        duration INTEGER NOT NULL, -- in seconds
        collateral DECIMAL(78, 18) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        due_date TIMESTAMP WITH TIME ZONE,
        repaid_at TIMESTAMP WITH TIME ZONE
      );

      -- DEX transactions table
      CREATE TABLE IF NOT EXISTS dex_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        transaction_hash VARCHAR(66) UNIQUE NOT NULL,
        transaction_type VARCHAR(20) NOT NULL, -- 'swap', 'add_liquidity', 'remove_liquidity'
        token_a_address VARCHAR(42) NOT NULL,
        token_b_address VARCHAR(42) NOT NULL,
        amount_a DECIMAL(78, 18) NOT NULL,
        amount_b DECIMAL(78, 18) NOT NULL,
        gas_used DECIMAL(78, 18),
        gas_price DECIMAL(78, 18),
        block_number BIGINT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Governance proposals table
      CREATE TABLE IF NOT EXISTS governance_proposals (
        id SERIAL PRIMARY KEY,
        proposal_id INTEGER UNIQUE NOT NULL,
        proposer_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        votes_for DECIMAL(78, 18) DEFAULT 0,
        votes_against DECIMAL(78, 18) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Governance votes table
      CREATE TABLE IF NOT EXISTS governance_votes (
        id SERIAL PRIMARY KEY,
        proposal_id INTEGER REFERENCES governance_proposals(proposal_id),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        vote BOOLEAN NOT NULL, -- true for yes, false for no
        voting_power DECIMAL(78, 18) NOT NULL,
        transaction_hash VARCHAR(66),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(proposal_id, user_id)
      );

      -- Blockchain events table
      CREATE TABLE IF NOT EXISTS blockchain_events (
        id SERIAL PRIMARY KEY,
        event_name VARCHAR(100) NOT NULL,
        contract_address VARCHAR(42) NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        block_hash VARCHAR(66) NOT NULL,
        log_index INTEGER NOT NULL,
        event_data JSONB,
        processed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(transaction_hash, log_index)
      );

      -- Audit logs table
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(100) NOT NULL,
        resource_id VARCHAR(100),
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
      CREATE INDEX IF NOT EXISTS idx_savings_accounts_user_id ON savings_accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_credit_scores_user_id ON credit_scores(user_id);
      CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
      CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
      CREATE INDEX IF NOT EXISTS idx_dex_transactions_user_id ON dex_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_dex_transactions_hash ON dex_transactions(transaction_hash);
      CREATE INDEX IF NOT EXISTS idx_governance_proposals_status ON governance_proposals(status);
      CREATE INDEX IF NOT EXISTS idx_governance_votes_proposal_id ON governance_votes(proposal_id);
      CREATE INDEX IF NOT EXISTS idx_governance_votes_user_id ON governance_votes(user_id);
      CREATE INDEX IF NOT EXISTS idx_blockchain_events_processed ON blockchain_events(processed);
      CREATE INDEX IF NOT EXISTS idx_blockchain_events_block_number ON blockchain_events(block_number);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

      -- Create updated_at trigger function
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Create triggers for updated_at columns
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_savings_accounts_updated_at ON savings_accounts;
      CREATE TRIGGER update_savings_accounts_updated_at BEFORE UPDATE ON savings_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    await query(createTablesSQL);
    logger.info('Database tables created successfully');
  } catch (error) {
    logger.error('Failed to create database tables:', error);
    throw error;
  }
};

/**
 * Close database connection
 */
const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
};

/**
 * Health check for database
 */
const healthCheck = async () => {
  try {
    const result = await query('SELECT NOW() as current_time');
    return {
      status: 'healthy',
      timestamp: result.rows[0].current_time,
      connections: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

module.exports = {
  initializeDatabase,
  getPool,
  query,
  getClient,
  transaction,
  createTables,
  closeDatabase,
  healthCheck
};
