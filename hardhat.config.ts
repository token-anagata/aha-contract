import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";

import { mnemonic, amoyApiKey, bscscanApiKey, privateKey } from './secret.json'
import BNB from "./chain/BNB";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  ignition: {
    requiredConfirmations: 1
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    bscTestnet: {
      url: BNB[0],
      chainId: 97,
      accounts: [privateKey],
      // gasMultiplier: 1.5, 
      // gas: 'auto',
      // gasPrice: 800000000000,
      // blockGasLimit: 0x1fffffffffffff,
      // allowUnlimitedContractSize: true,
      // timeout: 1800000,
      // throwOnTransactionFailures: true,
      // throwOnCallFailures: true,
    },
    bscMainnet: {
      url: "https://bsc-dataseed.bnbchain.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: { mnemonic: mnemonic }
    },
    polygonAmoy: {
      url: 'https://rpc-amoy.polygon.technology/',
      chainId: 80002,
      gasPrice: 20000000000,
      accounts: [privateKey]
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://bscscan.com/
    apiKey: {
      bscTestnet: bscscanApiKey,
      polygonAmoy: amoyApiKey
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL:
            "https://www.oklink.com/api/explorer/v1/contract/verify/async/api/polygonAmoy",
          browserURL: "https://www.oklink.com/polygonAmoy",
        },
      },
    ],
  }
};

export default config;
