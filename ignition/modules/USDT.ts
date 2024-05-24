import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const UsdtTokenModule = buildModule("UsdtTokenModule", (m) => {
    const initialSupply = m.getParameter("initialSupply");

    const usdt = m.contract("BEP20USDT", [initialSupply]);

    return { usdt };
});

export default UsdtTokenModule;
