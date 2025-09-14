import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    "somnia-testnet": {
      url: "https://testnet-rpc.somnia.network",
      accounts: [""],
      type: "http",
    },
  },
};

export default config;
