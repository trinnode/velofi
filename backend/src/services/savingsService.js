const { ethers } = require('ethers');
const { query, transaction } = require('../utils/database');
const logger = require('../utils/logger');
const { cache } = require('../utils/redis');

/**
 * Savings Service
 * Handles all savings-related business logic and blockchain interactions
 */

// Initialize provider and contract
let provider;
let savingsContract;

const initializeSavingsService = () => {
  try {
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Contract ABI (simplified for demo - you would have the full ABI)
    const savingsABI = [
      "function deposit(uint256 amount) external",
      "function withdraw(uint256 amount) external",
      "function balanceOf(address account) external view returns (uint256)",
      "function interestEarned(address account) external view returns (uint256)",
      "function currentInterestRate() external view returns (uint256)",
      "function compoundInterest() external",
      "event Deposit(address indexed user, uint256 amount, uint256 newBalance)",
      "event Withdrawal(address indexed user, uint256 amount, uint256 newBalance)",
      "event InterestCompounded(address indexed user, uint256 interest, uint256 newBalance)"
    ];

    if (process.env.SAVINGS_CONTRACT && process.env.SAVINGS_CONTRACT !== '0x0000000000000000000000000000000000000000') {
      savingsContract = new ethers.Contract(
        process.env.SAVINGS_CONTRACT,
        savingsABI,
        provider
      );
    }

    logger.info('Savings service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize savings service:', error);
  }
};

// Initialize on module load
initializeSavingsService();

/**
 * Get user's savings account from database
 */
const getSavingsAccount = async (userId) => {
  try {
    const result = await query(
      `SELECT sa.*, u.wallet_address 
       FROM savings_accounts sa 
       JOIN users u ON sa.user_id = u.id 
       WHERE sa.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const account = result.rows[0];

    // Get real-time balance from blockchain if contract is available
    if (savingsContract && account.wallet_address) {
      try {
        const blockchainBalance = await savingsContract.balanceOf(account.wallet_address);
        const blockchainInterest = await savingsContract.interestEarned(account.wallet_address);
        
        // Update database with blockchain data if different
        if (blockchainBalance.toString() !== account.balance || 
            blockchainInterest.toString() !== account.interest_earned) {
          await updateSavingsAccountBalance(userId, {
            balance: blockchainBalance.toString(),
            interestEarned: blockchainInterest.toString()
          });
          
          account.balance = blockchainBalance.toString();
          account.interest_earned = blockchainInterest.toString();
        }
      } catch (blockchainError) {
        logger.warn('Failed to fetch balance from blockchain:', blockchainError.message);
      }
    }

    return account;
  } catch (error) {
    logger.error('Get savings account error:', error);
    throw error;
  }
};

/**
 * Get current interest rate from blockchain
 */
const getCurrentInterestRate = async () => {
  try {
    const cacheKey = 'savings:interest_rate';
    let rate = await cache.get(cacheKey);

    if (rate === null) {
      if (savingsContract) {
        const blockchainRate = await savingsContract.currentInterestRate();
        rate = blockchainRate.toString();
        
        // Cache for 10 minutes
        await cache.set(cacheKey, rate, 600);
      } else {
        // Fallback rate if no blockchain connection
        rate = '5000'; // 5% (assuming 4 decimal places)
      }
    }

    return rate;
  } catch (error) {
    logger.warn('Failed to get interest rate from blockchain:', error.message);
    return '5000'; // Default 5%
  }
};

/**
 * Verify deposit transaction on blockchain
 */
const verifyDepositTransaction = async (txHash, userAddress, expectedAmount) => {
  try {
    if (!provider) {
      throw new Error('Blockchain provider not initialized');
    }

    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return { valid: false, reason: 'Transaction not found' };
    }

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return { valid: false, reason: 'Transaction not confirmed' };
    }

    if (receipt.status !== 1) {
      return { valid: false, reason: 'Transaction failed' };
    }

    // Verify transaction is to the savings contract
    if (tx.to?.toLowerCase() !== process.env.SAVINGS_CONTRACT?.toLowerCase()) {
      return { valid: false, reason: 'Transaction not to savings contract' };
    }

    // Verify sender is the user
    if (tx.from.toLowerCase() !== userAddress.toLowerCase()) {
      return { valid: false, reason: 'Transaction sender mismatch' };
    }

    // Parse transaction data to verify amount (simplified)
    // In a real implementation, you'd decode the function call properly
    const expectedAmountWei = ethers.parseEther(expectedAmount.toString());
    
    return {
      valid: true,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: tx.gasPrice?.toString() || '0'
    };
  } catch (error) {
    logger.error('Transaction verification error:', error);
    return { valid: false, reason: 'Verification failed: ' + error.message };
  }
};

/**
 * Process a deposit
 */
const processDeposit = async (depositData) => {
  try {
    const { userId, address, amount, transactionHash, blockNumber, gasUsed, gasPrice } = depositData;

    return await transaction(async (client) => {
      // Update savings account balance
      const updateResult = await client.query(
        `UPDATE savings_accounts 
         SET balance = balance + $1, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $2 
         RETURNING balance, interest_earned`,
        [amount, userId]
      );

      if (updateResult.rows.length === 0) {
        throw new Error('Savings account not found');
      }

      // Record transaction
      await client.query(
        `INSERT INTO savings_transactions 
         (user_id, transaction_hash, transaction_type, amount, balance_after, block_number, gas_used, gas_price, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
        [userId, transactionHash, 'deposit', amount, updateResult.rows[0].balance, blockNumber, gasUsed, gasPrice, 'completed']
      );

      return {
        newBalance: updateResult.rows[0].balance,
        interestEarned: updateResult.rows[0].interest_earned
      };
    });
  } catch (error) {
    logger.error('Process deposit error:', error);
    throw error;
  }
};

/**
 * Process a withdrawal
 */
const processWithdrawal = async (withdrawalData) => {
  try {
    const { userId, address, amount } = withdrawalData;

    // This would involve calling the blockchain contract
    // For now, we'll simulate the process
    
    return await transaction(async (client) => {
      // Check current balance
      const balanceResult = await client.query(
        'SELECT balance FROM savings_accounts WHERE user_id = $1',
        [userId]
      );

      if (balanceResult.rows.length === 0) {
        throw new Error('Savings account not found');
      }

      const currentBalance = parseFloat(balanceResult.rows[0].balance);
      if (currentBalance < parseFloat(amount)) {
        throw new Error('Insufficient balance');
      }

      // Update balance
      const updateResult = await client.query(
        `UPDATE savings_accounts 
         SET balance = balance - $1, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $2 
         RETURNING balance`,
        [amount, userId]
      );

      // Generate a mock transaction hash (in real implementation, this would come from blockchain)
      const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

      // Record transaction
      await client.query(
        `INSERT INTO savings_transactions 
         (user_id, transaction_hash, transaction_type, amount, balance_after, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [userId, mockTxHash, 'withdrawal', amount, updateResult.rows[0].balance, 'completed']
      );

      return {
        transactionHash: mockTxHash,
        newBalance: updateResult.rows[0].balance,
        fee: '0' // Mock fee
      };
    });
  } catch (error) {
    logger.error('Process withdrawal error:', error);
    throw error;
  }
};

/**
 * Get transaction history for a user
 */
const getTransactionHistory = async (params) => {
  try {
    const { userId, page, limit, type } = params;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE st.user_id = $1';
    let queryParams = [userId];

    if (type) {
      whereClause += ' AND st.transaction_type = $2';
      queryParams.push(type);
    }

    const result = await query(
      `SELECT 
         st.*,
         u.wallet_address
       FROM savings_transactions st
       JOIN users u ON st.user_id = u.id
       ${whereClause}
       ORDER BY st.created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM savings_transactions st ${whereClause}`,
      queryParams
    );

    const totalCount = parseInt(countResult.rows[0].count);

    return {
      transactions: result.rows.map(tx => ({
        ...tx,
        formattedAmount: formatBalance(tx.amount),
        formattedBalanceAfter: formatBalance(tx.balance_after)
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: offset + limit < totalCount,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    logger.error('Get transaction history error:', error);
    throw error;
  }
};

/**
 * Get interest information
 */
const getInterestInfo = async (userId) => {
  try {
    const account = await getSavingsAccount(userId);
    if (!account) {
      throw new Error('Savings account not found');
    }

    const currentRate = await getCurrentInterestRate();
    
    // Calculate projected earnings
    const dailyRate = parseFloat(currentRate) / 365 / 10000; // Assuming rate is in basis points
    const balance = parseFloat(account.balance);
    
    return {
      currentRate,
      formattedRate: (parseFloat(currentRate) / 100).toFixed(2) + '%',
      interestEarned: account.interest_earned,
      formattedInterestEarned: formatBalance(account.interest_earned),
      projectedDailyEarnings: (balance * dailyRate).toFixed(18),
      projectedMonthlyEarnings: (balance * dailyRate * 30).toFixed(18),
      projectedYearlyEarnings: (balance * dailyRate * 365).toFixed(18),
      lastCalculation: account.last_interest_calculation
    };
  } catch (error) {
    logger.error('Get interest info error:', error);
    throw error;
  }
};

/**
 * Compound interest
 */
const compoundInterest = async (userId, userAddress) => {
  try {
    return await transaction(async (client) => {
      // Get current interest earned
      const accountResult = await client.query(
        'SELECT balance, interest_earned FROM savings_accounts WHERE user_id = $1',
        [userId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Savings account not found');
      }

      const { balance, interest_earned } = accountResult.rows[0];
      const interestAmount = parseFloat(interest_earned);

      if (interestAmount <= 0) {
        throw new Error('No interest to compound');
      }

      // Add interest to balance and reset interest earned
      const updateResult = await client.query(
        `UPDATE savings_accounts 
         SET balance = balance + interest_earned,
             interest_earned = 0,
             last_interest_calculation = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1 
         RETURNING balance`,
        [userId]
      );

      // Generate mock transaction hash
      const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

      // Record transaction
      await client.query(
        `INSERT INTO savings_transactions 
         (user_id, transaction_hash, transaction_type, amount, balance_after, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [userId, mockTxHash, 'compound', interestAmount, updateResult.rows[0].balance, 'completed']
      );

      return {
        transactionHash: mockTxHash,
        compoundedAmount: interest_earned,
        newBalance: updateResult.rows[0].balance
      };
    });
  } catch (error) {
    logger.error('Compound interest error:', error);
    throw error;
  }
};

/**
 * Update savings account balance
 */
const updateSavingsAccountBalance = async (userId, balanceData) => {
  try {
    const { balance, interestEarned } = balanceData;

    await query(
      `UPDATE savings_accounts 
       SET balance = $1,
           interest_earned = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3`,
      [balance, interestEarned, userId]
    );

    logger.debug('Savings account balance updated', { userId, balance, interestEarned });
  } catch (error) {
    logger.error('Update savings account balance error:', error);
    throw error;
  }
};

/**
 * Get transaction by hash
 */
const getTransactionByHash = async (txHash) => {
  try {
    const result = await query(
      'SELECT * FROM savings_transactions WHERE transaction_hash = $1',
      [txHash]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error('Get transaction by hash error:', error);
    throw error;
  }
};

/**
 * Format balance for display
 */
const formatBalance = (balance) => {
  try {
    const num = parseFloat(balance);
    if (isNaN(num)) return '0.00';
    
    // Format with appropriate decimal places
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    } else {
      return num.toFixed(6);
    }
  } catch (error) {
    return '0.00';
  }
};

// Create savings_transactions table if it doesn't exist
const createSavingsTransactionsTable = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS savings_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        transaction_hash VARCHAR(66) UNIQUE NOT NULL,
        transaction_type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal', 'compound', 'interest'
        amount DECIMAL(78, 18) NOT NULL,
        balance_after DECIMAL(78, 18) NOT NULL,
        block_number BIGINT,
        gas_used DECIMAL(78, 18),
        gas_price DECIMAL(78, 18),
        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_savings_transactions_user_id ON savings_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_savings_transactions_hash ON savings_transactions(transaction_hash);
      CREATE INDEX IF NOT EXISTS idx_savings_transactions_type ON savings_transactions(transaction_type);
      CREATE INDEX IF NOT EXISTS idx_savings_transactions_created_at ON savings_transactions(created_at);
    `);

    logger.debug('Savings transactions table created/verified');
  } catch (error) {
    logger.error('Create savings transactions table error:', error);
  }
};

// Initialize table on module load
createSavingsTransactionsTable();

module.exports = {
  initializeSavingsService,
  getSavingsAccount,
  getCurrentInterestRate,
  verifyDepositTransaction,
  processDeposit,
  processWithdrawal,
  getTransactionHistory,
  getInterestInfo,
  compoundInterest,
  updateSavingsAccountBalance,
  getTransactionByHash,
  formatBalance
};
