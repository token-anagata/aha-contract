import { expect } from "chai";
//import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ignition, viem } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import ContributeModule from "../ignition/modules/Contribute";
import UsdtTokenModule from "../ignition/modules/USDT";
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
const AHA_SUPPLY = BigInt(700_000_000)
const USDT_SUPPLY = BigInt(30_000_000)
const MIN_AHA_TOKEN = BigInt(10_000)

describe("ContributeContract", function () {
    async function deployContributeFixture() {
        const [owner, addr1] = await viem.getWalletClients()

        const { token } = await ignition.deploy(TokenModule, {
            defaultSender: owner.account.address,
            parameters: {
                TokenModule: {
                    initialSupply: AHA_SUPPLY
                }
            }
        });

        const { usdt } = await ignition.deploy(UsdtTokenModule, {
            defaultSender: owner.account.address,
            parameters: {
                UsdtTokenModule: {
                    initialSupply: USDT_SUPPLY
                }
            }
        });

        const { contribute } = await ignition.deploy(ContributeModule, {
            defaultSender: owner.account.address,
            parameters: {
                ContributeModule: {
                    usdt: usdt.address,
                    aha: token.address,
                    min: MIN_AHA_TOKEN
                }
            }
        });

        return { token, usdt, contribute, owner, addr1 }
    }

    describe("Project", function () {

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
            await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
                account: owner.account
            })

            const hash = await contribute.write.changeStatus([projectId, STATUS.FULFILLED], {
                account: owner.account
            })
            const logs = await contribute.getEvents.ProjectUpdated()

            expect(contribute.write.changeStatus([projectId, STATUS.FULFILLED], {
                account: owner.account
            })).to.be.revertedWith("Project status is already ID")

            expect(hash).to.be.a('string')
            expect(logs[0].eventName).equal('ProjectUpdated')
        });

        it("should allow owner to change minimum aha token", async function () {
            const projectId = 1n;
            const duration = 100n;
            const rewardRate = BigInt(2 * REAL_DECIMAL);
            const minContribute = BigInt(0);
            const maxContribute = BigInt(2000) * DECIMAL;

            const { contribute, owner } = await loadFixture(deployContributeFixture);
            await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
                account: owner.account
            })

            const hash = await contribute.write.changeMinimumTokenAccepted([BigInt(15_000)], {
                account: owner.account
            })
            const logs = await contribute.getEvents.TokenAcceptedUpdated()

            expect(hash).to.be.a('string')
            expect(logs[0].eventName).equal('TokenAcceptedUpdated')
        });

    })

    describe("Invest", function () {

        it("should revert if user contributes below the minimum contribute amount", async function () {
            const projectId = 1n;
            const duration = 30n;
            const rewardRate = BigInt(14 * REAL_DECIMAL);
            const minContribute = BigInt(1000) * DECIMAL;
            const maxContribute = BigInt(2000) * DECIMAL;
            const minAmount = BigInt(500) * DECIMAL;
            const maxAmount = BigInt(5000) * DECIMAL;

            const { contribute, usdt, owner, addr1 } = await loadFixture(deployContributeFixture);

            await usdt.write.transfer([addr1.account.address, maxAmount], {
                account: owner.account
            })
            await usdt.write.approve([contribute.address, maxAmount], {
                account: addr1.account
            }) // allowance use usdt 
            await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
                account: owner.account
            })

            expect(contribute.write.queuesUp([projectId, minAmount], {
                account: addr1.account
            })).to.be.revertedWith("Amount is below minimum contribute");

        });

        it("should allow user to contribute usdt", async function () {
            const projectId = 1n;
            const duration = 30n;
            const rewardRate = BigInt(14 * REAL_DECIMAL);
            const minContribute = BigInt(0);
            const maxContribute = BigInt(2000);
            const amount = BigInt(1000);

            const { contribute, token, usdt, owner, addr1 } = await loadFixture(deployContributeFixture);

            await token.write.transfer([addr1.account.address, MIN_AHA_TOKEN], {
                account: owner.account
            }) 

            await usdt.write.transfer([addr1.account.address, amount], {
                account: owner.account
            }) // transfer usdt to user
            await usdt.write.approve([contribute.address, amount], {
                account: addr1.account
            }) // allowance use usdt 
            await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
                account: owner.account
            })

            const hash = await contribute.write.queuesUp([projectId, amount], {
                account: addr1.account
            })
            const logs = await contribute.getEvents.Queue()

            expect(hash).to.be.a('string')
            expect(logs[0].eventName).equal('Queue')
        });

        it("should revert contribute cause not have quite aha token", async function () {
            const projectId = 1n;
            const duration = 100n;
            const rewardRate = BigInt(2 * REAL_DECIMAL);
            const minContribute = BigInt(0);
            const maxContribute = BigInt(2000) * DECIMAL;
            const amount = BigInt(1000) * DECIMAL;

            const { contribute, token, usdt, owner, addr1 } = await loadFixture(deployContributeFixture);

            await token.write.transfer([addr1.account.address, BigInt(100)], {
                account: owner.account
            }) 
            await usdt.write.transfer([addr1.account.address, amount], {
                account: owner.account
            }) // transfer usdt to user
            await usdt.write.approve([contribute.address, amount], {
                account: addr1.account
            }) // allowance use usdt 
            await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
                account: owner.account
            })

            expect(contribute.write.queuesUp([projectId, amount], {
                account: addr1.account
            })).to.be.revertedWith("You dont have quite minimum token accepted");
        });

        it("should revert user to uncontribute usdt when duration still running", async function () {
            const projectId = 1n;
            const duration = 100n;
            const rewardRate = BigInt(2 * REAL_DECIMAL);
            const minContribute = BigInt(0);
            const maxContribute = BigInt(2000) * DECIMAL;
            const amount = BigInt(1000) * DECIMAL;

            const { contribute, token, usdt, owner, addr1 } = await loadFixture(deployContributeFixture);

            await token.write.transfer([addr1.account.address, MIN_AHA_TOKEN], {
                account: owner.account
            }) 
            await usdt.write.transfer([addr1.account.address, amount], {
                account: owner.account
            }) // transfer usdt to user
            await usdt.write.approve([contribute.address, amount], {
                account: addr1.account
            }) // allowance use usdt 
            await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
                account: owner.account
            })
            await contribute.write.queuesUp([projectId, amount], {
                account: addr1.account
            })

            expect(contribute.write.claim([projectId], {
                account: addr1.account
            })).to.be.revertedWith("Duration not passed");
        });

        it("should able allocate all usdt invest", async function () {
            const projectId = 1n;
            const duration = 30n;
            const rewardRate = BigInt(14 * REAL_DECIMAL);
            const minContribute = BigInt(0);
            const maxContribute = BigInt(2000);
            const amount = BigInt(1000);

            const { contribute, token, usdt, owner } = await loadFixture(deployContributeFixture);
            const wallet = await viem.getWalletClients()

            await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
                account: owner.account
            })

            for (let i = 1; i < wallet.length; i++) {
                await token.write.transfer([wallet[i].account.address, MIN_AHA_TOKEN], {
                    account: owner.account
                }) 
                await usdt.write.transfer([wallet[i].account.address, amount], {
                    account: owner.account
                }) // transfer usdt to user
                await usdt.write.approve([contribute.address, amount], {
                    account: wallet[i].account
                }) // allowance use usdt 

                const hash = await contribute.write.queuesUp([projectId, amount], {
                    account: wallet[i].account
                })
                const logs = await contribute.getEvents.Queue()

                expect(hash).to.be.a('string')
                expect(logs[0].eventName).equal('Queue')
            }

            // await contribute.write.changeStatus([projectId, STATUS.FULFILLED], {
            //     account: owner.account
            // })

            const hashAllocate = await contribute.write.allocate([projectId], {
                account: owner.account
            })

            expect(hashAllocate).to.be.a('string')

        });

        it("should remaining days & calculate reward correctly", async function () {
            const projectId = 1n;
            const duration = 30n;
            const rewardRate = BigInt(15 * REAL_DECIMAL);
            const minContribute = BigInt(0);
            const maxContribute = BigInt(2000) * DECIMAL;
            const amount = BigInt(1000) * DECIMAL;

            const { contribute, token, usdt, owner, addr1 } = await loadFixture(deployContributeFixture);

            await token.write.transfer([addr1.account.address, MIN_AHA_TOKEN], {
                account: owner.account
            }) 
            await usdt.write.transfer([addr1.account.address, amount], {
                account: owner.account
            }) // transfer usdt to user
            await usdt.write.approve([contribute.address, amount], {
                account: addr1.account
            }) // allowance use usdt 
            await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
                account: owner.account
            })
            await contribute.write.queuesUp([projectId, amount], {
                account: addr1.account
            }) // contribute usdt
            const remainingDay = await contribute.read.getRemainingDuration([addr1.account.address, projectId]);
            const reward = await contribute.read.getCurrentReward([addr1.account.address, projectId]);

            // Write assertions to check if the reward is calculated correctly
            expect(remainingDay).to.equal(30n);
            expect(reward).to.equal(0);
        });

        it("should success user to uncontribute usdt", async function () {
            const projectId = 1n;
            const duration = 0n;
            const rewardRate = BigInt(4.5 * REAL_DECIMAL);
            const minContribute = BigInt(0);
            const maxContribute = BigInt(2000) * DECIMAL;
            const amount = BigInt(1000) * DECIMAL;
            const rewardDeposit = BigInt(100000) * DECIMAL;

            const { contribute, token, usdt, owner, addr1 } = await loadFixture(deployContributeFixture);

            await token.write.transfer([addr1.account.address, MIN_AHA_TOKEN], {
                account: owner.account
            }) 
            await usdt.write.transfer([addr1.account.address, amount], {
                account: owner.account
            })
            await usdt.write.approve([contribute.address, rewardDeposit], {
                account: owner.account
            }) // allowance use usdt 

            await usdt.write.approve([contribute.address, amount], {
                account: addr1.account
            }) // allowance use usdt 


            await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
                account: owner.account
            })

            await contribute.write.queuesUp([projectId, amount], {
                account: addr1.account
            }) // contribute usdt

            await contribute.write.allocate([projectId], {
                account: owner.account
            })

            const hash = await contribute.write.claim([projectId], {
                account: addr1.account,
            })

            const logs = await contribute.getEvents.Claim()

            expect(hash).to.be.a('string')
            expect(logs[0].eventName).equal('Claim')
            expect(await usdt.read.balanceOf([addr1.account.address])).equal(((amount + (BigInt(1000 * 0.045)) * DECIMAL)).toString())

        });

        it("should not able claim when project status still on sale", async function () {
            const projectId = 1n;
            const duration = 0n;
            const rewardRate = BigInt(4.5 * REAL_DECIMAL);
            const minContribute = BigInt(0);
            const maxContribute = BigInt(2000) * DECIMAL;
            const amount = BigInt(1000) * DECIMAL;
            const rewardDeposit = BigInt(100000) * DECIMAL;

            const { contribute, token, usdt, owner, addr1 } = await loadFixture(deployContributeFixture);

            await token.write.transfer([addr1.account.address, MIN_AHA_TOKEN], {
                account: owner.account
            }) 
            await usdt.write.transfer([addr1.account.address, amount], {
                account: owner.account
            })
            await usdt.write.approve([contribute.address, rewardDeposit], {
                account: owner.account
            }) // allowance use usdt 

            await usdt.write.approve([contribute.address, amount], {
                account: addr1.account
            }) // allowance use usdt 


            await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
                account: owner.account
            })

            await contribute.write.queuesUp([projectId, amount], {
                account: addr1.account
            }) // contribute usdt

            await contribute.write.allocate([projectId], {
                account: owner.account
            })

            await contribute.write.changeStatus([projectId, STATUS.ON_FUNDING], {
                account: owner.account
            })

            expect(contribute.write.claim([projectId], {
                account: addr1.account,
            })).to.be.revertedWith("Invalid status");


        });

        // it("should return an empty array if the user has not contributed usdt for any project", async function () {
        //     const { contribute, owner, addr1 } = await loadFixture(deployContributeFixture);

        //     const hash = await contribute.read.get([addr1.account.address], {
        //         account: owner.account
        //     })

        //     expect(hash).to.be.a('array')
        //     expect(hash).to.be.an("array").that.is.empty

        // })

        // it("should return an array of project IDs for which the user has contributed usdt", async function () {
        //     const projectId = 1n;
        //     const duration = 1n;
        //     const rewardRate = BigInt(15);
        //     const minContribute = BigInt(0);
        //     const maxContribute = BigInt(2000) * DECIMAL;
        //     const transferAmount = BigInt(1500) * DECIMAL;
        //     const amount1 = BigInt(1000) * DECIMAL;
        //     const amount2 = BigInt(500) * DECIMAL;

        //     const { contribute, usdt, owner, addr1 } = await loadFixture(deployContributeFixture);

        //     await usdt.write.transfer([addr1.account.address, transferAmount]) // transfer usdt to user
        //     await usdt.write.approve([contribute.address, transferAmount], {
        //         account: addr1.account
        //     }) // allowance use usdt 

        //     await contribute.write.createProject([projectId, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
        //         account: owner.account
        //     })
        //     await contribute.write.createProject([projectId + 1n, duration, rewardRate, minContribute, maxContribute, STATUS.ON_FUNDING], {
        //         account: owner.account
        //     })
        //     // multiple contribute
        //     await contribute.write.queuesUp([projectId, amount1], {
        //         account: addr1.account
        //     })
        //     await contribute.write.queuesUp([projectId + 1n, amount2], {
        //         account: addr1.account
        //     })

        //     const hash = await contribute.read.getUserContributedProjects([addr1.account.address], {
        //         account: owner.account
        //     })

        //     expect(hash).to.be.an("array").that.is.not.empty
        //     expect(hash).to.contain.oneOf([1n, 2n])
        // });

    })

});