import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { ignition, viem } from "hardhat";
import MultiDonationModule from "../ignition/modules/MultiDonation";
import TokenModule from "../ignition/modules/Token";
import { parseEther } from "ethers";

const AHA_SUPPLY = BigInt(700_000_000)
const DECIMAL = BigInt(1_000_000_000_000_000_000)

describe("Donation", function () {
    async function deployMultiDonationFixture() {
        const [owner, addr1] = await viem.getWalletClients()

        const { token } = await ignition.deploy(TokenModule, {
            defaultSender: owner.account.address,
            parameters: {
                TokenModule: {
                    initialSupply: AHA_SUPPLY
                }
            }
        });

        const { donation } = await ignition.deploy(MultiDonationModule, {
            defaultSender: owner.account.address,
        });

        return { token, donation, owner, addr1 }
    }

    describe("Donate", function () {
        it("Should allow donation and track them correctly by project ID", async function () {
            const { donation, token, owner, addr1 } = await loadFixture(deployMultiDonationFixture);
            const donationAmount = parseEther("100");
            const projectId = BigInt(1);

            await token.write.transfer([addr1.account.address, donationAmount], {
                account: owner.account
            })

            await token.write.approve([donation.address, donationAmount], {
                account: addr1.account,
            })
            const hash = await donation.write.donate([token.address, donationAmount, projectId], {
                account: addr1.account,
            })
            const logs = await donation.getEvents.DonationReceived()

            expect(hash).to.be.a('string')
            expect(logs[0].eventName).equal('DonationReceived')
            // Verify the donation
            expect(await token.read.balanceOf([owner.account.address])).to.equal(AHA_SUPPLY * DECIMAL);
            expect(await donation.read.totalDonations([token.address, projectId])).to.equal(donationAmount);
            expect(await donation.read.donations([token.address, projectId, addr1.account.address])).to.equal(donationAmount);
        });


    })
})

