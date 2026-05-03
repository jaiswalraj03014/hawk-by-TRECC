import { expect } from "chai";
import { ethers } from "hardhat";

describe("Hawk Strategy Engine", function () {
  async function deployHawkFixture() {
    const [owner, operator, lender] = await ethers.getSigners();

    // Official Sepolia USDC for the vault asset
    const sepoliaUSDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
    
    // We target the "Hawk" artifact specifically here
    const HawkFactory = await ethers.getContractFactory("Hawk");
    const hawk = await HawkFactory.deploy(sepoliaUSDC);

    return { hawk, owner, operator, lender };
  }

  describe("Operator Bond Logic (Junior Tranche)", function () {
    it("Should allow an operator to post an ETH bond", async function () {
      const { hawk, operator } = await deployHawkFixture();
      
      const bondAmount = ethers.parseEther("0.1");
      await hawk.connect(operator).postBond({ value: bondAmount });
      
      const bondBalance = await hawk.operatorBonds(operator.address);
      expect(bondBalance).to.equal(bondAmount);
      console.log("      ✅ Junior Tranche bond posted.");
    });

    it("Should block agent registration if bond is < 0.05 ETH", async function () {
      const { hawk, operator } = await deployHawkFixture();
      const agentAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

      await expect(hawk.connect(operator).registerAgent(agentAddress))
        .to.be.revertedWith("Bond too low to register agent");
      
      console.log("      ✅ Security: Insufficient bond blocked registration.");
    });

    it("Should approve agent once bond threshold is met", async function () {
      const { hawk, operator } = await deployHawkFixture();
      const agentAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

      await hawk.connect(operator).postBond({ value: ethers.parseEther("0.06") });
      await hawk.connect(operator).registerAgent(agentAddress);
      
      expect(await hawk.approvedAgents(agentAddress)).to.equal(true);
      console.log("      ✅ Hawk Agent successfully authorized.");
    });
  });
});