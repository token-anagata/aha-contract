## Documentation of code

### Stake
This function that will be handle for staking user token where ensure minimum and maximum amount to 

``
stake(uint256 amount, uint256 stakeMonth) 
``
#### uint256 duration 
Duration of month 
#### uint256 amount 
Amount of token

---
### Unstake
This function that will be handle for unstake user was invested their token

``
unstake(uint256 stakeIndex) 
``
#### uint256 stakeIndex 
User stake index was running

---
### Get Annual Percentage Rate
This function to get the APR based on stake amount and stake month

``
getApr(uint256 amount, uint256 stakeMonth) view
``
#### uint256 duration 
Duration of month 
#### uint256 amount 
Amount of token

---

### Get Calculate Interest
This function to calculate the interest earned

``
calculateInterest(uint256 stakeIndex) view 
``
#### uint256 stakeIndex 
User stake index was running

---