// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract BEP20USDT is ERC20, ERC20Permit {
    constructor(uint256 _initialSupply) ERC20("Tether USD Testnet", "tUSDT") ERC20Permit("Tether USD Testnet") {
        _mint(msg.sender, _initialSupply * 10 ** decimals());
    }
}