// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StakingContract {
    address public owner;
    IERC20 public token; // The ERC20 token to be staked
    uint256[] planIdState;
    address[] users;
    
    struct Plan {
        uint256 duration; // Duration in seconds
        uint256 rewardRate; // Reward rate in percentage
        uint256 minStake; // minimum stake
        uint256 maxStake; // maximum stake
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
    
    event PlanCreated(uint256 planId, uint256 duration, uint256 rewardRate, uint256 minStake, uint256 maxStake);
    event Staked(address indexed user, uint256 planId, uint256 amount);
    event Unstaked(address indexed user, uint256 planId, uint256 amount);
    event PlanActivated(uint256 planId);
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
    
    function createPlan(uint256 planId, uint256 duration, uint256 rewardRate, uint256 minStake, uint256 maxStake) external onlyOwner {
        require(!plans[planId].isActive, "Plan ID already exists");
        plans[planId] = Plan(duration, rewardRate, minStake, maxStake, true, true);
        planIdState.push(planId); // Push plan id when a new plan is created
        emit PlanCreated(planId, duration, rewardRate, minStake, maxStake);
    }

    function activatePlan(uint256 planId) external onlyOwner {
        require(!plans[planId].isActive, "Plan ID is already active");
        plans[planId].isActive = true;
        emit PlanActivated(planId);
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

        uint256 totalReward = stakedAmount * rewardRate / (100 * 1e18);
        uint256 reward = totalReward / durationInDays; // Divide by 10^18 for precision
        
        return reward;
    }

    function calculateReward(address user, uint256 planId) internal view returns (uint256) {
        require(plans[planId].isExists, "Invalid plan ID");
        
        uint256 stakedAmount = balances[user][planId];
        uint256 rewardRate = plans[planId].rewardRate;       
        // Calculate reward based on staked amount and reward rate per day
        uint256 reward = stakedAmount * rewardRate / (100 * 1e18); // Divide by 10^18 for precision
        
        return reward;
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

        // Validate minimum and maximum stake
        require(amount >= plans[planId].minStake, "Amount is below minimum stake");
        require(amount <= plans[planId].maxStake, "Amount exceeds maximum stake");
        
        // Transfer tokens to contract
        token.transferFrom(msg.sender, address(this), amount);

        // Update user balance and staked time
        balances[msg.sender][planId] += amount;
        stakedTimes[msg.sender][planId] = block.timestamp; // Store current block timestamp

        if (!isUserExists(msg.sender)) {
            users.push(msg.sender); // Add user to the list if they are not already present
        }
        
        emit Staked(msg.sender, planId, amount);
    }
    
    function unstake(uint256 planId) external {
        require(plans[planId].isExists, "Invalid plan ID");
        
        uint256 stakedTime = stakedTimes[msg.sender][planId];
        uint256 duration = plans[planId].duration;
        uint256 endDuration = stakedTime + (duration * 1 days);
        
        require(block.timestamp >= endDuration, "Duration not passed");
        
        uint256 amount = balances[msg.sender][planId];

        require(amount > 0, "No balance to unstake");
        
        // Calculate reward
        uint256 reward = calculateReward(msg.sender, planId);
        uint256 total = amount + reward;

        token.transfer(msg.sender, total);// Transfer staked amount and reward to user
        balances[msg.sender][planId] = 0;// Update user balance
        
        emit Unstaked(msg.sender, planId, amount);
    }

    function getRemainingDuration(address user, uint256 planId) external view returns (uint256) {
        return remainingDuration(user, planId);
    }

    function getCurrentReward(address user, uint256 planId) external view returns (uint256) {
        require(plans[planId].isExists, "Invalid plan ID");

        uint256 duration = plans[planId].duration;
        uint256 remainingDay = remainingDuration(user, planId);
        uint256 rewardRatePerDay = calculateRewardPerDay(user, planId);
        uint256 totalDay = duration - remainingDay;
        uint256 reward = totalDay * rewardRatePerDay; // Calculate reward based on staked duration and reward rate

        return reward;
    }

    function getUserStakedPlans(address user) external view returns (uint256[] memory) {
        uint256[] memory stakedPlans = new uint256[](planIdState.length);
        for (uint256 i = 0; i < planIdState.length; i++) {
            if (balances[user][planIdState[i]] > 0) {
                stakedPlans[i] = planIdState[i]; 
            }
        }
        return stakedPlans;
    }

    function getUserTotalStakedBalance(address user) external view returns (uint256) {
        uint256 totalStakedBalance = 0;
        for (uint256 i = 0; i < planIdState.length; i++) {
            totalStakedBalance += balances[user][planIdState[i]];
        }
        return totalStakedBalance;
    }

    function getTotalStakedAmount(uint256 planId) external view returns (uint256) {
        require(plans[planId].isExists, "Invalid plan ID");

        uint256 totalStakedAmount = 0;
        for (uint256 i = 0; i < users.length; i++) {
            totalStakedAmount += balances[users[i]][planId];
        }
        return totalStakedAmount;
    }

    function getTotalAllUserStaked() external view returns (uint256) {
        uint256 totalStakedAmount = 0;
        for (uint256 i = 0; i < users.length; i++) {
            for (uint256 j = 0; j < planIdState.length; j++) {
                totalStakedAmount += balances[users[i]][j];
            }
        }
        return totalStakedAmount;
    }


}
