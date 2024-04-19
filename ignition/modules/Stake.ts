import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const StakeModule = buildModule("StakeModule", (m) => {
  const token = m.getParameter("token");

  const stake = m.contract("StakingContract", [token]);

  return { stake };
});

export default StakeModule;
