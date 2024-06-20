// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MultiTokenDonation {
    address public owner;
    mapping(address => mapping(uint256 => uint256)) public totalDonations; // Token address => Project ID => Total donations
    mapping(address => mapping(uint256 => mapping(address => uint256))) public donations; // Token address => Project ID => Donor address => Donations

    event DonationReceived(address indexed donor, address indexed token, uint256 amount, uint256 indexed projectId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        owner = newOwner;
    }

    function donate(address token, uint256 amount, uint256 projectId) external {
        require(amount > 0, "Donation amount must be greater than zero");
        ERC20(token).transferFrom(msg.sender, owner, amount);
        totalDonations[token][projectId] += amount;
        donations[token][projectId][msg.sender] += amount;
        emit DonationReceived(msg.sender, token, amount, projectId);
    }

}
