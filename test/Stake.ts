import { expect } from "chai";
//import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ignition, viem } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import StakeModule from "../ignition/modules/Stake";
import TokenModule from "../ignition/modules/Token";

const DECIMAL = BigInt(1_000_000_000_000_000_000);

describe("StakingContract", function () {
    async function deployStakeFixture() {
        const [owner, addr1] = await viem.getWalletClients()
       
        const { token } = await ignition.deploy(TokenModule, {
          defaultSender: owner.account.address
        });

        const { stake } = await ignition.deploy(StakeModule, {
            defaultSender: owner.account.address,
            parameters: {
                StakeModule: {
                    token: token.address
                }
            }
        });
    
        return { token, stake, owner, addr1 }
    }

  it("should allow owner to create a plan", async function () {
    const planId = 1n;
    const duration = 100n;
    const rewardRate = BigInt(2);

    const { stake, owner } = await loadFixture(deployStakeFixture);
    const hash = await stake.write.createPlan([planId, duration, rewardRate], {
      account: owner.account
    })
    const logs = await stake.getEvents.PlanCreated()
    
    expect(hash).to.be.a('string')
    expect(logs[0].eventName).equal('PlanCreated')
  });

  it("should disallow another owner to create a plan", async function () {
    const planId = 2n;
    const duration = 100n;
    const rewardRate = BigInt(5) * DECIMAL;

    const { stake, addr1 } = await loadFixture(deployStakeFixture);
    
    expect(stake.write.createPlan([planId, duration, rewardRate], {
      account: addr1.account
    })).to.be.revertedWith("Only contract owner can call this function");
   
  });

  it("should owner able transfer token to user", async function () {
    const amount = BigInt(100) * DECIMAL;

    const { token, addr1 } = await loadFixture(deployStakeFixture);

    const hash = await token.write.transfer([addr1.account.address, amount])
    const balance = await token.read.balanceOf([addr1.account.address])
    const logs = await token.getEvents.Transfer()

    expect(hash).to.be.a('string')
    expect(logs[0].eventName).equal('Transfer')
    expect(balance).equal(BigInt(100) * DECIMAL)
  });

  it("should allow user to stake tokens", async function () {
    const planId = 1n;
    const duration = 30n;
    const rewardRate = BigInt(14);
    const amount = BigInt(100) * DECIMAL;

    const { stake, token, owner, addr1 } = await loadFixture(deployStakeFixture);

    await token.write.transfer([addr1.account.address, amount]) // transfer token to user
    await token.write.approve([stake.address, amount], {
      account: addr1.account
    }) // allowance use token 
    await stake.write.createPlan([planId, duration, rewardRate], {
      account: owner.account
    })

    const hash = await stake.write.stake([planId, amount], {
      account: addr1.account
    })
    const logs = await stake.getEvents.Staked()
    
    expect(hash).to.be.a('string')
    expect(logs[0].eventName).equal('Staked')
  });

  it("should disallow user to unstake tokens when duration still running", async function () {
    const planId = 1n;
    const duration = 100n;
    const rewardRate = BigInt(2);
    const amount = BigInt(100) * DECIMAL;

    const { stake, token, owner, addr1 } = await loadFixture(deployStakeFixture);

    await token.write.transfer([addr1.account.address, amount]) // transfer token to user
    await token.write.approve([stake.address, amount], {
      account: addr1.account
    }) // allowance use token 
    await stake.write.createPlan([planId, duration, rewardRate], {
      account: owner.account
    }) 
    await stake.write.stake([planId, amount], {
      account: addr1.account
    })

    expect(stake.write.unstake([planId], {
      account: addr1.account
    })).to.be.revertedWith("Duration not passed");
  });


  it("should remaining days & calculate reward correctly", async function () {
    const planId = 1n;
    const duration = 30n;
    const rewardRate = BigInt(15);
    const amount = BigInt(100) * DECIMAL;

    const { stake, token, owner, addr1 } = await loadFixture(deployStakeFixture);

    await token.write.transfer([addr1.account.address, amount]) // transfer token to user
    await token.write.approve([stake.address, amount], {
      account: addr1.account
    }) // allowance use token 
    await stake.write.createPlan([planId, duration, rewardRate], {
      account: owner.account
    }) 
    await stake.write.stake([planId, amount], {
      account: addr1.account
    }) // stake token
    const remainingDay = await stake.read.getRemainingDuration([addr1.account.address, planId]);
    const reward = await stake.read.getCurrentReward([addr1.account.address, planId]);
    // Write assertions to check if the reward is calculated correctly
    expect(remainingDay).to.equal(30n);
    expect(reward).to.equal(0);
  });

  it("should allow user to unstake tokens", async function () {
    const planId = 1n;
    const duration = 1n;
    const rewardRate = BigInt(1);
    const amount = BigInt(100) * DECIMAL;

    const { stake, token, owner, addr1 } = await loadFixture(deployStakeFixture);

    await token.write.transfer([addr1.account.address, amount]) // transfer token to user
    await token.write.approve([stake.address, amount], {
      account: addr1.account
    }) // allowance use token 

    await stake.write.createPlan([planId, duration, rewardRate], {
      account: owner.account
    }) 
    await stake.write.stake([planId, amount], {
      account: addr1.account
    }) // stake token
    console.log('owner:', owner.account.address, 'stake/token:', stake.address, 'adr1:', addr1.account.address)
    console.log(await token.read.balanceOf([addr1.account.address]), await token.read.balanceOf([stake.address]))
    const hash = await stake.write.unstake([planId], {
      account: addr1.account,
    })
    
    const logs = await stake.getEvents.Unstaked()

    expect(hash).to.be.a('string')
    expect(logs[0].eventName).equal('Unstaked')
  });

});
