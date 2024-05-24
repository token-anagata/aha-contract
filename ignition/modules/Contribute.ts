import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ContributeModule = buildModule("ContributeModule", (m) => {
  const token = m.getParameter("token");

  const contribute = m.contract("ContributeContract", [token]);

  return { contribute };
});

export default ContributeModule;
