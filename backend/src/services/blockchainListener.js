const { ethers } = require('ethers');
const logger = require('../utils/logger');
const { query } = require('../utils/database');
const { cache } = require('../utils/redis');

/**
 * Blockchain Event Listener Service
 * Listens to smart contract events and processes them
 */

let provider;
let contracts = {};
let isListening = false;

/**
 * Initialize blockchain listener
 */
const setupBlockchainListener = async () => {
  try {
    if (!process.env.RPC_URL) {
      logger.warn('RPC_URL not configured, blockchain listener disabled');
      return;
    }

    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Test connection
    const network = await provider.getNetwork();
    logger.info(`Connected to blockchain network: ${network.name} (Chain ID: ${network.chainId})`);

    // Initialize contracts
    await initializeContracts();

    // Start listening to events
    await startEventListeners();

    // Start periodic sync
    startPeriodicSync();

    logger.info('Blockchain listener initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize blockchain listener:', error);
    throw error;
  }
};

/**
 * Initialize smart contracts
 */
const initializeContracts = async () => {
  try {
    const contractConfigs = [
      {
        name: 'savings',
        address: process.env.SAVINGS_CONTRACT,
        abi: [
          "event Deposit(address indexed user, uint256 amount, uint256 newBalance, uint256 timestamp)",
          "event Withdrawal(address indexed user, uint256 amount, uint256 newBalance, uint256 timestamp)",
          "event InterestCompounded(address indexed user, uint256 interest, uint256 newBalance, uint256 timestamp)",
          "event InterestAccrued(address indexed user, uint256 interest, uint256 totalEarned, uint256 timestamp)"
        ]
      },
      {
        name: 'creditScore',
        address: process.env.CREDIT_SCORE_CONTRACT,
        abi: [
          "event CreditScoreUpdated(address indexed user, uint256 oldScore, uint256 newScore, uint256 timestamp)",
          "event PaymentMade(address indexed user, uint256 amount, uint256 scoreIncrease, uint256 timestamp)"
        ]
      },
      {
        name: 'lending',
        address: process.env.LENDING_CONTRACT,
        abi: [
          "event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 interestRate, uint256 duration, uint256 collateral)",
          "event LoanApproved(uint256 indexed loanId, address indexed lender, uint256 timestamp)",
          "event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 timestamp)",
          "event LoanDefaulted(uint256 indexed loanId, address indexed borrower, uint256 timestamp)"
        ]
      },
      {
        name: 'exchange',
        address: process.env.EXCHANGE_CONTRACT,
        abi: [
          "event Swap(address indexed user, address tokenA, address tokenB, uint256 amountA, uint256 amountB, uint256 timestamp)",
          "event LiquidityAdded(address indexed user, address tokenA, address tokenB, uint256 amountA, uint256 amountB, uint256 liquidity)",
          "event LiquidityRemoved(address indexed user, address tokenA, address tokenB, uint256 amountA, uint256 amountB, uint256 liquidity)"
        ]
      },
      {
        name: 'governance',
        address: process.env.GOVERNANCE_CONTRACT,
        abi: [
          "event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, string description, uint256 startTime, uint256 endTime)",
          "event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight, uint256 timestamp)",
          "event ProposalExecuted(uint256 indexed proposalId, bool success, uint256 timestamp)"
        ]
      }
    ];

    for (const config of contractConfigs) {
      if (config.address && config.address !== '0x0000000000000000000000000000000000000000') {
        contracts[config.name] = new ethers.Contract(
          config.address,
          config.abi,
          provider
        );
        logger.info(`Initialized ${config.name} contract: ${config.address}`);
      } else {
        logger.warn(`${config.name} contract address not configured`);
      }
    }
  } catch (error) {
    logger.error('Failed to initialize contracts:', error);
    throw error;
  }
};

/**
 * Start event listeners for all contracts
 */
const startEventListeners = async () => {
  try {
    if (isListening) {
      logger.warn('Event listeners already started');
      return;
    }

    // Savings contract events
    if (contracts.savings) {
      contracts.savings.on('Deposit', handleDepositEvent);
      contracts.savings.on('Withdrawal', handleWithdrawalEvent);
      contracts.savings.on('InterestCompounded', handleInterestCompoundedEvent);
      contracts.savings.on('InterestAccrued', handleInterestAccruedEvent);
    }

    // Credit score contract events
    if (contracts.creditScore) {
      contracts.creditScore.on('CreditScoreUpdated', handleCreditScoreUpdatedEvent);
      contracts.creditScore.on('PaymentMade', handlePaymentMadeEvent);
    }

    // Lending contract events
    if (contracts.lending) {
      contracts.lending.on('LoanRequested', handleLoanRequestedEvent);
      contracts.lending.on('LoanApproved', handleLoanApprovedEvent);
      contracts.lending.on('LoanRepaid', handleLoanRepaidEvent);
      contracts.lending.on('LoanDefaulted', handleLoanDefaultedEvent);
    }

    // Exchange contract events
    if (contracts.exchange) {
      contracts.exchange.on('Swap', handleSwapEvent);
      contracts.exchange.on('LiquidityAdded', handleLiquidityAddedEvent);
      contracts.exchange.on('LiquidityRemoved', handleLiquidityRemovedEvent);
    }

    // Governance contract events
    if (contracts.governance) {
      contracts.governance.on('ProposalCreated', handleProposalCreatedEvent);
      contracts.governance.on('VoteCast', handleVoteCastEvent);
      contracts.governance.on('ProposalExecuted', handleProposalExecutedEvent);
    }

    isListening = true;
    logger.info('Event listeners started successfully');
  } catch (error) {
    logger.error('Failed to start event listeners:', error);
    throw error;
  }
};

/**
 * Stop event listeners
 */
const stopEventListeners = () => {
  try {
    Object.values(contracts).forEach(contract => {
      contract.removeAllListeners();
    });
    isListening = false;
    logger.info('Event listeners stopped');
  } catch (error) {
    logger.error('Failed to stop event listeners:', error);
  }
};

/**
 * Start periodic sync to catch missed events
 */
const startPeriodicSync = () => {
  // Sync every 5 minutes
  setInterval(async () => {
    try {
      await syncMissedEvents();
    } catch (error) {
      logger.error('Periodic sync error:', error);
    }
  }, 5 * 60 * 1000);

  logger.info('Periodic sync started (every 5 minutes)');
};

/**
 * Sync missed events from the blockchain
 */
const syncMissedEvents = async () => {
  try {
    const lastSyncBlock = await getLastSyncedBlock();
    const currentBlock = await provider.getBlockNumber();

    if (currentBlock <= lastSyncBlock) {
      return; // No new blocks to sync
    }

    logger.info(`Syncing events from block ${lastSyncBlock + 1} to ${currentBlock}`);

    // Sync events for each contract
    for (const [contractName, contract] of Object.entries(contracts)) {
      await syncContractEvents(contractName, contract, lastSyncBlock + 1, currentBlock);
    }

    // Update last synced block
    await updateLastSyncedBlock(currentBlock);

    logger.info(`Event sync completed. Synced ${currentBlock - lastSyncBlock} blocks`);
  } catch (error) {
    logger.error('Sync missed events error:', error);
  }
};

/**
 * Sync events for a specific contract
 */
const syncContractEvents = async (contractName, contract, fromBlock, toBlock) => {
  try {
    const events = await contract.queryFilter({}, fromBlock, toBlock);
    
    for (const event of events) {
      await processEvent(contractName, event);
    }

    logger.debug(`Synced ${events.length} events for ${contractName} contract`);
  } catch (error) {
    logger.error(`Sync events error for ${contractName}:`, error);
  }
};

/**
 * Process a blockchain event
 */
const processEvent = async (contractName, event) => {
  try {
    // Store raw event data
    await storeBlockchainEvent({
      eventName: event.event || event.fragment?.name || 'Unknown',
      contractAddress: event.address,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      blockHash: event.blockHash,
      logIndex: event.logIndex,
      eventData: {
        args: event.args ? Object.values(event.args) : [],
        topics: event.topics
      }
    });

    // Process event based on type
    switch (contractName) {
      case 'savings':
        await processSavingsEvent(event);
        break;
      case 'creditScore':
        await processCreditScoreEvent(event);
        break;
      case 'lending':
        await processLendingEvent(event);
        break;
      case 'exchange':
        await processExchangeEvent(event);
        break;
      case 'governance':
        await processGovernanceEvent(event);
        break;
    }
  } catch (error) {
    logger.error('Process event error:', error);
  }
};

// Event handlers for Savings contract
const handleDepositEvent = async (user, amount, newBalance, timestamp, event) => {
  logger.logBlockchain('Deposit event', {
    user,
    amount: amount.toString(),
    newBalance: newBalance.toString(),
    txHash: event.transactionHash
  });
  await processEvent('savings', event);
};

const handleWithdrawalEvent = async (user, amount, newBalance, timestamp, event) => {
  logger.logBlockchain('Withdrawal event', {
    user,
    amount: amount.toString(),
    newBalance: newBalance.toString(),
    txHash: event.transactionHash
  });
  await processEvent('savings', event);
};

const handleInterestCompoundedEvent = async (user, interest, newBalance, timestamp, event) => {
  logger.logBlockchain('Interest compounded event', {
    user,
    interest: interest.toString(),
    newBalance: newBalance.toString(),
    txHash: event.transactionHash
  });
  await processEvent('savings', event);
};

const handleInterestAccruedEvent = async (user, interest, totalEarned, timestamp, event) => {
  logger.logBlockchain('Interest accrued event', {
    user,
    interest: interest.toString(),
    totalEarned: totalEarned.toString(),
    txHash: event.transactionHash
  });
  await processEvent('savings', event);
};

// Event handlers for Credit Score contract
const handleCreditScoreUpdatedEvent = async (user, oldScore, newScore, timestamp, event) => {
  logger.logBlockchain('Credit score updated event', {
    user,
    oldScore: oldScore.toString(),
    newScore: newScore.toString(),
    txHash: event.transactionHash
  });
  await processEvent('creditScore', event);
};

const handlePaymentMadeEvent = async (user, amount, scoreIncrease, timestamp, event) => {
  logger.logBlockchain('Payment made event', {
    user,
    amount: amount.toString(),
    scoreIncrease: scoreIncrease.toString(),
    txHash: event.transactionHash
  });
  await processEvent('creditScore', event);
};

// Event handlers for other contracts...
const handleLoanRequestedEvent = async (loanId, borrower, amount, interestRate, duration, collateral, event) => {
  logger.logBlockchain('Loan requested event', {
    loanId: loanId.toString(),
    borrower,
    amount: amount.toString(),
    txHash: event.transactionHash
  });
  await processEvent('lending', event);
};

const handleLoanApprovedEvent = async (loanId, lender, timestamp, event) => {
  logger.logBlockchain('Loan approved event', {
    loanId: loanId.toString(),
    lender,
    txHash: event.transactionHash
  });
  await processEvent('lending', event);
};

const handleLoanRepaidEvent = async (loanId, borrower, amount, timestamp, event) => {
  logger.logBlockchain('Loan repaid event', {
    loanId: loanId.toString(),
    borrower,
    amount: amount.toString(),
    txHash: event.transactionHash
  });
  await processEvent('lending', event);
};

const handleLoanDefaultedEvent = async (loanId, borrower, timestamp, event) => {
  logger.logBlockchain('Loan defaulted event', {
    loanId: loanId.toString(),
    borrower,
    txHash: event.transactionHash
  });
  await processEvent('lending', event);
};

const handleSwapEvent = async (user, tokenA, tokenB, amountA, amountB, timestamp, event) => {
  logger.logBlockchain('Swap event', {
    user,
    tokenA,
    tokenB,
    amountA: amountA.toString(),
    amountB: amountB.toString(),
    txHash: event.transactionHash
  });
  await processEvent('exchange', event);
};

const handleLiquidityAddedEvent = async (user, tokenA, tokenB, amountA, amountB, liquidity, event) => {
  logger.logBlockchain('Liquidity added event', {
    user,
    tokenA,
    tokenB,
    amountA: amountA.toString(),
    amountB: amountB.toString(),
    liquidity: liquidity.toString(),
    txHash: event.transactionHash
  });
  await processEvent('exchange', event);
};

const handleLiquidityRemovedEvent = async (user, tokenA, tokenB, amountA, amountB, liquidity, event) => {
  logger.logBlockchain('Liquidity removed event', {
    user,
    tokenA,
    tokenB,
    amountA: amountA.toString(),
    amountB: amountB.toString(),
    liquidity: liquidity.toString(),
    txHash: event.transactionHash
  });
  await processEvent('exchange', event);
};

const handleProposalCreatedEvent = async (proposalId, proposer, title, description, startTime, endTime, event) => {
  logger.logBlockchain('Proposal created event', {
    proposalId: proposalId.toString(),
    proposer,
    title,
    txHash: event.transactionHash
  });
  await processEvent('governance', event);
};

const handleVoteCastEvent = async (proposalId, voter, support, weight, timestamp, event) => {
  logger.logBlockchain('Vote cast event', {
    proposalId: proposalId.toString(),
    voter,
    support,
    weight: weight.toString(),
    txHash: event.transactionHash
  });
  await processEvent('governance', event);
};

const handleProposalExecutedEvent = async (proposalId, success, timestamp, event) => {
  logger.logBlockchain('Proposal executed event', {
    proposalId: proposalId.toString(),
    success,
    txHash: event.transactionHash
  });
  await processEvent('governance', event);
};

// Process specific event types (placeholder implementations)
const processSavingsEvent = async (event) => {
  // Implementation would update savings account balances, etc.
  await markEventAsProcessed(event);
};

const processCreditScoreEvent = async (event) => {
  // Implementation would update credit scores, etc.
  await markEventAsProcessed(event);
};

const processLendingEvent = async (event) => {
  // Implementation would update loan records, etc.
  await markEventAsProcessed(event);
};

const processExchangeEvent = async (event) => {
  // Implementation would record DEX transactions, etc.
  await markEventAsProcessed(event);
};

const processGovernanceEvent = async (event) => {
  // Implementation would update governance proposals/votes, etc.
  await markEventAsProcessed(event);
};

/**
 * Store blockchain event in database
 */
const storeBlockchainEvent = async (eventData) => {
  try {
    await query(
      `INSERT INTO blockchain_events 
       (event_name, contract_address, transaction_hash, block_number, block_hash, log_index, event_data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (transaction_hash, log_index) DO NOTHING`,
      [
        eventData.eventName,
        eventData.contractAddress,
        eventData.transactionHash,
        eventData.blockNumber,
        eventData.blockHash,
        eventData.logIndex,
        JSON.stringify(eventData.eventData)
      ]
    );
  } catch (error) {
    logger.error('Store blockchain event error:', error);
  }
};

/**
 * Mark event as processed
 */
const markEventAsProcessed = async (event) => {
  try {
    await query(
      `UPDATE blockchain_events 
       SET processed = true, processed_at = CURRENT_TIMESTAMP 
       WHERE transaction_hash = $1 AND log_index = $2`,
      [event.transactionHash, event.logIndex]
    );
  } catch (error) {
    logger.error('Mark event as processed error:', error);
  }
};

/**
 * Get last synced block number
 */
const getLastSyncedBlock = async () => {
  try {
    const cached = await cache.get('blockchain:last_synced_block');
    if (cached !== null) {
      return parseInt(cached);
    }

    const result = await query(
      'SELECT MAX(block_number) as max_block FROM blockchain_events'
    );
    
    const lastBlock = result.rows[0].max_block || 0;
    await cache.set('blockchain:last_synced_block', lastBlock.toString(), 300);
    
    return lastBlock;
  } catch (error) {
    logger.error('Get last synced block error:', error);
    return 0;
  }
};

/**
 * Update last synced block number
 */
const updateLastSyncedBlock = async (blockNumber) => {
  try {
    await cache.set('blockchain:last_synced_block', blockNumber.toString(), 300);
  } catch (error) {
    logger.error('Update last synced block error:', error);
  }
};

/**
 * Get blockchain listener status
 */
const getListenerStatus = () => {
  return {
    isListening,
    connectedContracts: Object.keys(contracts),
    networkInfo: provider ? {
      url: process.env.RPC_URL,
      chainId: process.env.CHAIN_ID
    } : null
  };
};

module.exports = {
  setupBlockchainListener,
  stopEventListeners,
  syncMissedEvents,
  getListenerStatus,
  processEvent,
  storeBlockchainEvent
};
