## Documentation of code

### Create Plan
 
This function to create a plan for staking 

``
function createPlan(uint256 planId, uint256 duration, uint256 rewardRate, uint256 minStake, uint256 maxStake) external onlyOwner 
``
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

---
### Deactivated Plan
Turn off staking plan was running

``
deactivatePlan(uint256 planId) external onlyOwner 
``
#### uint256 planId 
Plan id that gonna be turn off

---
### Remaining Duration
See how long remaining duration staking rewards user  for plan id done

``
remainingDuration(address user, uint256 planId) internal view returns (uint256)
``
#### uint256 user 
User address 
#### uint256 planId 
Plan id was running

---
### Calculate Reward Per Day 
Calculate how get reward per day was invested  

``
calculateRewardPerDay(address user, uint256 planId) internal view returns (uint256)
``
#### uint256 user 
User address
#### uint256 planId 
Plan id was running

---
### Calculate Reward 
Calculate how get reward was invested  

``
calculateReward(address user, uint256 planId) internal view returns (uint256)
``
#### uint256 user 
User address
#### uint256 planId 
Plan id was running

---
### Stake
This function that will be handle for staking user token where ensure minimum and maximum amount to 

``
stake(uint256 planId, uint256 amount) external
``
#### uint256 planId 
Plan id was running
#### uint256 amount 
Amount of token

---
### Unstake
This function that will be handle for unstake user was invested their token

``
unstake(uint256 planId) external
``
#### uint256 planId 
Plan id was running

---
### Get User Stacked Plans
This function that gonna be return an array of plan id was user stacked

``
function getUserStakedPlans(address user) external view returns (uint256[] memory) 
``
#### uint256 user 
User address

---
### Get Current Reward
This function that gonna be show get currently reward of stake plan

``
getCurrentReward(address user, uint256 planId) external view returns (uint256)
``

#### uint256 user 
User address
#### uint256 planId 
Plan id was running

---
### Get Total Amount of User Staked
This function that gonna be show total amount of user staked

``
getUserTotalStakedBalance(address user) external view returns (uint256)
``

#### uint256 user 
User address

---
### Get Total of Staked Amount
This function that gonna be show total amount staked by plan id

``
getTotalStakedAmount(uint256 planId) external view returns (uint256)
``

#### uint256 planId 
Plan id was running

### Get Total of All Staked Amount
This function that gonna be show total amount staked

``
getTotalAllUserStaked() external view returns (uint256)
``

