# VeloFi Frontend

A modern, responsive DeFi frontend application built with React 19.1.1 and Next.js 15.5.2, providing a seamless user experience for the VeloFi ecosystem on Somnia Network.

## 🌟 Features

### Core DeFi Interface
- **Wallet Integration**: ConnectKit and RainbowKit for seamless wallet connections
- **SIWE Authentication**: Sign-In with Ethereum for secure user authentication
- **Savings Dashboard**: High-yield savings account management with real-time interest tracking
- **Lending Platform**: Intuitive loan request and management interface
- **DEX Interface**: Token swapping and liquidity provision with live price feeds
- **Governance Portal**: Proposal creation, voting, and governance participation
- **Credit Score**: Real-time credit score monitoring and improvement tracking

### Modern UI/UX
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark/Light Mode**: System-aware theme switching
- **Animations**: Smooth transitions with Framer Motion
- **Charts & Analytics**: Interactive charts with Recharts
- **Toast Notifications**: Real-time feedback with React Hot Toast
- **Loading States**: Comprehensive loading and error state management

### Technical Excellence
- **TypeScript**: Full type safety throughout the application
- **React Query**: Efficient data fetching and state management
- **Form Handling**: Robust form validation with React Hook Form and Zod
- **Web3 Integration**: wagmi and viem for blockchain interactions
- **Performance**: Optimized with Next.js App Router and static generation

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/velofi/frontend.git
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Configure your environment variables
nano .env.local

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🔧 Environment Variables

Create a `.env.local` file in the root directory:

```env
# App Configuration
NEXT_PUBLIC_APP_NAME=VeloFi
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_DESCRIPTION=Advanced DeFi Platform on Somnia Network

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:5000

# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=2648
NEXT_PUBLIC_CHAIN_NAME=Somnia
NEXT_PUBLIC_RPC_URL=https://somnia-rpc-url
NEXT_PUBLIC_EXPLORER_URL=https://somnia-explorer-url

# Smart Contract Addresses
NEXT_PUBLIC_SAVINGS_CONTRACT=0x...
NEXT_PUBLIC_LENDING_CONTRACT=0x...
NEXT_PUBLIC_DEX_CONTRACT=0x...
NEXT_PUBLIC_GOVERNANCE_CONTRACT=0x...
NEXT_PUBLIC_TOKEN_CONTRACT=0x...

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEV_TOOLS=false
NEXT_PUBLIC_MAINTENANCE_MODE=false

# External Services
NEXT_PUBLIC_COINGECKO_API_KEY=your-coingecko-api-key
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id

# SIWE Configuration
NEXT_PUBLIC_SIWE_DOMAIN=localhost:3000
NEXT_PUBLIC_SIWE_STATEMENT=Welcome to VeloFi! Sign this message to authenticate.
```

## 📚 Project Structure

```
frontend/
├── components/              # Reusable UI components
│   ├── ui/                 # Base UI components (Button, Input, etc.)
│   ├── auth/               # Authentication components
│   ├── dashboard/          # Dashboard components
│   ├── savings/            # Savings-related components
│   ├── lending/            # Lending platform components
│   ├── dex/                # DEX interface components
│   ├── governance/         # Governance components
│   └── layout/             # Layout components
├── pages/                  # Next.js pages (App Router)
│   ├── api/                # API routes
│   ├── app/                # App directory structure
│   ├── auth/               # Authentication pages
│   ├── dashboard/          # Dashboard pages
│   ├── savings/            # Savings pages
│   ├── lending/            # Lending pages
│   ├── dex/                # DEX pages
│   └── governance/         # Governance pages
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts          # Authentication hook
│   ├── useWallet.ts        # Wallet connection hook
│   ├── useSavings.ts       # Savings data hook
│   ├── useLending.ts       # Lending data hook
│   ├── useDEX.ts           # DEX operations hook
│   └── useGovernance.ts    # Governance hook
├── utils/                  # Utility functions
│   ├── api.ts              # API client
│   ├── contracts.ts        # Smart contract utilities
│   ├── formatters.ts       # Data formatting utilities
│   ├── validators.ts       # Form validation schemas
│   └── constants.ts        # Application constants
├── config/                 # Configuration files
│   ├── wagmi.ts            # Wagmi configuration
│   ├── chains.ts           # Blockchain configurations
│   └── contracts.ts        # Contract addresses and ABIs
├── styles/                 # Global styles
│   ├── globals.css         # Global CSS
│   └── components.css      # Component-specific styles
├── types/                  # TypeScript type definitions
├── public/                 # Static assets
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## 🎨 Tech Stack

### Frontend Framework
- **Next.js 15.5.2** - React framework with App Router
- **React 19.1.1** - Latest React with concurrent features
- **TypeScript** - Type-safe development

### Web3 Integration
- **wagmi** - React hooks for Ethereum
- **viem** - TypeScript interface for Ethereum
- **ConnectKit** - Wallet connection interface
- **RainbowKit** - Beautiful wallet connection UI
- **SIWE** - Sign-In with Ethereum

### UI/UX Libraries
- **Tailwind CSS** - Utility-first CSS framework
- **Headless UI** - Unstyled, accessible UI components
- **Framer Motion** - Animation library
- **Lucide React** - Beautiful icons
- **React Hot Toast** - Notification system

### Data & State Management
- **TanStack Query** - Server state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **React Context** - Global state management

### Charts & Analytics
- **Recharts** - Composable charting library
- **date-fns** - Date utility library

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server

# Code Quality
npm run lint        # Run ESLint
npm run type-check  # Run TypeScript compiler
npm run test        # Run Jest tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Generate coverage report

# Formatting
npm run format      # Format with Prettier
```

### Development Guidelines

1. **Component Structure**: Use functional components with TypeScript
2. **Styling**: Utilize Tailwind CSS utility classes
3. **State Management**: Prefer React Query for server state, React Context for client state
4. **Forms**: Use React Hook Form with Zod validation
5. **Testing**: Write unit tests for utilities and integration tests for components

## 📱 Features Overview

### 🔐 Authentication
- Wallet-based authentication with SIWE
- Session management with JWT tokens
- Auto-reconnection on page refresh
- Multi-wallet support

### 💰 Savings Dashboard
- Real-time balance tracking
- Interest rate visualization
- Transaction history
- Deposit/withdrawal interface
- APY calculator

### 🏦 Lending Platform
- Loan request forms with credit score validation
- Loan management dashboard
- Repayment scheduler
- Interest rate calculator
- Collateral tracking

### 🔄 DEX Interface
- Token swapping with slippage protection
- Liquidity pool management
- Real-time price feeds
- Trading history
- Price impact calculations

### 🗳️ Governance Portal
- Proposal browsing and creation
- Voting interface with voting power display
- Proposal status tracking
- Governance statistics
- Voting history

### 📊 Analytics Dashboard
- Portfolio overview
- Performance metrics
- Transaction analytics
- Credit score tracking
- Yield farming statistics

## 🎭 Component Library

### Base Components
- `Button` - Customizable button with variants
- `Input` - Form input with validation states
- `Card` - Container component with shadows
- `Modal` - Accessible modal dialogs
- `Tooltip` - Informational tooltips

### Web3 Components
- `WalletConnect` - Wallet connection interface
- `AddressDisplay` - Formatted address display
- `TransactionButton` - Transaction handling button
- `NetworkSelector` - Network switching component
- `TokenBalance` - Token balance display

### DeFi Components
- `SavingsCard` - Savings account overview
- `LoanCard` - Loan information display
- `SwapInterface` - Token swap component
- `GovernanceCard` - Proposal display card
- `CreditScore` - Credit score visualization

## 🔒 Security Features

### Web3 Security
- Contract interaction validation
- Transaction simulation
- Slippage protection
- Front-running protection

### Application Security
- XSS protection with CSP headers
- CSRF protection
- Input sanitization
- Secure authentication flow

### Data Protection
- Local storage encryption
- Sensitive data handling
- Privacy-focused analytics
- GDPR compliance ready

## 📊 Performance Optimization

### Next.js Features
- Static Site Generation (SSG)
- Incremental Static Regeneration (ISR)
- Image optimization
- Code splitting
- Bundle analysis

### React Optimizations
- Component memoization
- Virtual scrolling for large lists
- Lazy loading
- Error boundaries

### Web3 Optimizations
- Contract call batching
- Transaction queuing
- Cache-first strategy
- Background synchronization

## 🧪 Testing Strategy

### Unit Tests
```bash
# Run specific test file
npm test -- --testPathPattern=utils

# Watch mode for development
npm run test:watch
```

### Integration Tests
- Component interaction testing
- Web3 integration testing
- API integration testing
- E2E user flow testing

### Testing Tools
- **Jest** - JavaScript testing framework
- **React Testing Library** - React component testing
- **User Event** - User interaction simulation
- **MSW** - API mocking for tests

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### Docker
```bash
# Build Docker image
docker build -t velofi-frontend .

# Run container
docker run -p 3000:3000 velofi-frontend
```

### Static Export
```bash
# Build static export
npm run build
npm run export
```

## 🔧 Configuration

### Tailwind CSS
Custom configuration in `tailwind.config.ts`:
- Custom color palette
- Typography scale
- Component utilities
- Animation presets

### Next.js
Configuration in `next.config.js`:
- Image domains
- Redirects and rewrites
- Environment variables
- Build optimizations

### TypeScript
Configuration in `tsconfig.json`:
- Strict type checking
- Path mapping
- Import aliases
- Build targets

## 🐛 Troubleshooting

### Common Issues

**Wallet Connection Issues**
```bash
# Clear wallet cache
localStorage.clear()
# Reload the page
```

**Build Errors**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

**Type Errors**
```bash
# Regenerate types
npm run type-check
```

**Dependency Issues**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Install dependencies
4. Make changes
5. Add tests
6. Submit pull request

### Code Style
- Follow the ESLint configuration
- Use Prettier for formatting
- Write meaningful commit messages
- Add JSDoc comments for functions

### Pull Request Process
1. Update documentation
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request code review

## 📖 Documentation

- **Component Storybook**: [storybook.velofi.com](https://storybook.velofi.com)
- **API Documentation**: [docs.velofi.com/api](https://docs.velofi.com/api)
- **User Guide**: [docs.velofi.com/guide](https://docs.velofi.com/guide)
- **Developer Docs**: [docs.velofi.com/dev](https://docs.velofi.com/dev)

## 🆘 Support

- **Documentation**: [docs.velofi.com](https://docs.velofi.com)
- **Issues**: [GitHub Issues](https://github.com/velofi/frontend/issues)
- **Discord**: [VeloFi Community](https://discord.gg/velofi)
- **Email**: support@velofi.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [VeloFi Backend](https://github.com/velofi/backend) - Node.js backend API
- [VeloFi Contracts](https://github.com/velofi/contracts) - Smart contracts
- [VeloFi Documentation](https://github.com/velofi/docs) - Project documentation

## 🙏 Acknowledgments

- Somnia Network for blockchain infrastructure
- Next.js team for the amazing framework
- wagmi team for Web3 React hooks
- Tailwind CSS for the utility-first approach
- All open-source contributors

---

Built with ❤️ for the decentralized future on Somnia Network
