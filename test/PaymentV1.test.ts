import { PaymentV1, PaymentV1__factory } from "../typechain";

import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

chai.use(solidity);
const { expect, assert } = chai;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DAY_TIMESTAMP = 60*60*24;

describe("PaymentV1", function () {
  let Payment: PaymentV1__factory;
  let payment: PaymentV1;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  this.beforeEach(async () => {
    Payment = await ethers.getContractFactory("PaymentV1");
    payment = await Payment.deploy();
    [owner, addr1, addr2] = await ethers.getSigners();
  });
  describe("Deploy", async function () {
    it("Should deploy payable contract", async function () {
      await owner.sendTransaction({
        to: payment.address,
        value: ethers.utils.parseEther("0.001"),
      });
      expect(await ethers.provider.getBalance(payment.address)).to.be.equal(ethers.utils.parseEther("0.001"));
    });
  });

  describe("Should create plan", async function () {
    it("Should sucessfully create plan", async function () {
      const planValue = ethers.utils.parseEther("0.001");
      await payment.connect(addr1).createPlan(planValue, "Subscription test", DAY_TIMESTAMP*7);

      let plan = await payment.plans(0);
      expect(plan.amount).to.be.equal(planValue);

      const planValue2 = ethers.utils.parseEther("0.005");
      
      await payment.connect(addr2).createPlan(planValue2, "Subscription test 2", DAY_TIMESTAMP*3);
      plan = await payment.plans(1);
      expect(plan.amount).to.be.equal(planValue2);
    });

    it("Should not create plan", async function () {
      await expect(
        payment.connect(addr1).createPlan(100, "Subscription test", 0)
      ).to.be.revertedWith("frequency needs to be > 0");
      await expect(
        payment.connect(addr1).createPlan(0, "Subscription test", 100)
      ).to.be.revertedWith("amount needs to be > 0");
    });
  });

  describe("Should subscribe", async function () {
    it("Should sucessfully subscribe to a plan", async function () {
      const planValue = ethers.utils.parseEther("0.001");
      const totalValue = ethers.utils.parseEther("0.003");
      await payment.connect(addr1).createPlan(planValue, "Subscription test", 7*DAY_TIMESTAMP);
      const balance = await ethers.provider.getBalance(addr2.address);
      const cicles = 3;
      await payment.connect(addr2).subscribe(0, cicles, {value: totalValue});
      const subscription = await payment.subscriptions(addr2.address, 0);
      expect(subscription.subscriber).to.be.equal(addr2.address);
      assert(await ethers.provider.getBalance(addr2.address) <= balance.sub( totalValue));
    });

    it("Should fail if plan doesnt exists", async function (){
      await expect(
        payment.connect(addr1).subscribe(3, 3)
      ).to.be.revertedWith("id not in range");
    });

    it("Should fail if value sent is less then plan needs", async function (){
      const planValue = ethers.utils.parseEther("0.001");
      const totalValue = ethers.utils.parseEther("0.002");
      const cicles = 3;

      await payment.connect(addr1).createPlan(planValue, "Subscription test", 7*DAY_TIMESTAMP);
      await expect(
       payment.connect(addr2).subscribe(0, cicles, {value: totalValue})
      ).to.be.revertedWith("value must be equal subscription time");
    });
  });
  describe("Should cancel", async function () {
    it("Should sucessfully cancel a plan without payment left", async function () {
      const planValue = ethers.utils.parseEther("0.001");
      const totalValue = ethers.utils.parseEther("0.003");
      const cicles = 3;

      await payment.connect(addr1).createPlan(planValue, "Subscription test", 7*DAY_TIMESTAMP);
      const balanceInitial = await ethers.provider.getBalance(addr2.address);
      let tx = await payment.connect(addr2).subscribe(0, cicles, {value: totalValue});
      let receipt = await tx.wait();
      let fee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      const balanceMiddle = await ethers.provider.getBalance(addr2.address);

      tx = await payment.connect(addr2).cancel(0);
      receipt = await tx.wait();
      fee = receipt.gasUsed.mul(receipt.effectiveGasPrice).add(fee);
      const balanceFinal = await ethers.provider.getBalance(addr2.address);

      expect(balanceFinal).to.be.equal(balanceInitial.sub(fee));
    });

    it("Should sucessfully cancel a plan paying 1 cicle", async function () {
      const planValue = ethers.utils.parseEther("0.001");
      const totalValue = ethers.utils.parseEther("0.003");
      const cicles = 3;

      await payment.connect(addr1).createPlan(planValue, "Subscription test", 7*DAY_TIMESTAMP);
      const balanceInitial = await ethers.provider.getBalance(addr2.address);
      let tx = await payment.connect(addr2).subscribe(0, cicles, {value: totalValue});
      let receipt = await tx.wait();
      let fee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      await ethers.provider.send('evm_increaseTime', [8*DAY_TIMESTAMP]);
      tx = await payment.connect(addr2).cancel(0); 
      receipt = await tx.wait();
      fee = receipt.gasUsed.mul(receipt.effectiveGasPrice).add(fee);
      const balanceFinal = await ethers.provider.getBalance(addr2.address);

      expect(balanceFinal).to.be.equal(balanceInitial.sub(fee).sub(planValue));
    });

    it("Should sucessfully cancel a plan paying 3 cicles", async function () {
      const planValue = ethers.utils.parseEther("0.001");
      const totalValue = ethers.utils.parseEther("0.003");
      const cicles = 3;

      await payment.connect(addr1).createPlan(planValue, "Subscription test", 7*DAY_TIMESTAMP);
      const balanceInitial = await ethers.provider.getBalance(addr2.address);
      let tx = await payment.connect(addr2).subscribe(0, cicles, {value: totalValue});
      let receipt = await tx.wait();
      let fee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      await ethers.provider.send('evm_increaseTime', [90*DAY_TIMESTAMP]);
      tx = await payment.connect(addr2).cancel(0); 
      receipt = await tx.wait();
      fee = receipt.gasUsed.mul(receipt.effectiveGasPrice).add(fee);
      const balanceFinal = await ethers.provider.getBalance(addr2.address);

      expect(balanceFinal).to.be.equal(balanceInitial.sub(fee).sub(totalValue));
    });
  });
  
  /*
  describe("Should pay", async function () {
    it("Should pay the merchant", async function () {
      await payment.connect(addr1).createPlan(mockToken.address, 100, "Subscription test");
      await payment.connect(addr2).subscribe(0);
      const balanceMerchant = await mockToken.balanceOf(addr1.address); 
      const balanceSubscriber = await mockToken.balanceOf(addr2.address); 
      
      await ethers.provider.send('evm_increaseTime', [24 * 60 * 60]);
      await payment.pay(addr2.address, 0);
      expect(balanceMerchant.toString()).to.be.equal('200');
      expect(balanceSubscriber.toString()).to.be.equal('800');
    });
  });
  */
});
