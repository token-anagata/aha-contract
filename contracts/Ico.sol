// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract ICOContract {
    using Math for uint256;

    address public owner;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public tokenPrice;
    uint256 public tokenSold;
    uint256 public minAmount;
    uint256 public maxAmount;
    ERC20 public tokenForSale;
    ERC20 public tokenAccepted;

    mapping(address => uint256) public balances;

    event TokensPurchased(
        address indexed buyer,
        uint256 amount,
        uint256 totalPrice
    );
    event TokensWithdrawn(address indexed buyer, uint256 amount);
    event PriceUpdated(uint256 price);
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    constructor(
        address _tokenSale,
        address _tokenAccepted,
        uint256 _tokenPrice,
        uint256 _minAmount,
        uint256 _maxAmount,
        uint256 _startTime,
        uint256 _durationInDays
    ) {
        owner = msg.sender;
        tokenForSale = ERC20(_tokenSale);
        tokenAccepted = ERC20(_tokenAccepted);
        tokenPrice = _tokenPrice;
        minAmount = _minAmount;
        maxAmount = _maxAmount;
        startTime = _startTime;
        endTime = _startTime + (_durationInDays * 1 days);
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only contract owner can call this function"
        );
        _;
    }

    modifier duringICO() {
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "ICO is not active"
        );
        _;
    }

    function changeSale(
        uint256 _startTime,
        uint256 _endTime
    ) external onlyOwner {
        startTime = _startTime;
        endTime = _endTime;
    }

    function buyTokens(uint256 _amount) external duringICO {
         // Validate minimum and maximum token price
        require(_amount >= minAmount, "Amount is below minimum token price");
        require(_amount <= maxAmount, "Amount exceeds maximum token price");
        require(
            tokenAccepted.allowance(msg.sender, address(this)) <= _amount,
            "Allowance not set"
        );
        require(
            tokenAccepted.transferFrom(msg.sender, owner, _amount),
            "Transfer failed"
        );

        uint256 tokensToBuy = (_amount * (10 ** tokenForSale.decimals())) / tokenPrice;
        require(
            tokenForSale.allowance(owner, address(this)) >= tokensToBuy,
            "Not enough tokens available for sale"
        );

        tokenForSale.transferFrom(owner, msg.sender, tokensToBuy);
        tokenSold += tokensToBuy;
        balances[msg.sender] += tokensToBuy;

        emit TokensPurchased(msg.sender, tokensToBuy, _amount);
    }

    function withdrawTokensAccepted() external onlyOwner {
        uint256 amount = tokenAccepted.balanceOf(address(this));
        tokenAccepted.transfer(owner, amount);
    }

    function setTokenPrice(uint256 _newPrice) external onlyOwner {
        tokenPrice = _newPrice;

        emit PriceUpdated(_newPrice);
    }

    function changePrice(uint256 _minAmount, uint256 _maxAmount) external onlyOwner {
        minAmount = _minAmount;
        maxAmount = _maxAmount;
    }
}
