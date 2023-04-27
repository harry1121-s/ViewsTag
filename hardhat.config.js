require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-web3");

const CONFIG = require("./credentials.json");

module.exports = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 300,
      },
    },
  },
  allowUnlimitedContractSize: true,
  networks:{
    bscTestnet:{
      url: CONFIG["BSCTESTNET"]["URL"],
      accounts: [CONFIG["BSCTESTNET"]["PKEY"]]
    }
  },
  etherscan:{
    apiKey: "Y42W4ZCDZ2QKGAESBDHY4RK57CCND42BJV"
  }
};
