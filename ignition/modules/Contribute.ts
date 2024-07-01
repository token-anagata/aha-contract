import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ContributeModule = buildModule("ContributeModule", (m) => {
  const token = m.getParameter("usdt");
  const tokenAccepeted = m.getParameter("aha");
  const minTokenAccepeted = m.getParameter("min");

  const contribute = m.contract("ContributeContract", [token, tokenAccepeted, minTokenAccepeted]);

  return { contribute };
});

export default ContributeModule;
