const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { generalLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { cache } = require('../utils/redis');
const { query, transaction } = require('../utils/database');

const router = express.Router();

// Webhook secret for signature verification
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';

/**
 * Middleware to verify webhook signatures
 */
const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!signature) {
    return res.status(401).json({
      success: false,
      error: 'Missing webhook signature',
      statusCode: 401
    });
  }

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const actualSignature = signature.replace('sha256=', '');

  if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(actualSignature))) {
    logger.warn('Invalid webhook signature:', {
      expected: expectedSignature,
      actual: actualSignature,
      payload: payload.substring(0, 100)
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid webhook signature',
      statusCode: 401
    });
  }

  next();
};

/**
 * @route   POST /api/webhooks/blockchain
 * @desc    Handle blockchain events from external services
 * @access  Webhook (with signature verification)
 */
router.post('/blockchain', [
  generalLimiter,
  verifyWebhookSignature,
  body('eventType').isIn(['transaction_confirmed', 'block_mined', 'contract_event']).withMessage('Invalid event type'),
  body('transactionHash').optional().isLength({ min: 66, max: 66 }).matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Valid transaction hash required'),
  body('blockNumber').optional().isInt({ min: 0 }).withMessage('Valid block number required'),
  body('contractAddress').optional().isEthereumAddress().withMessage('Valid contract address required'),
  body('eventData').optional().isObject().withMessage('Event data must be an object')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
      statusCode: 400
    });
  }

  const { eventType, transactionHash, blockNumber, contractAddress, eventData } = req.body;

  try {
    logger.info('Blockchain webhook received:', {
      eventType,
      transactionHash,
      blockNumber,
      contractAddress,
      timestamp: new Date().toISOString()
    });

    // Check if event already processed
    if (transactionHash) {
      const existingEvent = await query(
        'SELECT id FROM webhook_events WHERE transaction_hash = $1 AND event_type = $2',
        [transactionHash, eventType]
      );

      if (existingEvent.rows.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'Event already processed',
          eventId: existingEvent.rows[0].id
        });
      }
    }

    const result = await transaction(async (client) => {
      // Store webhook event
      const eventResult = await client.query(
        `INSERT INTO webhook_events 
         (event_type, transaction_hash, block_number, contract_address, event_data, processed, created_at)
         VALUES ($1, $2, $3, $4, $5, false, CURRENT_TIMESTAMP)
         RETURNING *`,
        [eventType, transactionHash || null, blockNumber || null, contractAddress || null, JSON.stringify(eventData || {})]
      );

      const webhookEvent = eventResult.rows[0];

      // Process the event based on type
      switch (eventType) {
        case 'transaction_confirmed':
          await processTransactionConfirmation(client, webhookEvent);
          break;
        case 'block_mined':
          await processBlockMined(client, webhookEvent);
          break;
        case 'contract_event':
          await processContractEvent(client, webhookEvent);
          break;
      }

      // Mark as processed
      await client.query(
        'UPDATE webhook_events SET processed = true, processed_at = CURRENT_TIMESTAMP WHERE id = $1',
        [webhookEvent.id]
      );

      return webhookEvent;
    });

    res.status(200).json({
      success: true,
      message: 'Blockchain webhook processed successfully',
      eventId: result.id
    });

  } catch (error) {
    logger.error('Blockchain webhook error:', {
      eventType,
      transactionHash,
      blockNumber,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   POST /api/webhooks/payment
 * @desc    Handle payment processor webhooks
 * @access  Webhook (with signature verification)
 */
router.post('/payment', [
  generalLimiter,
  verifyWebhookSignature,
  body('eventType').isIn(['payment_completed', 'payment_failed', 'refund_processed']).withMessage('Invalid event type'),
  body('paymentId').isString().isLength({ min: 1 }).withMessage('Payment ID required'),
  body('amount').isNumeric().custom(value => parseFloat(value) > 0).withMessage('Valid amount required'),
  body('currency').isString().isLength({ min: 3, max: 3 }).withMessage('Valid currency code required'),
  body('userId').optional().isInt({ min: 1 }).withMessage('Valid user ID required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
      statusCode: 400
    });
  }

  const { eventType, paymentId, amount, currency, userId, metadata } = req.body;

  try {
    logger.info('Payment webhook received:', {
      eventType,
      paymentId,
      amount,
      currency,
      userId,
      timestamp: new Date().toISOString()
    });

    // Check if event already processed
    const existingEvent = await query(
      'SELECT id FROM webhook_events WHERE payment_id = $1 AND event_type = $2',
      [paymentId, eventType]
    );

    if (existingEvent.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Payment event already processed',
        eventId: existingEvent.rows[0].id
      });
    }

    const result = await transaction(async (client) => {
      // Store webhook event
      const eventResult = await client.query(
        `INSERT INTO webhook_events 
         (event_type, payment_id, user_id, event_data, processed, created_at)
         VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)
         RETURNING *`,
        [eventType, paymentId, userId || null, JSON.stringify({ amount, currency, metadata })]
      );

      const webhookEvent = eventResult.rows[0];

      // Process payment event
      await processPaymentEvent(client, webhookEvent, { eventType, amount, currency, userId });

      // Mark as processed
      await client.query(
        'UPDATE webhook_events SET processed = true, processed_at = CURRENT_TIMESTAMP WHERE id = $1',
        [webhookEvent.id]
      );

      return webhookEvent;
    });

    res.status(200).json({
      success: true,
      message: 'Payment webhook processed successfully',
      eventId: result.id
    });

  } catch (error) {
    logger.error('Payment webhook error:', {
      eventType,
      paymentId,
      userId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Payment webhook processing failed',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   POST /api/webhooks/notification
 * @desc    Handle notification service webhooks
 * @access  Webhook (with signature verification)
 */
router.post('/notification', [
  generalLimiter,
  verifyWebhookSignature,
  body('eventType').isIn(['email_delivered', 'email_bounced', 'sms_delivered', 'sms_failed']).withMessage('Invalid event type'),
  body('messageId').isString().isLength({ min: 1 }).withMessage('Message ID required'),
  body('recipient').isString().isLength({ min: 1 }).withMessage('Recipient required'),
  body('status').isString().isLength({ min: 1 }).withMessage('Status required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
      statusCode: 400
    });
  }

  const { eventType, messageId, recipient, status, timestamp: eventTimestamp, metadata } = req.body;

  try {
    logger.info('Notification webhook received:', {
      eventType,
      messageId,
      recipient,
      status,
      timestamp: new Date().toISOString()
    });

    const result = await transaction(async (client) => {
      // Store webhook event
      const eventResult = await client.query(
        `INSERT INTO webhook_events 
         (event_type, message_id, event_data, processed, created_at)
         VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
         RETURNING *`,
        [eventType, messageId, JSON.stringify({ recipient, status, eventTimestamp, metadata })]
      );

      const webhookEvent = eventResult.rows[0];

      // Update notification status in database
      await client.query(
        `UPDATE user_notifications 
         SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE external_id = $2`,
        [status, messageId]
      );

      // Mark as processed
      await client.query(
        'UPDATE webhook_events SET processed = true, processed_at = CURRENT_TIMESTAMP WHERE id = $1',
        [webhookEvent.id]
      );

      return webhookEvent;
    });

    res.status(200).json({
      success: true,
      message: 'Notification webhook processed successfully',
      eventId: result.id
    });

  } catch (error) {
    logger.error('Notification webhook error:', {
      eventType,
      messageId,
      recipient,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Notification webhook processing failed',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

/**
 * @route   GET /api/webhooks/status
 * @desc    Get webhook processing status and statistics
 * @access  Internal (no auth for monitoring)
 */
router.get('/status', asyncHandler(async (req, res) => {
  try {
    const cacheKey = 'webhooks:status';
    let statusData = await cache.get(cacheKey);

    if (!statusData) {
      const results = await Promise.all([
        query('SELECT COUNT(*) FROM webhook_events'),
        query('SELECT COUNT(*) FROM webhook_events WHERE processed = true'),
        query('SELECT COUNT(*) FROM webhook_events WHERE processed = false'),
        query('SELECT COUNT(*) FROM webhook_events WHERE created_at > NOW() - INTERVAL \'1 hour\''),
        query('SELECT COUNT(*) FROM webhook_events WHERE created_at > NOW() - INTERVAL \'24 hours\''),
        query(`SELECT 
                 event_type,
                 COUNT(*) as count,
                 AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time
               FROM webhook_events 
               WHERE processed = true AND processed_at IS NOT NULL
               GROUP BY event_type`)
      ]);

      statusData = {
        total: parseInt(results[0].rows[0].count),
        processed: parseInt(results[1].rows[0].count),
        pending: parseInt(results[2].rows[0].count),
        lastHour: parseInt(results[3].rows[0].count),
        last24Hours: parseInt(results[4].rows[0].count),
        byType: results[5].rows.map(row => ({
          eventType: row.event_type,
          count: parseInt(row.count),
          avgProcessingTime: parseFloat(row.avg_processing_time || 0)
        })),
        lastUpdated: new Date().toISOString()
      };

      // Cache for 1 minute
      await cache.set(cacheKey, statusData, 60);
    }

    res.status(200).json({
      success: true,
      message: 'Webhook status retrieved successfully',
      data: statusData
    });

  } catch (error) {
    logger.error('Get webhook status error:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve webhook status',
      message: 'Internal server error',
      statusCode: 500
    });
  }
}));

// Helper functions for processing different webhook events

const processTransactionConfirmation = async (client, webhookEvent) => {
  const { transactionHash } = webhookEvent;
  
  try {
    // Update transaction status in user_transactions
    const updateResult = await client.query(
      'UPDATE user_transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE transaction_hash = $2 RETURNING *',
      ['completed', transactionHash]
    );

    if (updateResult.rows.length > 0) {
      const transaction = updateResult.rows[0];
      
      // If it's a deposit, update user balance
      if (transaction.transaction_type === 'deposit') {
        await client.query(
          `UPDATE user_savings 
           SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = $2`,
          [transaction.amount, transaction.user_id]
        );
      }

      logger.info('Transaction confirmed and processed:', {
        transactionHash,
        userId: transaction.user_id,
        amount: transaction.amount,
        type: transaction.transaction_type
      });
    }
  } catch (error) {
    logger.error('Process transaction confirmation error:', {
      transactionHash,
      error: error.message
    });
    throw error;
  }
};

const processBlockMined = async (client, webhookEvent) => {
  const eventData = JSON.parse(webhookEvent.event_data);
  const { blockNumber, timestamp, transactions } = eventData;

  try {
    // Update latest block information
    await client.query(
      `INSERT INTO blockchain_blocks (block_number, timestamp, transaction_count, processed_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (block_number) DO UPDATE SET processed_at = CURRENT_TIMESTAMP`,
      [blockNumber, timestamp, transactions?.length || 0]
    );

    logger.info('Block processed:', {
      blockNumber,
      transactionCount: transactions?.length || 0
    });
  } catch (error) {
    logger.error('Process block mined error:', {
      blockNumber,
      error: error.message
    });
    throw error;
  }
};

const processContractEvent = async (client, webhookEvent) => {
  const eventData = JSON.parse(webhookEvent.event_data);
  const { eventName, contractAddress, returnValues } = eventData;

  try {
    // Store contract event
    await client.query(
      `INSERT INTO blockchain_events 
       (transaction_hash, contract_address, event_name, event_data, block_number, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        webhookEvent.transaction_hash,
        contractAddress,
        eventName,
        JSON.stringify(returnValues),
        webhookEvent.block_number
      ]
    );

    logger.info('Contract event processed:', {
      eventName,
      contractAddress,
      transactionHash: webhookEvent.transaction_hash
    });
  } catch (error) {
    logger.error('Process contract event error:', {
      eventName,
      contractAddress,
      error: error.message
    });
    throw error;
  }
};

const processPaymentEvent = async (client, webhookEvent, paymentData) => {
  const { eventType, amount, currency, userId } = paymentData;

  try {
    if (eventType === 'payment_completed' && userId) {
      // Add funds to user's account for successful payments
      await client.query(
        `INSERT INTO user_transactions 
         (user_id, transaction_type, amount, currency, status, payment_id, created_at)
         VALUES ($1, 'deposit', $2, $3, 'completed', $4, CURRENT_TIMESTAMP)`,
        [userId, amount, currency, webhookEvent.payment_id]
      );

      // Update user savings balance
      await client.query(
        `INSERT INTO user_savings (user_id, balance, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) 
         DO UPDATE SET balance = user_savings.balance + $2, updated_at = CURRENT_TIMESTAMP`,
        [userId, amount]
      );

      logger.info('Payment processed successfully:', {
        userId,
        amount,
        currency,
        paymentId: webhookEvent.payment_id
      });
    }
  } catch (error) {
    logger.error('Process payment event error:', {
      eventType,
      userId,
      amount,
      error: error.message
    });
    throw error;
  }
};

module.exports = router;
