import React, { createContext, useContext, useState, useEffect } from 'react';
import { SiweMessage } from 'siwe';
import { useAccount, useSignMessage } from 'wagmi';
import toast from 'react-hot-toast';

interface SIWEContextType {
  isAuthenticated: boolean;
  address: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
  loading: boolean;
}

const SIWEContext = createContext<SIWEContextType | undefined>(undefined);

export const useSIWE = () => {
  const context = useContext(SIWEContext);
  if (!context) {
    throw new Error('useSIWE must be used within a SIWEProvider');
  }
  return context;
};

export const SIWEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('siwe-token');
    const storedAddress = localStorage.getItem('siwe-address');
    
    if (token && storedAddress && address && storedAddress === address) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      localStorage.removeItem('siwe-token');
      localStorage.removeItem('siwe-address');
    }
  }, [address]);

  const signIn = async () => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    
    try {
      // Get nonce from backend
      const nonceResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/nonce`);
      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce');
      }
      const { nonce } = await nonceResponse.json();

      // Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: process.env.NEXT_PUBLIC_SIWE_STATEMENT || 'Welcome to VeloFi! Sign this message to authenticate.',
        uri: window.location.origin,
        version: '1',
        chainId: 1, // Will be updated based on connected chain
        nonce: nonce,
      });

      const messageString = message.prepareMessage();

      // Sign the message
      const signature = await signMessageAsync({
        message: messageString,
      });

      // Verify signature with backend
      const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageString,
          signature: signature,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify signature');
      }

      const { token } = await verifyResponse.json();

      // Store authentication data
      localStorage.setItem('siwe-token', token);
      localStorage.setItem('siwe-address', address);
      setIsAuthenticated(true);
      
      toast.success('Successfully signed in!');
    } catch (error) {
      console.error('SIWE sign in error:', error);
      toast.error('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('siwe-token');
    localStorage.removeItem('siwe-address');
    setIsAuthenticated(false);
    toast.success('Successfully signed out!');
  };

  const value: SIWEContextType = {
    isAuthenticated,
    address: address || null,
    signIn,
    signOut,
    loading,
  };

  return (
    <SIWEContext.Provider value={value}>
      {children}
    </SIWEContext.Provider>
  );
};
