import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown,
  Zap, 
  DollarSign, 
  BarChart3, 
  Activity,
  RefreshCw,
  Search,
  Target,
  Clock
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useRealTimeData } from '../hooks/useRealTimeData';
import { toast } from 'react-hot-toast';
import ConnectWalletButton from '../components/ConnectWalletButton';
import SwapWidget from '../components/SwapWidget';

interface TradingPair {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  liquidity: number;
  icon: string;
}

interface MarketStats {
  totalValueLocked: number;
  totalVolume24h: number;
  totalTrades24h: number;
  averageFee: number;
}

export default function DexPage() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('swap');

  const realTimeData = useRealTimeData();

  useEffect(() => {
    setMounted(true);
  }, []);

  const tradingPairs: TradingPair[] = [
    {
      symbol: 'VLFI/ETH',
      name: 'VeloFi / Ethereum',
      price: 0.000357,
      change24h: 8.42,
      volume24h: 1250000,
      liquidity: 5800000,
      icon: '💎'
    },
    {
      symbol: 'VLFI/USDC',
      name: 'VeloFi / USD Coin',
      price: 1.25,
      change24h: -2.15,
      volume24h: 890000,
      liquidity: 3200000,
      icon: '💵'
    },
    {
      symbol: 'ETH/USDC',
      name: 'Ethereum / USD Coin',
      price: 3500,
      change24h: 5.23,
      volume24h: 12500000,
      liquidity: 45000000,
      icon: '⟠'
    }
  ];

  const marketStats: MarketStats = {
    totalValueLocked: realTimeData?.totalValueLocked || 125000000,
    totalVolume24h: 45600000,
    totalTrades24h: 12834,
    averageFee: 0.3
  };

  const filteredPairs = tradingPairs.filter(pair =>
    pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pair.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
    return `$${num.toFixed(decimals)}`;
  };

  const formatPrice = (price: number) => {
    if (price < 0.001) return price.toExponential(3);
    return price.toFixed(price >= 1 ? 2 : 6);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rich-black via-jet-black to-gunmetal-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-neon-magenta to-electric-lime bg-clip-text text-transparent">
            VeloFi DEX
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Trade tokens instantly with the lowest fees and deepest liquidity on Somnia Network
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12"
        >
          {[
            { 
              title: "Total Value Locked", 
              value: formatNumber(marketStats.totalValueLocked),
              icon: <Target className="w-6 h-6 text-electric-lime" />,
              change: "+12.5%"
            },
            { 
              title: "24h Volume", 
              value: formatNumber(marketStats.totalVolume24h),
              icon: <BarChart3 className="w-6 h-6 text-neon-magenta" />,
              change: "+8.2%"
            },
            { 
              title: "24h Trades", 
              value: marketStats.totalTrades24h.toLocaleString(),
              icon: <Activity className="w-6 h-6 text-blue-400" />,
              change: "+15.7%"
            },
            { 
              title: "Avg Fee", 
              value: `${marketStats.averageFee}%`,
              icon: <DollarSign className="w-6 h-6 text-green-400" />,
              change: "Fixed"
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-6"
            >
              <div className="flex items-center justify-between mb-2">
                {stat.icon}
                <span className={`text-sm font-medium ${
                  stat.change.startsWith('+') ? 'text-green-400' : 
                  stat.change.startsWith('-') ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{stat.title}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-6"
            >
              <div className="flex space-x-4 mb-6">
                {['swap', 'limit', 'pool'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                      activeTab === tab
                        ? 'bg-neon-magenta text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'swap' && (
                <SwapWidget onSwapComplete={() => toast.success('Swap completed!')} />
              )}

              {activeTab === 'limit' && (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Limit Orders</h3>
                  <p className="text-gray-400">Coming soon! Set your desired price and let the market come to you.</p>
                </div>
              )}

              {activeTab === 'pool' && (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Liquidity Pools</h3>
                  <p className="text-gray-400">Provide liquidity and earn fees from trades.</p>
                </div>
              )}
            </motion.div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20"
            >
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Trading Pairs</h2>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search pairs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-jet-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-neon-magenta focus:ring-1 focus:ring-neon-magenta outline-none"
                      />
                    </div>
                    <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-4 text-gray-400 font-medium">Pair</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Price</th>
                      <th className="text-right p-4 text-gray-400 font-medium">24h Change</th>
                      <th className="text-right p-4 text-gray-400 font-medium">24h Volume</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Liquidity</th>
                      <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPairs.map((pair, index) => (
                      <motion.tr
                        key={pair.symbol}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                      >
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{pair.icon}</span>
                            <div>
                              <div className="font-semibold text-white">{pair.symbol}</div>
                              <div className="text-sm text-gray-400">{pair.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right p-4">
                          <div className="font-semibold text-white">${formatPrice(pair.price)}</div>
                        </td>
                        <td className="text-right p-4">
                          <div className={`flex items-center justify-end space-x-1 ${
                            pair.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {pair.change24h >= 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <span className="font-medium">
                              {pair.change24h >= 0 ? '+' : ''}{pair.change24h.toFixed(2)}%
                            </span>
                          </div>
                        </td>
                        <td className="text-right p-4">
                          <div className="text-white font-medium">{formatNumber(pair.volume24h)}</div>
                        </td>
                        <td className="text-right p-4">
                          <div className="text-white font-medium">{formatNumber(pair.liquidity)}</div>
                        </td>
                        <td className="text-right p-4">
                          <button className="px-3 py-1 bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/30 rounded-lg hover:bg-neon-magenta/30 transition-colors text-sm font-medium">
                            Trade
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </div>

        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 text-center"
          >
            <div className="bg-gradient-to-br from-gunmetal-gray to-jet-black rounded-xl border border-neon-magenta/20 p-8">
              <Zap className="w-16 h-16 text-neon-magenta mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-gray-300 mb-6 max-w-md mx-auto">
                Connect your wallet to start trading on VeloFi DEX with the lowest fees and best prices.
              </p>
              <ConnectWalletButton />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
