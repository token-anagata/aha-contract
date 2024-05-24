import { expect } from "chai";
//import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ignition, viem } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import ContributeModule from "../ignition/modules/Contribute";
import TokenModule from "../ignition/modules/Token";

const DECIMAL = BigInt(1_000_000_000_000_000_000);
const REAL_DECIMAL = 10 ** 18
const STATUS = {
    FREZE_FUNDING: 0,
    ON_FUNDING: 1,
    FULFILLED: 2,
    NOT_FULFILLED: 3,
    FINISHED: 4
}

describe("ContributeContract", function () {
    async function deployContributeFixture() {
        const [owner, addr1] = await viem.getWalletClients()

        const { token } = await ignition.deploy(TokenModule, {
            defaultSender: owner.account.address
        });

        const { contribute } = await ignition.deploy(ContributeModule, {
            defaultSender: owner.account.address,
            parameters: {
                ContributeModule: {
                    token: token.address
                }
            }
        });

        return { token, contribute, owner, addr1 }
    }

    it("should allow owner to create a project", async function () {
        const projectId = 1n;
        const duration = 100n;
        const rewardRate = BigInt(2 * REAL_DECIMAL);
        const minContribute = BigInt(0);
        const maxContribute = BigInt(2000) * DECIMAL;

        const { contribute, owner } = await loadFixture(deployContributeFixture);
        const hash = await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
            account: owner.account
        })
        const logs = await contribute.getEvents.ProjectCreated()

        expect(hash).to.be.a('string')
        expect(logs[0].eventName).equal('ProjectCreated')
    });

    it("should disallow another owner to create a project", async function () {
        const projectId = 2n;
        const duration = 100n;
        const rewardRate = BigInt(5 * REAL_DECIMAL);
        const minContribute = BigInt(0);
        const maxContribute = BigInt(2000) * DECIMAL;

        const { contribute, addr1 } = await loadFixture(deployContributeFixture);

        expect(contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
            account: addr1.account
        })).to.be.revertedWith("Only contract owner can call this function");

    })


    it("should allow owner to change project status", async function () {
        const projectId = 1n;
        const duration = 100n;
        const rewardRate = BigInt(2 * REAL_DECIMAL);
        const minContribute = BigInt(0);
        const maxContribute = BigInt(2000) * DECIMAL;

        const { contribute, owner } = await loadFixture(deployContributeFixture);
        await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.FREZE_FUNDING], {
            account: owner.account
        })

        const hash = await contribute.write.changeStatus([projectId, STATUS.ON_FUNDING], {
            account: owner.account
        })
        const logs = await contribute.getEvents.ProjectUpdated()

        expect(contribute.write.changeStatus([projectId, STATUS.ON_FUNDING], {
            account: owner.account
        })).to.be.revertedWith("Project status is already ID")

        expect(hash).to.be.a('string')
        expect(logs[0].eventName).equal('ProjectUpdated')
    });

    it("should revert if user contributes below the minimum contribute amount", async function () {
        const projectId = 1n;
        const duration = 30n;
        const rewardRate = BigInt(14 * REAL_DECIMAL);
        const minContribute = BigInt(1000) * DECIMAL;
        const maxContribute = BigInt(2000) * DECIMAL;
        const minAmount = BigInt(500) * DECIMAL;
        const maxAmount = BigInt(5000) * DECIMAL;

        const { contribute, token, owner, addr1 } = await loadFixture(deployContributeFixture);

        await token.write.transfer([addr1.account.address, maxAmount]) // transfer token to user
        await token.write.approve([contribute.address, maxAmount], {
            account: addr1.account
        }) // allowance use token 
        await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
            account: owner.account
        })

        expect(contribute.write.queuesUp([projectId, minAmount], {
            account: addr1.account
        })).to.be.revertedWith("Amount is below minimum contribute");

    });

    it("should allow user to contribute tokens", async function () {
        const projectId = 1n;
        const duration = 30n;
        const rewardRate = BigInt(14 * REAL_DECIMAL);
        const minContribute = BigInt(0);
        const maxContribute = BigInt(2000);
        const amount = BigInt(1000);

        const { contribute, token, owner, addr1 } = await loadFixture(deployContributeFixture);

        await token.write.transfer([addr1.account.address, amount]) // transfer token to user
        await token.write.approve([contribute.address, amount], {
            account: addr1.account
        }) // allowance use token 
        await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute], {
            account: owner.account
        })

        const hash = await contribute.write.contribute([projectId, amount], {
            account: addr1.account
        })
        const logs = await contribute.getEvents.Contributed()

        expect(hash).to.be.a('string')
        expect(logs[0].eventName).equal('Contributed')
    });

    it("should revert user to uncontribute tokens when duration still running", async function () {
        const projectId = 1n;
        const duration = 100n;
        const rewardRate = BigInt(2 * REAL_DECIMAL);
        const minContribute = BigInt(0);
        const maxContribute = BigInt(2000) * DECIMAL;
        const amount = BigInt(1000) * DECIMAL;

        const { contribute, token, owner, addr1 } = await loadFixture(deployContributeFixture);

        await token.write.transfer([addr1.account.address, amount]) // transfer token to user
        await token.write.approve([contribute.address, amount], {
            account: addr1.account
        }) // allowance use token 
        await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute], {
            account: owner.account
        })
        await contribute.write.contribute([projectId, amount], {
            account: addr1.account
        })

        expect(contribute.write.uncontribute([projectId], {
            account: addr1.account
        })).to.be.revertedWith("Duration not passed");
    });


    it("should remaining days & calculate reward correctly", async function () {
        const projectId = 1n;
        const duration = 30n;
        const rewardRate = BigInt(15 * REAL_DECIMAL);
        const minContribute = BigInt(0);
        const maxContribute = BigInt(2000) * DECIMAL;
        const amount = BigInt(1000) * DECIMAL;

        const { contribute, token, owner, addr1 } = await loadFixture(deployContributeFixture);

        await token.write.transfer([addr1.account.address, amount]) // transfer token to user
        await token.write.approve([contribute.address, amount], {
            account: addr1.account
        }) // allowance use token 
        await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute], {
            account: owner.account
        })
        await contribute.write.contribute([projectId, amount], {
            account: addr1.account
        }) // contribute token
        const remainingDay = await contribute.read.getRemainingDuration([addr1.account.address, projectId]);
        const reward = await contribute.read.getCurrentReward([addr1.account.address, projectId]);

        // Write assertions to check if the reward is calculated correctly
        expect(remainingDay).to.equal(30n);
        expect(reward).to.equal(0);
    });

    it("should success user to uncontribute tokens", async function () {
        const projectId = 1n;
        const duration = 0n;
        const rewardRate = BigInt(4.5 * REAL_DECIMAL);
        const minContribute = BigInt(0);
        const maxContribute = BigInt(2000) * DECIMAL;
        const amount = BigInt(1000) * DECIMAL;
        const rewardDeposit = BigInt(100000) * DECIMAL;

        const { contribute, token, owner, addr1 } = await loadFixture(deployContributeFixture);

        await token.write.transfer([addr1.account.address, amount]) // transfer token to user
        await token.write.approve([contribute.address, amount], {
            account: addr1.account
        }) // allowance use token 

        await token.write.transfer([contribute.address, rewardDeposit]) // transfer token to user
        await token.write.approve([contribute.address, rewardDeposit], {
            account: owner.account
        }) // allowance use token 

        await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute], {
            account: owner.account
        })
        await contribute.write.contribute([projectId, amount], {
            account: addr1.account
        }) // contribute token

        const hash = await contribute.write.uncontribute([projectId], {
            account: addr1.account,
        })

        const logs = await contribute.getEvents.Uncontributed()

        expect(hash).to.be.a('string')
        expect(logs[0].eventName).equal('Uncontributed')
        expect(await token.read.balanceOf([addr1.account.address])).equal((amount + (BigInt(1000 * 0.045) * DECIMAL)).toString())

    });

    it("should return an empty array if the user has not contributed tokens for any project", async function () {
        const { contribute, owner, addr1 } = await loadFixture(deployContributeFixture);

        const hash = await contribute.read.getUserContributedProjects([addr1.account.address], {
            account: owner.account
        })

        expect(hash).to.be.a('array')
        expect(hash).to.be.an("array").that.is.empty

    })

    it("should return an array of project IDs for which the user has contributed tokens", async function () {
        const projectId = 1n;
        const duration = 1n;
        const rewardRate = BigInt(15);
        const minContribute = BigInt(0);
        const maxContribute = BigInt(2000) * DECIMAL;
        const transferAmount = BigInt(1500) * DECIMAL;
        const amount1 = BigInt(1000) * DECIMAL;
        const amount2 = BigInt(500) * DECIMAL;

        const { contribute, token, owner, addr1 } = await loadFixture(deployContributeFixture);

        await token.write.transfer([addr1.account.address, transferAmount]) // transfer token to user
        await token.write.approve([contribute.address, transferAmount], {
            account: addr1.account
        }) // allowance use token 

        await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute], {
            account: owner.account
        })
        await contribute.write.createProject([projectId + 1n, duration, rewardRate, minContribute, maxContribute], {
            account: owner.account
        })
        // multiple contribute
        await contribute.write.contribute([projectId, amount1], {
            account: addr1.account
        })
        await contribute.write.contribute([projectId + 1n, amount2], {
            account: addr1.account
        })

        const hash = await contribute.read.getUserContributedProjects([addr1.account.address], {
            account: owner.account
        })

        expect(hash).to.be.an("array").that.is.not.empty
        expect(hash).to.contain.oneOf([1n, 2n])
    });

});
