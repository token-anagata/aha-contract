import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { ignition, viem } from "hardhat";
import TokenModule from "../ignition/modules/Token";
import UsdtTokenModule from "../ignition/modules/USDT";
import IcoModule from "../ignition/modules/Ico";

const DECIMAL = BigInt(1_000_000_000_000_000_000);
const TOKEN_PRICE = BigInt(15_000_000_000_000_000)
const MIN_AMOUNT = BigInt(1) * DECIMAL
const MAX_AMOUNT = BigInt(500) * DECIMAL
const AHA_SUPPLY = BigInt(700_000_000)
const USDT_SUPPLY = BigInt(30_000_000)

describe("AHA Ico", function () {
    async function deployTokenFixture() {
        const [owner, addr1, addr2] = await viem.getWalletClients()

        const { token } = await ignition.deploy(TokenModule, {
            defaultSender: owner.account.address,
            parameters: {
                TokenModule: {
                    initialSupply: AHA_SUPPLY
                }
            }
        });

        const { usdt } = await ignition.deploy(UsdtTokenModule, {
            defaultSender: addr1.account.address,
            parameters: {
                UsdtTokenModule: {
                    initialSupply: USDT_SUPPLY
                }
            }
        });

        const startTime = Math.floor(Date.now() / 1000) - 1000; 

        console.log(startTime)

        const { ico } = await ignition.deploy(IcoModule, {
            defaultSender: owner.account.address,
            parameters: {
                IcoModule: {
                    tokenSale: token.address,
                    tokenAccepted: usdt.address,
                    tokenPrice: TOKEN_PRICE,
                    minAmount: MIN_AMOUNT,
                    maxAmount: MAX_AMOUNT,
                    startTime: startTime,
                    durationInDays: 60
                }
            }
        });

        return { token, usdt, ico, owner, addr1, addr2 }
    }

    describe("Token", function () {
        it("Should have correct name, symbol, and decimals", async function () {
            const { token, usdt } = await loadFixture(deployTokenFixture);

            expect(await token.read.name()).to.equal("AHA Token");
            expect(await token.read.symbol()).to.equal("tAHA");
            expect(await token.read.decimals()).to.equal(18);
            
            expect(await usdt.read.name()).to.equal("Tether USD Testnet");
            expect(await usdt.read.symbol()).to.equal("tUSDT");
            expect(await usdt.read.decimals()).to.equal(18);
        });

        it("Should have correct initial balance for owner", async function () {
            const { usdt, addr1 } = await loadFixture(deployTokenFixture);

            expect(await usdt.read.balanceOf([addr1.account.address])).to.equal(BigInt(30000000) * DECIMAL);
        });

        it("Should success transfer USDT token ", async function () {
            const { usdt, addr1, addr2 } = await loadFixture(deployTokenFixture);
            const amount = BigInt(20000) * DECIMAL

            const hash = await usdt.write.transfer([addr2.account.address, amount], {
                account: addr1.account
            })

            const logs = await usdt.getEvents.Transfer()
            
            expect(hash).to.be.a('string')
            expect(logs[0].eventName).equal('Transfer')
            expect(await usdt.read.balanceOf([addr2.account.address])).to.equal(amount);
        });
       
    })

    describe("ICO Functional", function () {
        it("Should have can buy token", async function () {
            const { token, usdt, ico, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);
            const balanceForSale = BigInt(2000000) * DECIMAL;
            const balance = BigInt(2000) * DECIMAL;
            const amount = BigInt(8) * DECIMAL;

            // Approve several token for sale 
            await token.write.approve([ico.address, balanceForSale], {
                account: owner.account
            })
            
            await usdt.write.transfer([addr2.account.address, balance], {
                account: addr1.account
            })
            
            await usdt.write.approve([ico.address, amount], {
                account: addr2.account
            })
            const hash = await ico.write.buyTokens([amount], {
                account: addr2.account
            })
            const logs = await ico.getEvents.TokensPurchased()

            expect(hash).to.be.a('string')
            expect(logs[0].eventName).equal('TokensPurchased')
            // 4_600_000_000_000_000_000
            expect(await token.read.balanceOf([addr2.account.address])).to.equal((amount * DECIMAL) / TOKEN_PRICE);
        });
       
        it("Should have cannot buy token", async function () {
            const { token, usdt, ico, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);
            const balanceForSale = BigInt(200000) * DECIMAL;
            const balance = BigInt(2000) * DECIMAL;
            const amount = BigInt(150_000_000_000_000_000);

            // Approve several token for sale 
            await token.write.approve([ico.address, balanceForSale], {
                account: owner.account
            })
            
            await usdt.write.transfer([addr2.account.address, balance], {
                account: addr1.account
            })

            expect(ico.write.buyTokens([amount], {
                account: addr2.account
            })).to.be.revertedWith("Amount is below minimum or above maximum token price")

            expect(ico.write.buyTokens([amount], {
                account: addr2.account
            })).to.be.revertedWith("Allowance not set")

        });
    })
})

