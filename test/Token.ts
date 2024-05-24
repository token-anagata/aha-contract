import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { ignition, viem } from "hardhat";
import TokenModule from "../ignition/modules/Token";

const NAME = 'AHA'
const SYMBOL = 'tAHA'
const SUPPLY = BigInt(1_000_000_000_000)
const DECIMAL = BigInt(1_000_000_000_000_000_000);

describe("AHA Token", function () {
  async function deployTokenFixture() {
    const [owner, addr1] = await viem.getWalletClients()

    const { token } = await ignition.deploy(TokenModule, {
      defaultSender: owner.account.address,
      parameters: {
        TokenModule: {
          name: NAME,
          symbol: SYMBOL,
          supply: SUPPLY
        }
      }
    });

    return { token, owner, addr1 }
  }

  describe("Deployment", function () {
    it("Should have correct name, symbol, and decimals", async function () {
      const { token } = await loadFixture(deployTokenFixture);

      expect(await token.read.name()).to.equal(NAME);
      expect(await token.read.symbol()).to.equal(SYMBOL);
    });

    it("Should have correct initial balance for owner", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);

      expect(await token.read.balanceOf([owner.account.address])).to.equal(SUPPLY * DECIMAL);
    });

    it("Should owner able burn a token", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);
      const initialSupply = SUPPLY * DECIMAL
      const burn = BigInt(20000)

      expect(token.write.burn([BigInt(10000)], {
        account: addr1.account
      })).to.be.revertedWith("Only contract owner can call this function")

      await token.write.burn([burn], {
        account: owner.account
      });
      
      expect(await token.read.balanceOf([owner.account.address])).to.equal(initialSupply - burn);
    });

    // it("Should permit transfer from owner to addr1", async function () {
    //   const { token, owner } = await loadFixture(deployTokenFixture);

    //   const deadline = Math.floor(Date.now() / 1000) + 3600; // deadline 1 hour from now
    //   const nonce = await token.read.nonces([owner.account.address]);
    //   const message = ethers.utils.solidityKeccak256(
    //     ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
    //     [ethers.utils._TypedDataEncoder.hashType("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
    //     ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)),
    //     ethers.utils.keccak256(ethers.utils.toUtf8Bytes("1")),
    //     await ethers.provider.getNetwork().then((network) => network.chainId),
    //     MyToken.address,
    //     ethers.utils.solidityKeccak256(["bytes32", "address", "address", "uint256", "uint256"], [
    //       ethers.utils._TypedDataEncoder.hashType("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
    //       owner.address,
    //       addr1.address,
    //       initialSupply,
    //       nonce,
    //       deadline
    //     ])
    //     ]
    //   );
    //   const { v, r, s } = ethers.utils.splitSignature(await owner.signMessage(ethers.utils.arrayify(message)));

    //   await MyToken.permit(owner.address, addr1.address, initialSupply, deadline, v, r, s);
    //   await MyToken.transferFrom(owner.address, addr1.address, initialSupply);

    //   expect(await MyToken.balanceOf(addr1.address)).to.equal(initialSupply);
    // });
  })
})

