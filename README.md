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


You can check example deploy in binance smart chain testnet [0xDdcd7Ef97EDd3d3255BFACAC826486B2b5047964](https://testnet.bscscan.com/address/0xDdcd7Ef97EDd3d3255BFACAC826486B2b5047964#code).


## Documentation of code

### Create Plan 
``
function createPlan(uint256 planId, uint256 duration, uint256 rewardRate, uint256 minStake, uint256 maxStake) external onlyOwner 
``

This function to create a plan for staking 
#### uint256 planId 
Unique number identifiation plan
#### uint256 duration 
How long duration for staking running. Duration format in days, if fill 100 that's mean 100 days
#### uint256 rewardRate 
Reward rate in percentage. for example reward rate `5%`. after the duration is completed, investor gets 5% of the amount invested. for example 5000, then he will get 500(5%)
#### uint256 minStake 
Minimum amount to able stake in plan
#### uint256 maxStake 
Maximum amount to able stake in plan


### Deactivated Plan
``
deactivatePlan(uint256 planId) external onlyOwner 
``

Turn off staking plan was running
#### uint256 planId 
Plan id that gonna be turn off

### Remaining Duration
``
remainingDuration(address user, uint256 planId) internal view returns (uint256)
``

See how long remaining duration staking rewards user  for plan id done
#### uint256 user 
User address 
#### uint256 planId 
Plan id was running

### Calculate Reward Per Day 
``
calculateRewardPerDay(address user, uint256 planId) internal view returns (uint256)
``

Calculate how get reward per day was invested  
#### uint256 user 
User address
#### uint256 planId 
Plan id was running

### Calculate Reward 
``
calculateReward(address user, uint256 planId) internal view returns (uint256)
``

Calculate how get reward was invested  
#### uint256 user 
User address
#### uint256 planId 
Plan id was running

### Stake
``
stake(uint256 planId, uint256 amount) external
``

This function that will be handle for staking user token where ensure minimum and maximum amount to 
#### uint256 planId 
Plan id was running
#### uint256 amount 
Amount of token

### Unstake
``
unstake(uint256 planId) external
``

This function that will be handle for unstake user was invested their token
#### uint256 planId 
Plan id was running

### Get User Stacked Plans
``
function getUserStakedPlans(address user) external view returns (uint256[] memory) 
``

This function that gonna be return an array of plan id was user stacked
#### uint256 user 
User address


### Get Current Reward
``
getCurrentReward(address user, uint256 planId) external view returns (uint256)
``

This function that gonna be show get currently reward of stake plan
#### uint256 user 
User address
#### uint256 planId 
Plan id was running

### Get Total Amount of User Staked
``
getUserTotalStakedBalance(address user) external view returns (uint256)
``

This function that gonna be show total amount of user staked
#### uint256 user 
User address

### Get Total of Staked Amount
``
getTotalStakedAmount(uint256 planId) external view returns (uint256)
``

This function that gonna be show total amount staked by plan id
#### uint256 planId 
Plan id was running

### Get Total of All Staked Amount
``
getTotalAllUserStaked() external view returns (uint256)
``

This function that gonna be show total amount staked


## Task list
- [x] Test realible smarcontract 
- [x] Never use in mainnet
- [✓] Test got reward 
- [✓] Add unit testing 

