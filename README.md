# 🌟 VeloFi - Next-Generation DeFi Platform

<div align="center">

![VeloFi Logo](frontend/public/Logo.png)

**A comprehensive decentralized finance ecosystem built on Somnia Network**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2015.5.2-blue)](frontend/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20Express-green)](backend/)
[![Contracts](https://img.shields.io/badge/Contracts-Solidity%200.8.28-red)](contracts/)
[![Network](https://img.shields.io/badge/Network-Somnia-purple)](https://somnia.network)

[Live Demo](https://velofi.vercel.app) • [Documentation](https://docs.velofi.com) • [Discord](https://discord.gg/velofi)

</div>

---

## 🚀 Overview

VeloFi is a cutting-edge decentralized finance (DeFi) platform that provides a comprehensive suite of financial services on the Somnia Network. Our platform combines real-time yield savings, credit-based lending, ultra-fast decentralized exchange (DEX), and community-driven governance into a seamless user experience.

### 🌟 Key Features

- **💰 Real-Time Yield Savings**: Earn interest with real-time compounding and transparent APY
- **📊 Credit-Based Lending**: Access loans based on on-chain credit scores and DeFi activity
- **⚡ Ultra-Fast DEX**: Instant token swaps with minimal fees on Somnia's high-performance network
- **🗳️ Decentralized Governance**: Community-driven proposal and voting systems
- **🔐 Enterprise Security**: SIWE authentication, rate limiting, and comprehensive security measures
- **📱 Mobile-Responsive**: Optimized for all devices with modern UI/UX

---

## 🏗️ Architecture

VeloFi is built as a monorepo containing three main components:

\`\`\`
VeloFi/
├── 🎨 frontend/          # Next.js 15 frontend application
├── ⚙️ backend/           # Node.js Express API server
├── 📜 contracts/         # Solidity smart contracts
└── 📚 docs/              # Documentation
\`\`\`

### Tech Stack

| Component | Technologies |
|-----------|-------------|
| **Frontend** | Next.js 15.5.2, React 19, TypeScript, Tailwind CSS, Framer Motion, wagmi, viem |
| **Backend** | Node.js, Express.js, PostgreSQL, Redis, SIWE, JWT, Docker |
| **Contracts** | Solidity 0.8.28, Hardhat, OpenZeppelin, Ethers.js |
| **Network** | Somnia Network (High-performance EVM blockchain) |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 10+
- PostgreSQL 14+
- Redis 6+
- Git

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/trinnode/velofi.git
cd velofi
\`\`\`

### 2. Install Dependencies

\`\`\`bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Install contract dependencies
cd ../contracts
npm install
\`\`\`

### 3. Environment Setup

#### Frontend (.env.local)
\`\`\`bash
# Copy and configure frontend environment
cp frontend/.env.example frontend/.env.local
\`\`\`

#### Backend (.env)
\`\`\`bash
# Copy and configure backend environment
cp backend/.env.example backend/.env
\`\`\`

#### Contracts (.env)
\`\`\`bash
# Copy and configure contracts environment
cp contracts/.env.example contracts/.env
\`\`\`

### 4. Start Development Servers

\`\`\`bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Deploy contracts (optional)
cd contracts
npx hardhat run scripts/deploy.ts --network localhost
\`\`\`

Visit \`http://localhost:3000\` to access the application.

---

## 📁 Project Structure

### Frontend (\`/frontend\`)

\`\`\`
frontend/
├── components/              # Reusable UI components
│   ├── EmbeddedWallet.tsx  # Wallet connection
│   ├── Footer.tsx          # Site footer
│   ├── Header.tsx          # Navigation header
│   ├── InterestAccrualDisplay.tsx  # Real-time interest display
│   ├── LoanRequestForm.tsx # Lending interface
│   ├── ProposalCard.tsx    # Governance proposals
│   ├── SIWEButton.tsx      # SIWE authentication
│   └── SwapWidget.tsx      # DEX trading interface
├── pages/                  # Next.js pages
│   ├── _app.tsx           # App wrapper
│   ├── index.tsx          # Landing page
│   ├── savings.tsx        # Savings dashboard
│   ├── credit.tsx         # Credit management
│   ├── dex.tsx            # DEX trading
│   ├── governance.tsx     # Voting interface
│   └── signin.tsx         # Authentication page
├── hooks/                 # React hooks
│   ├── useRealTimeData.ts # Real-time data hook
│   ├── useContract.ts     # Contract interactions
│   └── useSIWE.ts        # SIWE authentication
├── config/                # Configuration files
│   └── wagmi.ts          # Wagmi configuration
├── styles/                # Styling
│   └── globals.css       # Global styles with Tailwind
├── utils/                 # Utilities
│   └── format.ts         # Formatting helpers
└── providers/             # React providers
    └── SIWEProvider.tsx  # SIWE context provider
\`\`\`

### Backend (\`/backend\`)

\`\`\`
backend/
├── src/
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Express middleware
│   │   ├── adminAuth.js   # Admin authentication
│   │   ├── errorHandler.js# Error handling
│   │   ├── rateLimit.js   # Rate limiting
│   │   └── siweAuth.js    # SIWE middleware
│   ├── models/           # Data models
│   │   └── User.js       # User model
│   ├── routes/           # API routes
│   │   ├── admin.js      # Admin routes
│   │   ├── auth.js       # Authentication
│   │   ├── credit.js     # Credit system
│   │   ├── dex.js        # DEX operations
│   │   ├── governance.js # Governance
│   │   ├── lending.js    # Lending protocol
│   │   ├── savings.js    # Savings operations
│   │   ├── user.js       # User management
│   │   └── webhooks.js   # Webhook handlers
│   ├── services/         # Business logic
│   │   ├── blockchainListener.js # Blockchain events
│   │   └── savingsService.js     # Savings calculations
│   └── utils/            # Utilities
│       ├── database.js   # Database connection
│       ├── logger.js     # Logging utility
│       └── redis.js      # Redis connection
├── server.js             # Server entry point
└── vercel.json          # Vercel deployment config
\`\`\`

### Contracts (\`/contracts\`)

\`\`\`
contracts/
├── contracts/            # Solidity contracts
│   ├── CreditScore.sol   # Credit scoring system
│   ├── Exchange.sol      # DEX contract
│   ├── Governance.sol    # Governance contract
│   ├── Lending.sol       # Lending protocol
│   ├── LiquidityPool.sol # Liquidity management
│   ├── MockERC20.sol     # Test token
│   ├── Savings.sol       # Savings contract
│   └── Interfaces/       # Contract interfaces
│       ├── IDex.sol      # DEX interface
│       └── IERC20.sol    # Token interface
├── scripts/              # Deployment scripts
│   ├── deploy.ts         # Main deployment
│   └── testSetup.ts      # Test setup
├── test/                 # Contract tests
│   ├── CreditScore.test.ts
│   ├── Exchange.test.ts
│   ├── Governance.test.ts
│   ├── Lending.test.ts
│   └── Savings.test.ts
└── hardhat.config.ts     # Hardhat configuration
\`\`\`

---

## 🌟 Features Deep Dive

### 💰 Savings Module
- **Real-time Interest Accrual**: Interest compounds automatically every block
- **Flexible Deposits/Withdrawals**: No lock-up periods or penalties
- **Transparent APY**: Real-time APY calculation and display (currently 5.0%)
- **Emergency Withdrawals**: Safety mechanisms for user protection

### 📊 Credit System
- **On-chain Credit Scoring**: Algorithm based on DeFi activity history
- **Multi-factor Analysis**: Payment history, credit utilization, account age, protocol activity
- **Dynamic Interest Rates**: Rates adjust based on credit scores
- **Payment History Tracking**: Builds reputation over time

### ⚡ Decentralized Exchange
- **Instant Swaps**: Powered by Somnia's high-performance network
- **Low Fees**: Minimal trading fees with transparent pricing
- **Liquidity Pools**: Community-provided liquidity with rewards
- **Price Impact Protection**: Slippage protection and price warnings

### 🗳️ Governance
- **Proposal Creation**: Community members can create proposals
- **Token-based Voting**: Voting power based on VLFI token holdings
- **Execution Framework**: Automated proposal execution
- **Transparency**: Full voting history and results

---

## 📊 Live Statistics (Dynamic)

The platform features real-time updating statistics:

- **Total Value Locked**: $28,467,095+ (updates every 5 seconds)
- **Active Users**: 12,483+ (fluctuates based on activity)
- **Total Transactions**: 687,542+ (continuously growing)
- **Current APY**: 5.0% (adjusts based on market conditions)

---

## 🔧 Development

### Running Tests

\`\`\`bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
npm test

# Contract tests
cd contracts
npx hardhat test
\`\`\`

### Building for Production

\`\`\`bash
# Frontend build
cd frontend
npm run build

# Backend (no build required for Node.js)
cd backend
npm start

# Contract compilation
cd contracts
npx hardhat compile
\`\`\`

### Code Quality

\`\`\`bash
# Linting
npm run lint
npm run lint:fix

# Type checking (frontend)
npm run type-check

# Formatting
npm run format
\`\`\`

---

## 🚀 Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set the root directory to \`frontend/\`
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### Backend (Vercel Serverless)

1. Create separate Vercel project for backend
2. Update \`vercel.json\` with correct entry point (\`src/app.js\`)
3. Configure environment variables
4. Deploy via Vercel CLI or GitHub integration

### Contracts (Somnia Network)

\`\`\`bash
cd contracts
npx hardhat run scripts/deploy.ts --network somnia
\`\`\`

---

## 🔐 Security Features

### Frontend Security
- **SIWE Authentication**: Sign-In with Ethereum for secure Web3 authentication
- **Input Validation**: Comprehensive client and server-side validation
- **XSS Protection**: Content Security Policy implementation
- **Secure Headers**: Security headers via Helmet.js

### Backend Security
- **Rate Limiting**: Configurable rate limits per endpoint (1000 requests/15min)
- **CORS Protection**: Strict CORS policies with credential support
- **Session Management**: Redis-based session storage
- **Input Sanitization**: Comprehensive request validation

### Smart Contract Security
- **OpenZeppelin Standards**: Battle-tested security patterns
- **Access Controls**: Owner-only functions with role-based permissions
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Pause Functionality**: Emergency pause mechanisms

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Process
1. Fork the repository
2. Create a feature branch: \`git checkout -b feature/amazing-feature\`
3. Make your changes with proper testing
4. Commit with conventional commits: \`git commit -m 'feat: add amazing feature'\`
5. Push to your branch: \`git push origin feature/amazing-feature\`
6. Open a Pull Request

### Code Standards
- Follow existing code style and patterns
- Write comprehensive tests for new features
- Update documentation for API changes
- Ensure all linting and type checks pass
- Add JSDoc comments for functions

---

## 📄 License

This project is licensed under the MIT License.

---

## 🆘 Support & Community

- **�� Documentation**: [docs.velofi.com](https://docs.velofi.com)
- **🐛 Issues**: [GitHub Issues](https://github.com/trinnode/velofi/issues)
- **💬 Discord**: [VeloFi Community](https://discord.gg/velofi)
- **📧 Email**: support@velofi.com
- **🐦 Twitter**: [@VeloFiDeFi](https://twitter.com/VeloFiDeFi)

---

## 🗺️ Roadmap

### ✅ Phase 1 - Core Platform (Completed)
- [x] Smart contract development and deployment
- [x] Frontend application with modern UI/UX
- [x] Backend API with comprehensive endpoints
- [x] SIWE authentication integration
- [x] Real-time data updates
- [x] Basic DEX functionality

### 🚧 Phase 2 - Enhanced Features (In Progress)
- [ ] Security audit completion
- [ ] Mobile app development
- [ ] Advanced trading features
- [ ] Yield farming implementation
- [ ] Performance optimizations

### 🔮 Phase 3 - Advanced Features (Planned)
- [ ] Cross-chain bridge integration
- [ ] NFT marketplace integration
- [ ] Institutional features
- [ ] Advanced governance mechanisms
- [ ] API partnerships and integrations

---

## 🙏 Acknowledgments

Special thanks to:

- **Somnia Network** for providing high-performance blockchain infrastructure
- **Next.js Team** for the exceptional React framework
- **wagmi & viem Teams** for excellent Web3 React hooks
- **OpenZeppelin** for secure smart contract standards
- **Tailwind CSS** for the utility-first approach
- **Framer Motion** for beautiful animations
- **All Contributors** who have helped build VeloFi

---

<div align="center">

**🌟 Built with passion for the decentralized future on Somnia Network 🌟**

[![GitHub stars](https://img.shields.io/github/stars/trinnode/velofi.svg?style=social&label=Star)](https://github.com/trinnode/velofi/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/trinnode/velofi.svg?style=social&label=Fork)](https://github.com/trinnode/velofi/network/members)
[![Twitter Follow](https://img.shields.io/twitter/follow/VeloFiDeFi.svg?style=social&label=Follow)](https://twitter.com/VeloFiDeFi)

---

*"Empowering the future of decentralized finance, one transaction at a time."*

</div>
