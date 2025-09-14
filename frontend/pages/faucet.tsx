import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useContract } from '../hooks/useContract';
import { parseEther } from 'viem';
// ...existing code...

const FAUCET_AMOUNT = '1000'; // 1000 tokens
const FAUCET_LIMIT = 2; // Max 2 mints per 24h
// ...existing code...

function getFaucetKey(address: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `faucet_${address}_${today}`;
}

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const { mockTokenContract } = useContract();
  const [mintCount, setMintCount] = useState(0);
  const [isMinting, setIsMinting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      const key = getFaucetKey(address);
      const count = Number(localStorage.getItem(key) || '0');
      setMintCount(count);
    }
  }, [address]);

  const handleMint = async () => {
    if (!mockTokenContract || !address) return;
    if (mintCount >= FAUCET_LIMIT) {
      setError('Faucet limit reached for today.');
      return;
    }
    setIsMinting(true);
    setError(null);
    try {
      const amount = parseEther(FAUCET_AMOUNT);
      const tx = await mockTokenContract.write.mint([address, amount]);
      setTxHash(tx.hash);
      // Wait for confirmation (optional)
      await tx.wait();
      // Update mint count
      const key = getFaucetKey(address);
      localStorage.setItem(key, String(mintCount + 1));
      setMintCount(mintCount + 1);
  } catch (err) {
    setError((err as Error)?.message || 'Mint failed');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gunmetal-gray text-electric-lime">
      <div className="max-w-md w-full p-8 rounded-xl border-2 border-electric-lime bg-jet-black">
        <h1 className="text-2xl font-bold mb-4 text-center text-neon-magenta">Faucet</h1>
        <p className="mb-6 text-center text-white">Mint <span className="font-bold text-electric-lime">{FAUCET_AMOUNT} VLFI</span> tokens to your wallet.<br />Limit: <span className="text-neon-magenta">{FAUCET_LIMIT} mints per 24h</span>.</p>
        {isConnected ? (
          <>
            <button
              className={`w-full py-3 px-6 rounded-lg font-semibold mb-4 disabled:opacity-50 ${mintCount >= FAUCET_LIMIT ? 'bg-gunmetal-gray text-white' : 'bg-electric-lime text-jet-black'}`}
              onClick={handleMint}
              disabled={isMinting || mintCount >= FAUCET_LIMIT}
              style={{ border: `2px solid #FF00AA` }}
            >
              {isMinting ? 'Minting...' : `Mint ${FAUCET_AMOUNT} VLFI`}
            </button>
            {txHash && (
              <div className="text-center text-sm mb-2 text-electric-lime">Tx: <a href={`https://testnet-explorer.somnia.network/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline text-neon-magenta">{txHash.slice(0, 10)}...</a></div>
            )}
            {error && <div className="text-neon-magenta text-center mb-2">{error}</div>}
            <div className="text-center text-xs text-gunmetal-gray">Minted: {mintCount} / {FAUCET_LIMIT} today</div>
          </>
        ) : (
          <div className="text-center text-white">Connect your wallet to use the faucet.</div>
        )}
      </div>
    </div>
  );
}
