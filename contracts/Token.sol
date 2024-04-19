// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract AHAToken is ERC20, ERC20Permit {
    constructor() ERC20("AHA Token", "tAHA") ERC20Permit("AHA Token") {
        _mint(msg.sender, 100000000000* 10 ** decimals());
    }
}