# VeloFi Backend API

A comprehensive DeFi backend platform built for the Somnia Network, providing savings, lending, DEX, and governance functionality with enterprise-grade security and performance.

## 🌟 Features

### Core DeFi Services

- **Authentication**: SIWE (Sign-In with Ethereum) based authentication
- **Savings**: High-yield savings accounts with automated interest compounding
- **Lending**: Peer-to-peer lending with dynamic credit scoring
- **DEX**: Decentralized exchange with automated market making
- **Governance**: Token-based voting and proposal system
- **Credit Scoring**: AI-powered credit assessment system

### Technical Features

- **Blockchain Integration**: Real-time event listening on Somnia Network
- **Caching**: Redis-powered caching for optimal performance
- **Rate Limiting**: Comprehensive API protection
- **Logging**: Structured logging with Winston
- **Validation**: Comprehensive input validation
- **Error Handling**: Graceful error handling and recovery
- **Admin Panel**: Full administrative interface
- **Webhooks**: External service integration

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL >= 14
- Redis >= 7.0
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/velofi/backend.git
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure your .env file
nano .env

# Run database migrations
npm run migrate

# Seed initial data (optional)
npm run seed

# Start the development server
npm run dev
```

## 🔧 Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/velofi
DB_HOST=localhost
DB_PORT=5432
DB_NAME=velofi
DB_USER=your_username
DB_PASSWORD=your_password

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Blockchain Configuration
BLOCKCHAIN_RPC_URL=https://somnia-rpc-url
BLOCKCHAIN_NETWORK=somnia
PRIVATE_KEY=your_private_key_for_blockchain_operations

# Authentication Configuration
JWT_SECRET=your-super-secure-jwt-secret-key
SESSION_SECRET=your-super-secure-session-secret
SIWE_DOMAIN=velofi.com

# Smart Contract Addresses
SAVINGS_CONTRACT_ADDRESS=0x...
LENDING_CONTRACT_ADDRESS=0x...
DEX_CONTRACT_ADDRESS=0x...
GOVERNANCE_CONTRACT_ADDRESS=0x...

# External Services
WEBHOOK_SECRET=your-webhook-secret-key
EMAIL_SERVICE_API_KEY=your-email-service-key
SMS_SERVICE_API_KEY=your-sms-service-key

# Monitoring and Analytics
LOG_LEVEL=info
ENABLE_BLOCKCHAIN_LISTENER=true
ENABLE_METRICS=true
```

## 📚 API Documentation

### Authentication Endpoints

```bash
POST /api/auth/nonce        # Generate SIWE nonce
POST /api/auth/verify       # Verify SIWE message
POST /api/auth/refresh      # Refresh JWT token
POST /api/auth/logout       # Logout user
```

### User Management

```bash
GET  /api/user/profile      # Get user profile
PUT  /api/user/profile      # Update user profile
GET  /api/user/dashboard    # Get dashboard data
GET  /api/user/activity     # Get activity history
```

### Savings System

```bash
POST /api/savings/deposit   # Deposit funds
POST /api/savings/withdraw  # Withdraw funds
GET  /api/savings/balance   # Get balance
GET  /api/savings/history   # Get transaction history
GET  /api/savings/interest  # Get interest data
```

### Lending Platform

```bash
POST /api/lending/request   # Request a loan
GET  /api/lending/loans     # Get user loans
POST /api/lending/repay     # Repay loan
GET  /api/lending/offers    # Get lending offers
```

### DEX Operations

```bash
POST /api/dex/swap          # Execute token swap
GET  /api/dex/pairs         # Get trading pairs
GET  /api/dex/rate/:tokenA/:tokenB  # Get exchange rate
POST /api/dex/liquidity/add # Add liquidity
```

### Governance System

```bash
GET  /api/governance/proposals    # Get all proposals
POST /api/governance/proposals    # Create proposal
POST /api/governance/proposals/:id/vote  # Vote on proposal
GET  /api/governance/user/votes   # Get user votes
```

### Admin Panel

```bash
GET  /api/admin/dashboard    # Admin dashboard
GET  /api/admin/users        # Manage users
GET  /api/admin/transactions # View all transactions
GET  /api/admin/system/health # System health
```

## 🏗️ Architecture

### Project Structure

```bash
backend/
├── src/
│   ├── middleware/          # Express middleware
│   │   ├── auth.js         # Authentication middleware
│   │   ├── rateLimit.js    # Rate limiting
│   │   └── errorHandler.js # Error handling
│   ├── routes/             # API routes
│   │   ├── auth.js         # Authentication routes
│   │   ├── user.js         # User management
│   │   ├── savings.js      # Savings functionality
│   │   ├── lending.js      # Lending system
│   │   ├── dex.js          # DEX operations
│   │   ├── governance.js   # Governance system
│   │   ├── admin.js        # Admin panel
│   │   └── webhooks.js     # Webhook handlers
│   ├── models/             # Database models
│   │   └── User.js         # User model
│   ├── services/           # Business logic
│   │   ├── blockchainListener.js  # Blockchain events
│   │   └── savingsService.js      # Savings logic
│   ├── utils/              # Utility functions
│   │   ├── database.js     # Database utilities
│   │   ├── redis.js        # Redis utilities
│   │   └── logger.js       # Logging utilities
│   └── app.js              # Express app configuration
├── scripts/                # Deployment scripts
├── tests/                  # Test files
├── server.js               # Server entry point
├── package.json            # Dependencies
└── README.md              # This file
```

### Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts and profiles
- `user_sessions` - Session management
- `user_transactions` - Transaction history
- `user_savings` - Savings accounts
- `loans` - Lending records
- `dex_transactions` - DEX trade history
- `governance_proposals` - Governance proposals
- `governance_votes` - Voting records
- `blockchain_events` - Blockchain event logs

## 🔐 Security Features

### Authentication & Authorization

- SIWE (Sign-In with Ethereum) for wallet-based authentication
- JWT tokens for API access
- Role-based access control (User, Admin)
- Session management with Redis

### API Protection

- Rate limiting per IP and user
- Input validation and sanitization
- SQL injection prevention
- XSS protection with Helmet.js
- CORS configuration

### Data Security

- Encrypted sensitive data storage
- Secure password hashing
- Environment variable protection
- Audit logging for admin actions

## 📊 Performance & Monitoring

### Caching Strategy

- Redis caching for frequently accessed data
- Cache invalidation on data updates
- Performance metrics tracking

### Logging & Monitoring

- Structured logging with Winston
- Daily log rotation
- Error tracking and alerting
- Performance monitoring

### Database Optimization

- Indexed queries for performance
- Connection pooling
- Transaction management
- Query optimization

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Categories

- Unit tests for individual functions
- Integration tests for API endpoints
- Database tests for data integrity
- Authentication flow tests

## 🚀 Deployment

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Docker

```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run
```

### Environment Setup

1. Set up PostgreSQL database
2. Configure Redis instance
3. Set environment variables
4. Run database migrations
5. Start the server

## 🔧 Maintenance

### Database Migrations

```bash
# Run pending migrations
npm run migrate

# Create new migration
npm run migrate:create migration_name
```

### Monitoring

- Health check endpoint: `GET /health`
- Admin dashboard: `GET /api/admin/dashboard`
- System metrics: `GET /api/admin/system/health`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Run the test suite
6. Submit a pull request

### Development Guidelines

- Follow ESLint configuration
- Maintain test coverage above 80%
- Use meaningful commit messages
- Update documentation for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Documentation: [docs.velofi.com](https://docs.velofi.com)
- Issues: [GitHub Issues](https://github.com/velofi/backend/issues)
- Discord: [VeloFi Community](https://discord.gg/velofi)
- Email: <support@velofi.com>

## 🔗 Related Projects

- [VeloFi Frontend](https://github.com/velofi/frontend) - React.js frontend application
- [VeloFi Contracts](https://github.com/velofi/contracts) - Smart contracts for Somnia Network
- [VeloFi Documentation](https://github.com/velofi/docs) - Comprehensive documentation

---

Built with ❤️ for the Somnia Network ecosystem
