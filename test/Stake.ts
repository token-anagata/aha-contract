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
    const minStake = BigInt(0);
    const maxStake = BigInt(2000) * DECIMAL;

    const { stake, owner } = await loadFixture(deployStakeFixture);
    const hash = await stake.write.createPlan([planId, duration, rewardRate, minStake, maxStake], {
      account: owner.account
    })
    const logs = await stake.getEvents.PlanCreated()
    
    expect(hash).to.be.a('string')
    expect(logs[0].eventName).equal('PlanCreated')
  });

  it("should disallow another owner to create a plan", async function () {
    const planId = 2n;
    const duration = 100n;
    const rewardRate = BigInt(5);
    const minStake = BigInt(0);
    const maxStake = BigInt(2000) * DECIMAL;

    const { stake, addr1 } = await loadFixture(deployStakeFixture);
    
    expect(stake.write.createPlan([planId, duration, rewardRate, minStake, maxStake], {
      account: addr1.account
    })).to.be.revertedWith("Only contract owner can call this function");
   
  })


  it("should allow owner to deactivate a plan", async function () {
    const planId = 1n;
    const duration = 100n;
    const rewardRate = BigInt(2);
    const minStake = BigInt(0);
    const maxStake = BigInt(2000) * DECIMAL;

    const { stake, owner } = await loadFixture(deployStakeFixture);
    await stake.write.createPlan([planId, duration, rewardRate, minStake, maxStake], {
      account: owner.account
    })

    const hash = await stake.write.deactivatePlan([planId], {
      account: owner.account
    })
    const logs = await stake.getEvents.PlanDeactivated()

    expect(stake.write.deactivatePlan([planId], {
      account: owner.account
    })).to.be.revertedWith("Plan ID is already inactive")
    
    expect(hash).to.be.a('string')
    expect(logs[0].eventName).equal('PlanDeactivated')
  });


  it("should owner able to activated again a plan", async function () {
    const planId = 1n;
    const duration = 100n;
    const rewardRate = BigInt(2);
    const minStake = BigInt(0);
    const maxStake = BigInt(2000) * DECIMAL;

    const { stake, owner } = await loadFixture(deployStakeFixture);
    await stake.write.createPlan([planId, duration, rewardRate, minStake, maxStake], {
      account: owner.account
    })

    await stake.write.deactivatePlan([planId], {
      account: owner.account
    })

    const hash = await stake.write.activatePlan([planId], {
      account: owner.account
    })

    const logs = await stake.getEvents.PlanActivated()

    expect(stake.write.activatePlan([planId], {
      account: owner.account
    })).to.be.revertedWith("Plan ID is already active")
    
    expect(hash).to.be.a('string')
    expect(logs[0].eventName).equal('PlanActivated')
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

  it("should revert if user stakes below the minimum stake amount", async function () {
    const planId = 1n;
    const duration = 30n;
    const rewardRate = BigInt(14);
    const minStake = BigInt(1000) * DECIMAL;
    const maxStake = BigInt(2000) * DECIMAL;
    const minAmount = BigInt(500) * DECIMAL;
    const maxAmount = BigInt(5000) * DECIMAL;

    const { stake, token, owner, addr1 } = await loadFixture(deployStakeFixture);

    await token.write.transfer([addr1.account.address, maxAmount]) // transfer token to user
    await token.write.approve([stake.address, maxAmount], {
      account: addr1.account
    }) // allowance use token 
    await stake.write.createPlan([planId, duration, rewardRate, minStake, maxStake], {
      account: owner.account
    })
    
    expect(stake.write.stake([planId, minAmount], {
      account: addr1.account
    })).to.be.revertedWith("Amount is below minimum stake");

    expect(stake.write.stake([planId, maxAmount], {
      account: addr1.account
    })).to.be.revertedWith("Amount exceeds maximum stake");
  });

  it("should allow user to stake tokens", async function () {
    const planId = 1n;
    const duration = 30n;
    const rewardRate = BigInt(14);
    const minStake = BigInt(0);
    const maxStake = BigInt(2000);
    const amount = BigInt(1000);

    const { stake, token, owner, addr1 } = await loadFixture(deployStakeFixture);

    await token.write.transfer([addr1.account.address, amount]) // transfer token to user
    await token.write.approve([stake.address, amount], {
      account: addr1.account
    }) // allowance use token 
    await stake.write.createPlan([planId, duration, rewardRate, minStake, maxStake], {
      account: owner.account
    })

    const hash = await stake.write.stake([planId, amount], {
      account: addr1.account
    })
    const logs = await stake.getEvents.Staked()
    
    expect(hash).to.be.a('string')
    expect(logs[0].eventName).equal('Staked')
  });

  it("should revert user to unstake tokens when duration still running", async function () {
    const planId = 1n;
    const duration = 100n;
    const rewardRate = BigInt(2);
    const minStake = BigInt(0);
    const maxStake = BigInt(2000) * DECIMAL;
    const amount = BigInt(1000) * DECIMAL;

    const { stake, token, owner, addr1 } = await loadFixture(deployStakeFixture);

    await token.write.transfer([addr1.account.address, amount]) // transfer token to user
    await token.write.approve([stake.address, amount], {
      account: addr1.account
    }) // allowance use token 
    await stake.write.createPlan([planId, duration, rewardRate, minStake, maxStake], {
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
    const minStake = BigInt(0);
    const maxStake = BigInt(2000) * DECIMAL;
    const amount = BigInt(1000) * DECIMAL;

    const { stake, token, owner, addr1 } = await loadFixture(deployStakeFixture);

    await token.write.transfer([addr1.account.address, amount]) // transfer token to user
    await token.write.approve([stake.address, amount], {
      account: addr1.account
    }) // allowance use token 
    await stake.write.createPlan([planId, duration, rewardRate, minStake, maxStake], {
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

  it("should success user to unstake tokens", async function () {
    const planId = 1n;
    const duration = 0n;
    const rewardRate = BigInt(15);
    const minStake = BigInt(0);
    const maxStake = BigInt(2000) * DECIMAL;
    const amount = BigInt(1000) * DECIMAL;
    const rewardDeposit = BigInt(100000) * DECIMAL;

    const { stake, token, owner, addr1 } = await loadFixture(deployStakeFixture);

    await token.write.transfer([addr1.account.address, amount]) // transfer token to user
    await token.write.approve([stake.address, amount], {
      account: addr1.account
    }) // allowance use token 

    await token.write.transfer([stake.address, rewardDeposit]) // transfer token to user
    await token.write.approve([stake.address, rewardDeposit], {
      account: owner.account
    }) // allowance use token 

    await stake.write.createPlan([planId, duration, rewardRate, minStake, maxStake], {
      account: owner.account
    }) 
    await stake.write.stake([planId, amount], {
      account: addr1.account
    }) // stake token

    const hash = await stake.write.unstake([planId], {
      account: addr1.account,
    })
    
    const logs = await stake.getEvents.Unstaked()

    expect(hash).to.be.a('string')
    expect(logs[0].eventName).equal('Unstaked')
    expect(await token.read.balanceOf([addr1.account.address])).equal((amount + (BigInt(1000 * 0.15) * DECIMAL)).toString())

  });

  it("should return an empty array if the user has not staked tokens for any plan", async function () {
    const { stake, owner, addr1 } = await loadFixture(deployStakeFixture);

    const hash = await stake.read.getUserStakedPlans([addr1.account.address], {
      account: owner.account
    }) 

    expect(hash).to.be.a('array')
    expect(hash).to.be.an( "array" ).that.is.empty
  
  })

  it("should return an array of plan IDs for which the user has staked tokens", async function () {
    const planId = 1n;
    const duration = 1n;
    const rewardRate = BigInt(15);
    const minStake = BigInt(0);
    const maxStake = BigInt(2000) * DECIMAL;
    const transferAmount = BigInt(1500) * DECIMAL;
    const amount1 = BigInt(1000) * DECIMAL;
    const amount2 = BigInt(500) * DECIMAL;
  
    const { stake, token, owner, addr1 } = await loadFixture(deployStakeFixture);

    await token.write.transfer([addr1.account.address, transferAmount]) // transfer token to user
    await token.write.approve([stake.address, transferAmount], {
      account: addr1.account
    }) // allowance use token 

    await stake.write.createPlan([planId, duration, rewardRate, minStake, maxStake], {
      account: owner.account
    }) 
    await stake.write.createPlan([planId + 1n, duration, rewardRate, minStake, maxStake], {
      account: owner.account
    }) 
    // multiple stake
    await stake.write.stake([planId, amount1], {
      account: addr1.account
    }) 
    await stake.write.stake([planId + 1n, amount2], {
      account: addr1.account
    }) 

    const hash = await stake.read.getUserStakedPlans([addr1.account.address], {
      account: owner.account
    }) 

    expect(hash).to.be.an( "array" ).that.is.not.empty
    expect(hash).to.contain.oneOf([1n, 2n])
  });

});
