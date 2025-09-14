// Contract addresses on Somnia Network
export const CONTRACT_ADDRESSES = {
  MockERC20: "0x9954251e9a86d6566Df39F6e41B83E55Ec07Cc64",
  CreditScore: "0x65A190159B085E302FCe7c4E406f852295d3FF6b",
  Savings: "0xCc07ccE8F6A09C45e92644760aaA8e678C0E3A97",
  Lending: "0xf247C9466e5722dd12351894231017C98073d756",
  Exchange: "0x8B65Bdfc823D741B296dDBaD9cf7C1983FA556c1",
  Governance: "0x57D9186e8BC1901aa7DDA85b9e0784AaF99e6c03",
} as const;

// Contract ABIs
export { default as MockERC20ABI } from "./abis/MockERC20.json";
export { default as CreditScoreABI } from "./abis/CreditScore.json";
export { default as SavingsABI } from "./abis/Savings.json";
export { default as LendingABI } from "./abis/Lending.json";
export { default as ExchangeABI } from "./abis/Exchange.json";
export { default as GovernanceABI } from "./abis/Governance.json";

// Helper function to get contract address by name
export function getContractAddress(
  contractName: keyof typeof CONTRACT_ADDRESSES
): string {
  return CONTRACT_ADDRESSES[contractName];
}

// Network configuration
export const SOMNIA_NETWORK = {
  chainId: 50311, // Somnia Testnet chain ID
  name: "Somnia Network",
  nativeCurrency: {
    name: "STT",
    symbol: "STT",
    decimals: 18,
  },
  rpcUrls: ["https://dream-rpc.somnia.network"],
  blockExplorerUrls: ["https://testnet-explorer.somnia.network"],
} as const;
