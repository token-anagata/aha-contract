import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MultiDonationModule = buildModule("MultiDonationModule", (m) => {

  const donation = m.contract("MultiTokenDonation");

  return { donation };
});

export default MultiDonationModule;
