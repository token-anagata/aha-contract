# AHA Token Stake Smart Contract 

This project contains smartcontract for staking token AHA.

## How running
Install dependencies
```shell
npm install
or 
yarn 
```
Create secret.json, you can see example in secret.example & define as needed
```
{
    "mnemonic": "0x",
    "bscscanApiKey": "0x",
    "privateKey": "0x"
}
```
Running some of the following tasks:

```shell
npx hardhat help
npx hardhat compile # compile smartcontract
npx hardhat test # test smartcontract add REPORT_GAS=true for reporting gas
npx hardhat node # run localhost rpc
```
### Deployment
Testnet
```shell
npx hardhat ignition deploy ignition/modules/Stake.ts --network bscTestnet --parameters ignition/parameters.json --verify
```

mainet
```shell
npx hardhat ignition deploy ignition/modules/Stake.ts --network bscMainnet --parameters ignition/parameters.json --verify
```


You can check example deploy in binance smart chain testnet [0x62A6b74Ce7aB62E54B04646C0eb68a9155eA3875](https://testnet.bscscan.com/address/0x62A6b74Ce7aB62E54B04646C0eb68a9155eA3875#code).


## Task list
- [x] Test realible smarcontract 
- [x] Never use in mainnet
- [✓] Test got reward 
- [✓] Add unit testing 

