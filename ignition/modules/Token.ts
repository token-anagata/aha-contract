import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenModule = buildModule("TokenModule", (m) => {
  const initialSupply = m.getParameter("initialSupply");

  const token = m.contract("AHAToken", [initialSupply]);

  return { token };
});

export default TokenModule;
