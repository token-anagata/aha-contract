import hre from "hardhat";
import ContractAbi from "../artifacts/contracts/Token.sol/AHAToken.json"
//import ContractAbi from "../artifacts/contracts/Ico.sol/ICOContract.json"

async function main() {
    const icoContractAddress = "0x67d269191c92Caf3cD7723F116c85e6E9bf55933";
    //const usdtContractAddress = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
    const ahaContractAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
    const DECIMAL = BigInt(1_000_000_000_000_000_000);
    const price = BigInt(1_500_000_000_000_000);
    const balanceForSale = BigInt(300000) * DECIMAL;
    //const minimumBuy = BigInt(1) * DECIMAL;
    // Get accounts
    const [owner] = await hre.ethers.getSigners();

    // Get the contract instance
    //const icoContract = await hre.ethers.getContractAt(ContractAbi.abi, icoContractAddress, owner);
    //const usdtContract = await hre.ethers.getContractAt("BEP20USDT", usdtContractAddress);
    const ahaContract = await hre.ethers.getContractAt(ContractAbi.abi, ahaContractAddress, owner);

    //console.log("token balance: ", await ahaContract.balanceOf(owner));

    //const connectOwner = ahaContract.connect(owner);

    // Deposit
    const approve = await ahaContract.approve(icoContractAddress, balanceForSale)
    console.log(approve)
    const allowance = await ahaContract.allowance(owner, icoContractAddress)
    
    console.log(allowance)

    // Change Price
    // const hash = await icoContract.setTokenPrice(price)
    // console.log(`Token allowance: ${hash}`);
    // Change Minimum Buy Token
    // const hash = await icoContract.changeMinimumBuy(DECIMAL)
    // console.log(hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });