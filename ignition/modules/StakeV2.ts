import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const StakeV2Module = buildModule("StakeV2Module", (m) => {
  const token = m.getParameter("token");

  const stake = m.contract("StakeV2Contract", [token]);

  return { stake };
});

export default StakeV2Module;
