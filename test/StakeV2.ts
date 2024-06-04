import { expect } from "chai";
//import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ignition, viem } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import TokenModule from "../ignition/modules/Token";
import StakeV2Module from "../ignition/modules/StakeV2";
import { MaxInt256 } from "ethers";

const AHA_SUPPLY = BigInt(700_000_000)
const DECIMAL = BigInt(1_000_000_000_000_000_000);
const REAL_DECIMAL = 10 ** 18

describe("StakingContract", function () {
    async function deployStakeFixture() {
        const [owner, addr1] = await viem.getWalletClients()

        const { token } = await ignition.deploy(TokenModule, {
            defaultSender: owner.account.address,
            parameters: {
                TokenModule: {
                    initialSupply: AHA_SUPPLY
                }
            }
        });

        const { stake } = await ignition.deploy(StakeV2Module, {
            defaultSender: owner.account.address,
            parameters: {
                StakeV2Module: {
                    token: token.address
                }
            }
        });

        return { token, stake, owner, addr1 }
    }

    describe("Owner functions", function () {
        it("should update APR correctly", async function () {
            const { stake, owner } = await loadFixture(deployStakeFixture);
            const newAPR = [
                [BigInt(1000000000000000), BigInt(2000000000000000), BigInt(3000000000000000), BigInt(4000000000000000), BigInt(5000000000000000), BigInt(6000000000000000)],
                [BigInt(7000000000000000), BigInt(8000000000000000), BigInt(9000000000000000), BigInt(10000000000000000), BigInt(11000000000000000), BigInt(12000000000000000)],
                [BigInt(13000000000000000), BigInt(14000000000000000), BigInt(15000000000000000), BigInt(16000000000000000), BigInt(17000000000000000), BigInt(18000000000000000)],
                [BigInt(19000000000000000), BigInt(20000000000000000), BigInt(21000000000000000), BigInt(22000000000000000), BigInt(23000000000000000), BigInt(24000000000000000)],
                [BigInt(25000000000000000), BigInt(26000000000000000), BigInt(27000000000000000), BigInt(28000000000000000), BigInt(29000000000000000), BigInt(30000000000000000)],
                [BigInt(31000000000000000), BigInt(32000000000000000), BigInt(33000000000000000), BigInt(34000000000000000), BigInt(35000000000000000), BigInt(36000000000000000)]
            ]
            const hash = await stake.write.updateAPR([newAPR], {
                account: owner.account
            })

            const logs = await stake.getEvents.UpdateStakeAPR()

            expect(hash).to.be.a('string')
            expect(logs[0].eventName).equal('UpdateStakeAPR')

            // for (let i = 0; i < 6; i++) {
            //     for (let j = 0; j < 6; j++) {
            //         const apr = await stake.read.APR([BigInt(i), BigInt(j)]);
            //         expect(apr).to.equal(newAPR[i][j]);
            //     }
            // }
        });

        it("should update min and max amounts correctly", async function () {
            const { stake, owner } = await loadFixture(deployStakeFixture);

            const newMinAmounts = [
                BigInt("30000") * DECIMAL,
                BigInt("35000") * DECIMAL,
                BigInt("60000") * DECIMAL,
                BigInt("150000") * DECIMAL,
                BigInt("300000") * DECIMAL,
                BigInt("600000") * DECIMAL
            ];

            const newMaxAmounts = [
                BigInt("35000") * DECIMAL,
                BigInt("60000") * DECIMAL,
                BigInt("150000") * DECIMAL,
                BigInt("300000") * DECIMAL,
                BigInt("600000") * DECIMAL,
                MaxInt256
            ];

            const hash = await stake.write.updateMinMaxAmounts([newMinAmounts, newMaxAmounts], {
                account: owner.account
            })

            const logs = await stake.getEvents.UpdateStakeRangeAmount()

            expect(hash).to.be.a('string')
            expect(logs[0].eventName).equal('UpdateStakeRangeAmount')

            // for (let i = 0; i < 6; i++) {
            //     const minAmount = await stake.read.minAmount([BigInt(i)]);
            //     const maxAmount = await stake.read.maxAmount([BigInt(i)]);
            //     expect(minAmount).to.equal(newMinAmounts[i]);
            //     expect(maxAmount).to.equal(newMaxAmounts[i]);
            // }
        });

        it("should only allow owner to update APR", async function () {
            const { stake, addr1 } = await loadFixture(deployStakeFixture);

            expect(stake.write.updateAPR([[
                [BigInt(1000000000000000), BigInt(2000000000000000), BigInt(3000000000000000), BigInt(4000000000000000), BigInt(5000000000000000), BigInt(6000000000000000)],
                [BigInt(7000000000000000), BigInt(8000000000000000), BigInt(9000000000000000), BigInt(10000000000000000), BigInt(11000000000000000), BigInt(12000000000000000)],
                [BigInt(13000000000000000), BigInt(14000000000000000), BigInt(15000000000000000), BigInt(16000000000000000), BigInt(17000000000000000), BigInt(18000000000000000)],
                [BigInt(19000000000000000), BigInt(20000000000000000), BigInt(21000000000000000), BigInt(22000000000000000), BigInt(23000000000000000), BigInt(24000000000000000)],
                [BigInt(25000000000000000), BigInt(26000000000000000), BigInt(27000000000000000), BigInt(28000000000000000), BigInt(29000000000000000), BigInt(30000000000000000)],
                [BigInt(31000000000000000), BigInt(32000000000000000), BigInt(33000000000000000), BigInt(34000000000000000), BigInt(35000000000000000), BigInt(36000000000000000)]
            ]], {
                account: addr1.account
            })).to.be.revertedWith("Only contract owner can call this function")

        });

    });

    describe("APR function", function () {
        it("should return correct APR for valid amount and month", async function () {
            const stakeAmount = BigInt(30000) * DECIMAL;
            const stakeMonth = BigInt(3); // 6 months

            const { stake, token, addr1 } = await loadFixture(deployStakeFixture);

            await token.write.approve([stake.address, stakeAmount], {
                account: addr1.account
            })

            const apr = await stake.read.getApr([stakeAmount, stakeMonth], {
                account: addr1.account
            })

            expect(apr).to.equal(BigInt(15000000000000000));
        });

        it("should revert for invalid stake amount", async function () {
            const stakeAmount = BigInt(10000) * DECIMAL; // less than minimum amount
            const stakeMonth = BigInt(3); // 3 months

            const { stake, addr1 } = await loadFixture(deployStakeFixture);

            expect(stake.read.getApr([stakeAmount, stakeMonth], {
                account: addr1.account
            })).to.be.revertedWith("Invalid stake amount");
        });

        it("should revert for invalid stake month", async function () {
            const stakeAmount = BigInt(30000) * DECIMAL;
            const stakeMonth = BigInt(25); // invalid month

            const { stake, addr1 } = await loadFixture(deployStakeFixture);

            expect(stake.read.getApr([stakeAmount, stakeMonth], {
                account: addr1.account
            })).to.be.revertedWith("Invalid stake month");
        });
    });

    describe("Stake Function", function () {

        it("should allow staking with valid amount and duration", async function () {
            const stakeAmount = BigInt("30000") * DECIMAL;
            const stakeDuration = BigInt(6); // 6 months
            
            const { stake, token, owner, addr1 } = await loadFixture(deployStakeFixture);
            await token.write.transfer([addr1.account.address, stakeAmount], {
                account: owner.account
            }) // transfer token to user
            await token.write.approve([stake.address, stakeAmount], {
                account: addr1.account
            })

            const hash = await stake.write.stake([stakeAmount, stakeDuration], {
                account: addr1.account
            })
            const logs = await stake.getEvents.Staked()

            expect(hash).to.be.a('string')
            expect(logs[0].eventName).equal('Staked')
        });

        it("should revert if staking amount is out of range", async function () {
            const stakeAmount = BigInt("10000") * DECIMAL; // less than minimum amount
            const stakeDuration = BigInt(6); // 6 months

            const { stake, token, addr1 } = await loadFixture(deployStakeFixture);

            await token.write.approve([stake.address, stakeAmount], {
                account: addr1.account
            })

            expect(stake.write.stake([stakeAmount, stakeDuration], {
                account: addr1.account
            })).to.be.revertedWith("Amount out of range")

        });

        it("should revert if staking duration is invalid", async function () {
            const stakeAmount = BigInt("30000") * DECIMAL;
            const stakeDuration = BigInt(7); // invalid duration

            const { stake, token, addr1 } = await loadFixture(deployStakeFixture);

            await token.write.approve([stake.address, stakeAmount], {
                account: addr1.account
            })

            expect(stake.write.stake([stakeAmount, stakeDuration], {
                account: addr1.account
            })).to.be.revertedWith("Invalid staking duration")
        });

        it("should revert if staking without approval", async function () {
            const stakeAmount = BigInt("30000") * DECIMAL;
            const stakeDuration = BigInt(2); // 6 months

            const { stake, addr1 } = await loadFixture(deployStakeFixture);

            expect(stake.write.stake([stakeAmount, stakeDuration], {
                account: addr1.account
            })).to.be.revertedWith("ERC20: transfer amount exceeds allowance")

        });

    });

    describe("Unstake Function", function () {

        it("should revert user to unstake tokens when duration still running", async function () {
            const stakeAmount = BigInt("30000") * DECIMAL;
            const stakeDuration = BigInt(6); // 6 months

            const { stake, token, owner, addr1 } = await loadFixture(deployStakeFixture);

            await token.write.transfer([addr1.account.address, stakeAmount], {
                account: owner.account
            }) // transfer token to user
            await token.write.approve([stake.address, stakeAmount], {
                account: addr1.account
            }) // allowance use token 
            
            await stake.write.stake([stakeAmount, stakeDuration], {
                account: addr1.account
            })

            expect(stake.write.unstake([BigInt(0)], {
                account: addr1.account
            })).to.be.revertedWith("Stake period not yet completed");
        });

        it("should revert if user tries to withdraw an invalid stake index", async function () {
            const stakeAmount = BigInt("30000") * DECIMAL;
            const stakeDuration = BigInt(6); // 6 months

            const { stake, token, owner, addr1 } = await loadFixture(deployStakeFixture);

            await token.write.transfer([addr1.account.address, stakeAmount], {
                account: owner.account
            }) // transfer token to user
            await token.write.approve([stake.address, stakeAmount], {
                account: addr1.account
            }) // allowance use token 

            await stake.write.stake([stakeAmount, stakeDuration], {
                account: addr1.account
            })

            expect(stake.write.unstake([BigInt(1)], {
                account: addr1.account
            })).to.be.revertedWith("Invalid stake index");
          });

        it("should success user to unstake tokens", async function () {
            const stakeAmount = BigInt("50000") * DECIMAL;
            const stakeDuration = BigInt(0); // 6 months
            const newStakeMonth = [
                BigInt(1),
                BigInt(3),
                BigInt(6),
                BigInt(0),
                BigInt(18), 
                BigInt(24) 
            ];
            
            const { stake, token, owner, addr1 } = await loadFixture(deployStakeFixture);

            await stake.write.updateStakeMonths([newStakeMonth], {
                account: owner.account
            })

            await token.write.approve([stake.address, stakeAmount * BigInt(2)], {
                account: owner.account
            }) // allowance use token 60 000 000 000 000 000 000 000n

            await token.write.transfer([addr1.account.address, stakeAmount], {
                account: owner.account
            }) // transfer token to user
            await token.write.approve([stake.address, stakeAmount], {
                account: addr1.account
            }) // allowance use token 
            
            await stake.write.stake([stakeAmount, stakeDuration], {
                account: addr1.account
            })

            const hash = await stake.write.unstake([BigInt(0)], {
                account: addr1.account
            })

            const logs = await stake.getEvents.Unstaked()

            const apr = await stake.read.getApr([stakeAmount, stakeDuration], {
                account: addr1.account
            })
            const interest = await stake.read.calculateInterest([BigInt(0)], {
                account: addr1.account
            }) 

            expect(interest).to.equal(stakeAmount * apr / BigInt(10**18));

            expect(hash).to.be.a('string')
            expect(logs[0].eventName).equal('Unstaked')
        });
    })
});
