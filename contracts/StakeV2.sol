// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract StakeV2Contract {
    // Define APR values scaled by 10^18 to handle 18 decimals
     uint256[6][6] APR = [[uint256(2500000000000000), uint256(7500000000000000), uint256(15000000000000000), uint256(30000000000000000), uint256(45000000000000000), uint256(60000000000000000)], [uint256(2500000000000000), uint256(15000000000000000), uint256(30000000000000000), uint256(60000000000000000), uint256(90000000000000000), uint256(120000000000000000)], [uint256(2500000000000000), uint256(15000000000000000), uint256(45000000000000000), uint256(90000000000000000), uint256(135000000000000000), uint256(180000000000000000)], [uint256(2500000000000000), uint256(15000000000000000), uint256(45000000000000000), uint256(120000000000000000), uint256(180000000000000000), uint256(240000000000000000)], [uint256(2500000000000000), uint256(15000000000000000), uint256(45000000000000000), uint256(120000000000000000), uint256(225000000000000000), uint256(300000000000000000)], [uint256(2500000000000000), uint256(15000000000000000), uint256(45000000000000000), uint256(120000000000000000), uint256(225000000000000000), uint256(360000000000000000)]];

    // Define min and max amounts for each bracket
    uint256[6] minAmount = [uint256(20000000000000000000000), uint256(25000000000000000000000), uint256(50000000000000000000000), uint256(125000000000000000000000), uint256(250000000000000000000000), uint256(500000000000000000000000)];
    uint256[6] maxAmount = [uint256(25000000000000000000000), uint256(50000000000000000000000), uint256(125000000000000000000000), uint256(250000000000000000000000), uint256(500000000000000000000000), type(uint256).max];

    // Define valid stake months
    uint256[6] STAKE_MONTH = [1, 3, 6, 12, 18, 24];

    IERC20 public token;
    address public owner;

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 duration;
        uint256 apr;
        bool withdrawn;
    }

    mapping(address => Stake[]) stakes;

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    event Staked(address indexed user, uint256 amount, uint256 duration, uint256 created, uint256 apr);
    event Unstaked(address indexed user, uint256 amount, uint256 interest);
    event UpdateStakeAPR(address indexed user);
    event UpdateStakeMonth(address indexed user);
    event UpdateStakeRangeAmount(address indexed user);

    constructor(address _tokenAddress) {
        owner = msg.sender;
        token = ERC20(_tokenAddress);
    }

    // Function to update APR values
    function updateAPR(uint256[6][6] memory newAPR) public onlyOwner {
        APR = newAPR;

        emit UpdateStakeAPR(msg.sender);
    }

    // Function to update stake months
    function updateStakeMonths(uint256[6] memory newStakeMonths) public onlyOwner {
        STAKE_MONTH = newStakeMonths;

        emit UpdateStakeMonth(msg.sender);
    }

    // Function to update min and max amounts
    function updateMinMaxAmounts(uint256[6] memory newMinAmounts, uint256[6] memory newMaxAmounts) public onlyOwner {
        minAmount = newMinAmounts;
        maxAmount = newMaxAmounts;

        emit UpdateStakeRangeAmount(msg.sender);
    }

    // Function to transfer ownership
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        owner = newOwner;
    }

    // Function to get the index based on the amount
    function getIndex(uint256 amount) public view returns (int256) {
        for (uint256 i = 0; i < minAmount.length; i++) {
            if (amount >= minAmount[i] && amount < maxAmount[i]) {
                return int256(i);
            }
        }
        return -1;
    }

    // Function to get the APR based on stake amount and stake month
    function getApr(uint256 stakeAmount, uint256 stakeMonth) public view returns (uint256) {
        int256 index = getIndex(stakeAmount);
        require(index >= 0, "Invalid stake amount");

        uint256 monthIndex;
        bool validMonth = false;

        for (uint256 i = 0; i < STAKE_MONTH.length; i++) {
            if (STAKE_MONTH[i] == stakeMonth) {
                monthIndex = i;
                validMonth = true;
                break;
            }
        }

        require(validMonth, "Invalid stake month");

        return APR[uint256(index)][monthIndex];
    }

    // Function to stake an amount for a specified duration
    function stake(uint256 amount, uint256 stakeMonth) public {
        require(amount > 0, "Amount must be greater than 0");

        int256 index = getIndex(amount);
        require(index >= 0, "Amount does not fit any bracket");

        uint256 apr = getApr(amount, stakeMonth);
        require(apr > 0, "Invalid APR");

        // Transfer tokens from the user to the contract
        require(token.transferFrom(msg.sender, owner, amount), "Token transfer failed");

        stakes[msg.sender].push(Stake(amount, block.timestamp, stakeMonth * 30 days, apr, false));

        emit Staked(msg.sender, amount, stakeMonth, block.timestamp, apr);
    }

    // Function to calculate the interest earned
    function calculateInterest(uint256 stakeIndex) public view returns (uint256) {
        Stake storage stakeInfo = stakes[msg.sender][stakeIndex];

        uint256 interest = stakeInfo.amount * stakeInfo.apr / (10**18); // Divide by 10^18 for precision
        
        return interest;
    }

    // Function to unstake a specific stake
    function unstake(uint256 stakeIndex) public {
        require(stakeIndex < stakes[msg.sender].length, "Invalid stake index");

        Stake storage stakeInfo = stakes[msg.sender][stakeIndex];
        require(!stakeInfo.withdrawn, "Stake already withdrawn");
        require(block.timestamp >= stakeInfo.startTime + stakeInfo.duration, "Stake period not yet completed");

        uint256 interest = calculateInterest(stakeIndex);
        uint256 totalAmount = stakeInfo.amount + interest;
        stakeInfo.withdrawn = true;

        // Transfer tokens back to the user
        require(token.transferFrom(owner, msg.sender, totalAmount), "Token transfer failed");

        emit Unstaked(msg.sender, stakeInfo.amount, interest);
    }

}
