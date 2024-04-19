// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StakingContract {
    address public owner;
    IERC20 public token; // The ERC20 token to be staked
    uint256 userCount;
    uint256 planIdCounter;
    address[] users;
    
    struct Plan {
        uint256 duration; // Duration in seconds
        uint256 rewardRate; // Reward rate per second
        bool isActive; // Whether the plan is active
        bool isExists;
    }
    
    mapping(uint256 => Plan) plans; // Map plan ID to Plan struct
    
    mapping(address => mapping(uint256 => uint256)) balances; // User balances for each plan
    mapping(address => mapping(uint256 => uint256)) stakedTimes; // Track the time when user staked their tokens

    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can call this function");
        _;
    }
    
    event PlanCreated(uint256 plainId, uint256 duration, uint256 rewardRate);
    event Staked(address indexed user, uint256 planId, uint256 amount);
    event Unstaked(address indexed user, uint256 planId, uint256 amount);
    event PlanDeactivated(uint256 planId);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    constructor(address _token) {
        owner = msg.sender;
        token = IERC20(_token);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    function createPlan(uint256 planId, uint256 duration, uint256 rewardRate) external onlyOwner {
        require(!plans[planId].isActive, "Plan ID already exists");
        plans[planId] = Plan(duration, rewardRate, true, true);
        planIdCounter++; // Increment planIdCounter when a new plan is created
        emit PlanCreated(planId, duration, rewardRate);
    }
    
    function deactivatePlan(uint256 planId) external onlyOwner {
        require(plans[planId].isActive, "Plan ID is already inactive");
        plans[planId].isActive = false;
        emit PlanDeactivated(planId);
    }

    function isUserExists(address user) internal view returns (bool) {
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == user) {
                return true;
            }
        }
        return false;
    }

    function remainingDuration(address user, uint256 planId) internal view returns (uint256){
        require(plans[planId].isExists, "Invalid plan ID");
        
        uint256 stakedTime = stakedTimes[user][planId];
        uint256 duration = plans[planId].duration;
        uint256 endDuration = stakedTime + (duration * 1 days);
        
        if (block.timestamp >= endDuration) {
            return 0; // Duration has already passed
        } else {
            return (endDuration - block.timestamp) / 1 days;
        }
    }

    function calculateRewardPerDay(address user, uint256 planId) internal view returns (uint256) {
        require(plans[planId].isExists, "Invalid plan ID");
        
        uint256 stakedAmount = balances[user][planId];
        uint256 rewardRate = plans[planId].rewardRate;

        // count duration in day when stacked until now
        uint256 durationInDays = remainingDuration(user, planId);

        if (durationInDays <= 0) {
            return 0;
        }

        uint256 totalReward = (stakedAmount / 1e18) * rewardRate / 100;
        uint256 reward = totalReward / durationInDays; // Divide by 10^18 for precision
        
        return reward * 1e18;
    }

    function calculateReward(address user, uint256 planId) internal view returns (uint256) {
        require(plans[planId].isExists, "Invalid plan ID");
        
        uint256 stakedAmount = balances[user][planId];
        uint256 rewardRate = plans[planId].rewardRate;
        
        // Calculate reward based on staked amount and reward rate per day
        uint256 reward = (stakedAmount / 1e18) * rewardRate / 100; // Divide by 10^18 for precision
        
        return reward * 1e18;
    }

    function getRewarPerDay(address user, uint256 planId) external view returns (uint256) {
        return calculateRewardPerDay(user, planId);
    }

    function getCalculateReward(address user, uint256 planId) external view returns (uint256) {
        return calculateReward(user, planId);
    }
    
    function stake(uint256 planId, uint256 amount) external {
        require(plans[planId].isActive, "Invalid plan ID");
        require(amount > 0, "Amount must be greater than zero");
        
        // Transfer tokens to contract
        token.transferFrom(msg.sender, address(this), amount);
        
        // Update user balance and staked time
        balances[msg.sender][planId] += amount;
        stakedTimes[msg.sender][planId] = block.timestamp; // Store current block timestamp

        userCount++; // Increment user count when a new user interacts with the contract
        

        if (!isUserExists(msg.sender)) {
            users.push(msg.sender); // Add user to the list if they are not already present
        }
        
        emit Staked(msg.sender, planId, amount);
    }
    
    function unstake(uint256 planId) external {
        require(plans[planId].isExists, "Invalid plan ID");
        
        //uint256 stakedTime = stakedTimes[msg.sender][planId];
        //uint256 duration = plans[planId].duration;
        //uint256 endDuration = stakedTime + (duration * 1 days);
        
        //require(block.timestamp >= endDuration, "Duration not passed");
        
        uint256 amount = balances[msg.sender][planId];
        require(amount > 0, "No balance to unstake");
        
        // Calculate reward
        uint256 reward = calculateReward(msg.sender, planId);
        uint256 total = amount + reward;

        // Transfer staked amount and reward to user
        token.transfer(msg.sender, total);

        // Update user balance
        balances[msg.sender][planId] = 0;

        userCount--; // Decrement user count when a user unstakes all their tokens
        
        emit Unstaked(msg.sender, planId, amount);
    }

    function getRemainingDuration(address user, uint256 planId) external view returns (uint256) {
        return remainingDuration(user, planId);
    }

    function getCurrentReward(address user, uint256 planId) external view returns (uint256) {
        require(plans[planId].isExists, "Invalid plan ID");

        uint256 stakedTime = stakedTimes[user][planId];
        uint256 duration = block.timestamp - stakedTime / 1 days;

        uint256 remainingDay = remainingDuration(user, planId);
        uint256 rewardRatePerDay = calculateRewardPerDay(user, planId);
        uint256 totalDay = duration - remainingDay;

        // Calculate reward based on staked duration and reward rate
        uint256 reward = totalDay * rewardRatePerDay; 

        return reward * 1e18; // multiply by 10^18 for precision
    }

    function getUserTotalStakedBalance(address user) external view returns (uint256) {
        uint256 totalStakedBalance = 0;
        for (uint256 i = 0; i < planIdCounter; i++) {
            totalStakedBalance += balances[user][i];
        }
        return totalStakedBalance;
    }

    function getTotalStakedAmount(uint256 planId) external view returns (uint256) {
        require(plans[planId].isExists, "Invalid plan ID");

        uint256 totalStakedAmount = 0;
        for (uint256 i = 0; i < userCount; i++) {
            totalStakedAmount += balances[users[i]][planId];
        }
        return totalStakedAmount;
    }

    function getTotalAllUserStaked() external view returns (uint256) {
        uint256 totalStakedAmount = 0;
        for (uint256 i = 0; i < userCount; i++) {
            for (uint256 j = 0; j < planIdCounter; j++) {
                totalStakedAmount += balances[users[i]][j];
            }
        }
        return totalStakedAmount;
    }


}
