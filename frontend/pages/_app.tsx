import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '../config/wagmi'
import { RainbowKitProvider, darkTheme, ConnectButton } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { AuthProvider } from '../contexts/AuthContext'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ErrorBoundary from '../components/ErrorBoundary'
import { Toaster } from 'react-hot-toast'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false)
  const [queryClient] = useState(() => new QueryClient())

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#32D74B',
            accentColorForeground: '#0D0D0D',
            borderRadius: 'large',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
          appInfo={{
            appName: 'VeloFi',
            learnMoreUrl: 'https://github.com/trinnode/velofi'
          }}
          coolMode
        >
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <Head>
                <title>VeloFi - Next-Generation DeFi Platform</title>
                <meta
                  name="description"
                  content="VeloFi - Real-time yield savings, credit-based lending, and ultra-fast DEX on Somnia Network"
                />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" type="image/png" href="/Logo.png" />
                <link rel="shortcut icon" type="image/png" href="/Logo.png" />
                <link rel="apple-touch-icon" href="/Logo.png" />
                <meta property="og:title" content="VeloFi - Next-Generation DeFi Platform" />
                <meta
                  property="og:description"
                  content="Real-time yield savings, credit-based lending, and ultra-fast DEX on Somnia Network"
                />
                <meta property="og:image" content="/Logo.png" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="VeloFi - Next-Generation DeFi Platform" />
                <meta
                  name="twitter:description"
                  content="Real-time yield savings, credit-based lending, and ultra-fast DEX on Somnia Network"
                />
                <meta name="twitter:image" content="/Logo.png" />
              </Head>
              <div className="min-h-screen bg-gunmetal-gray text-white flex flex-col">
                <Header />
                <main className="flex-1">
                  <div className="flex justify-end items-center p-4">
                    <div style={{ minWidth: 180 }}>
                      <ConnectButton />
                    </div>
                  </div>
                  <Component {...pageProps} />
                </main>
                <Footer />
              </div>
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: '#1F1F1F',
                    color: '#FFFFFF',
                    border: '1px solid #32D74B',
                  },
                }}
              />
            </AuthProvider>
          </QueryClientProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </ErrorBoundary>
  )
}
