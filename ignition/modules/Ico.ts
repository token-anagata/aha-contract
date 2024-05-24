import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


const IcoModule = buildModule("IcoModule", (m) => {
  const tokenSale = m.getParameter("tokenSale");
  const tokenAccepted = m.getParameter("tokenAccepted");
  const tokenPrice = m.getParameter("tokenPrice");
  const minAmount = m.getParameter("minAmount");
  const maxAmount = m.getParameter("maxAmount");
  const startTime = m.getParameter("startTime");
  const durationInDays = m.getParameter("durationInDays");

  const ico = m.contract("ICOContract", [tokenSale, tokenAccepted, tokenPrice, minAmount, maxAmount, startTime, durationInDays]);

  return { ico };
});

export default IcoModule;
