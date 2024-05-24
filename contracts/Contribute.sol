// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ContributeContract {
    address public owner;
    IERC20 public token; // The ERC20 token to be Invest
    uint256[] projectIds;

    enum STATUS {
        FREZE_FUNDING,
        ON_FUNDING,
        FULFILLED,
        NOT_FULFILLED,
        FINISHED
    }

    struct Project {
        uint256 duration; // Duration in seconds
        uint256 rewardRate; // Reward rate in percentage
        uint256 minAmount; // minimum invest
        uint256 maxAmount; // maximum invest
        bool isExists; // Whether project is existing
        STATUS status; // Whether the project is fulfilled not
    }

    struct Leverage {
        uint256 timestamp;
        uint256 amount;
        bool isQueue;
    }

    mapping(uint256 => Project) projects; // Map project ID to Project struct
    mapping(uint256 => mapping(address => Leverage)) leverage; // User balances for each project
    mapping(uint256 => address[]) addresses; // Map addresses by leverage

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only contract owner can call this function"
        );
        _;
    }

    event ProjectCreated(
        uint256 projectId,
        uint256 duration,
        uint256 rewardRate,
        uint256 minAmount,
        uint256 maxAmount,
        STATUS status
    );
    event ProjectUpdated(uint256 projectId);
    event Queue(address indexed user, uint256 projectId, uint256 amount);
    event AllocateLeverages(
        uint256 projectId,
        uint256 totalAddress,
        uint256 total
    );
    event Claim(address indexed user, uint256 projectId, uint256 amount);
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    constructor(address _token) {
        owner = msg.sender;
        token = IERC20(_token);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid new owner address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }

    function createProject(
        uint256 _projectId,
        uint256 _duration,
        uint256 _rewardRate,
        uint256 _minAmount,
        uint256 _maxAmount,
        STATUS _status
    ) external onlyOwner {
        require(!projects[_projectId].isExists, "Project ID already exists");
        projects[_projectId] = Project({
            duration: _duration,
            rewardRate: _rewardRate,
            minAmount: _minAmount,
            maxAmount: _maxAmount,
            status: _status,
            isExists: true
        });
        projectIds.push(_projectId); // Push project id when a new project is created
        emit ProjectCreated(
            _projectId,
            _duration,
            _rewardRate,
            _minAmount,
            _maxAmount,
            _status
        );
    }

    function changeStatus(
        uint256 _projectId,
        STATUS _status
    ) external onlyOwner {
        require(projects[_projectId].isExists, "Invalid project ID");
        require(projects[_projectId].status == _status, "Project status is already ID");
        projects[_projectId].status = _status;
        emit ProjectUpdated(_projectId);
    }

    function remainingDuration(
        address _address,
        uint256 _projectId
    ) internal view returns (uint256) {
        require(projects[_projectId].isExists, "Invalid project ID");

        uint256 stackedTime = leverage[_projectId][_address].timestamp;
        uint256 duration = projects[_projectId].duration;
        uint256 endDuration = stackedTime + (duration * 1 days);

        if (block.timestamp >= endDuration) {
            return 0; // Duration has already passed
        } else {
            return (endDuration - block.timestamp) / 1 days;
        }
    }

    function isAddressExistsInProject(
        uint256 _projectId,
        address _user
    ) internal view returns (bool) {
        for (uint256 i = 0; i < addresses[_projectId].length; i++) {
            if (addresses[_projectId][i] == _user) {
                return true;
            }
        }
        return false;
    }

    function calculateRewardPerDay(
        address _address,
        uint256 _projectId
    ) internal view returns (uint256) {
        require(projects[_projectId].isExists, "Invalid project ID");

        uint256 amount = leverage[_projectId][_address].amount;
        uint256 rewardRate = projects[_projectId].rewardRate;
        // count duration in day when stacked until now
        uint256 durationInDays = remainingDuration(_address, _projectId);
        if (durationInDays <= 0) {
            return 0;
        }

        uint256 totalReward = (amount * rewardRate) / (100 * 1e18);
        uint256 reward = totalReward / durationInDays; // Divide by 10^18 for precision

        return reward;
    }

    function calculateReward(
        address _address,
        uint256 _projectId
    ) internal view returns (uint256) {
        require(projects[_projectId].isExists, "Invalid project ID");

        uint256 amount = leverage[_projectId][_address].amount;
        uint256 rewardRate = projects[_projectId].rewardRate;
        // Calculate reward based on Invest amount and reward rate per day
        uint256 reward = (amount * rewardRate) / (100 * 1e18); // Divide by 10^18 for precision

        return reward;
    }

    function getRewarPerDay(
        address _address,
        uint256 _projectId
    ) external view returns (uint256) {
        return calculateRewardPerDay(_address, _projectId);
    }

    function getCalculateReward(
        address _address,
        uint256 _projectId
    ) external view returns (uint256) {
        return calculateReward(_address, _projectId);
    }

    function queuesUp(uint256 _projectId, uint256 _amount) external {
        require(projects[_projectId].isExists, "Invalid project ID");
        require(
            projects[_projectId].status != STATUS.ON_FUNDING,
            "Invalid status"
        );
        require(_amount > 0, "Amount must be greater than zero");
        // Validate minimum and maximum stake
        require(_amount >= projects[_projectId].minAmount, "Amount is below minimum stake");
        require(_amount <= projects[_projectId].maxAmount, "Amount exceeds maximum stake");

        require(token.approve(address(this), _amount), "Approval failed");

        leverage[_projectId][msg.sender] = Leverage({
            amount: _amount,
            isQueue: true,
            timestamp: block.timestamp
        });

        if (!isAddressExistsInProject(_projectId, msg.sender)) {
            addresses[_projectId].push(msg.sender);
        }

        emit Queue(msg.sender, _projectId, _amount);
    }

    function allocate(uint256 _projectId) external onlyOwner {
        require(projects[_projectId].isExists, "Invalid project ID");
        require(projects[_projectId].status == STATUS.FULFILLED, "Invalid status");

        uint256 totalAddress = addresses[_projectId].length;
        uint256 total = 0;

        for (uint256 i = 0; i < totalAddress; i++) {
            address currentAddress = addresses[_projectId][i];
            uint256 amount = leverage[_projectId][currentAddress].amount;
            // Transfer user tokens was into queue register to contract
            token.transferFrom(currentAddress, address(this), amount);
            // Update data
            leverage[_projectId][currentAddress].timestamp = block.timestamp;
            leverage[_projectId][currentAddress].isQueue = false;

            total += amount;
        }

        projects[_projectId].status = STATUS.FULFILLED; //Change status to fulfilled
        emit AllocateLeverages(_projectId, totalAddress, total);
    }

    function claim(uint256 _projectId) external {
        require(projects[_projectId].isExists, "Invalid project ID");
        require(projects[_projectId].status != STATUS.FULFILLED, "Invalid status");

        uint256 stakedTime = leverage[_projectId][msg.sender].timestamp;
        uint256 duration = projects[_projectId].duration;
        uint256 endDuration = stakedTime + (duration * 1 days);

        require(block.timestamp >= endDuration, "Duration not passed");

        uint256 amount = leverage[_projectId][msg.sender].amount;

        require(amount > 0, "Invalid amount");

        // Calculate reward
        uint256 reward = calculateReward(msg.sender, _projectId);
        uint256 total = amount + reward;

        token.transfer(msg.sender, total); // Transfer Invest amount and reward to user
        leverage[_projectId][msg.sender].amount = 0; // Update user balance

        emit Claim(msg.sender, _projectId, amount);
    }

    function getRemainingDuration(
        address _address,
        uint256 _projectId
    ) external view returns (uint256) {
        return remainingDuration(_address, _projectId);
    }

    function getCurrentReward(
        address _address,
        uint256 _projectId
    ) external view returns (uint256) {
        require(projects[_projectId].isExists, "Invalid project ID");

        uint256 duration = projects[_projectId].duration;
        uint256 remainingDay = remainingDuration(_address, _projectId);
        uint256 rewardRatePerDay = calculateRewardPerDay(_address, _projectId);
        uint256 totalDay = duration - remainingDay;
        uint256 reward = totalDay * rewardRatePerDay; // Calculate reward based on Invest duration and reward rate

        return reward;
    }

    function getBalance(
        address _address,
        uint256 _projectId
    ) external view returns (uint256) {
        require(projects[_projectId].isExists, "Invalid project ID");

        if (!isAddressExistsInProject(_projectId, _address)) {
            return leverage[_projectId][_address].amount;
        }

        return 0;
    }

    function getTotalBalance(address _address) external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < projectIds.length; i++) {
            if (!isAddressExistsInProject(projectIds[i], _address)) {
                total += leverage[projectIds[i]][_address].amount;
            }
        }
        return total;
    }

    function getTotalProjectAmount(
        uint256 _projectId
    ) external view returns (uint256) {
        require(projects[_projectId].isExists, "Invalid project ID");

        uint256 total = 0;

        for (uint256 i = 0; i < addresses[_projectId].length; i++) {
            total += leverage[_projectId][addresses[_projectId][i]].amount;
        }
        return total;
    }

    function getTotalAllOfAmount() external view returns (uint256) {
        uint256 total = 0;

        for (uint256 i = 0; i < projectIds.length; i++) {
            uint256 projectId = projectIds[i];

            for (uint256 j = 0; j < addresses[projectId].length; j++) {
                total += leverage[projectId][addresses[projectId][j]].amount;
            }
        }
        return total;
    }
}
