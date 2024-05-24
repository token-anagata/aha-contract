// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract AHAToken is ERC20, ERC20Permit {
    constructor(uint256 _initialSupply) ERC20("AHA Token", "tAHA") ERC20Permit("AHA Token") {
        _mint(msg.sender, _initialSupply * 10 ** decimals());
    }
}