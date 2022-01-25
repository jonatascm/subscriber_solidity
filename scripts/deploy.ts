import { ethers } from "hardhat";

async function main() {
  const PaymentV1 = await ethers.getContractFactory("PaymentV1");
  const payment = await PaymentV1.deploy();

  await payment.deployed();

  console.log("Payment deployed to:", payment.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
