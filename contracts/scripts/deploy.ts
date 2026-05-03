import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log(`🦅 Igniting Hawk deployment on ${network.name}...`);

  // Official Sepolia USDC
  const sepoliaUSDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  const HawkFactory = await ethers.getContractFactory("Hawk");
  const hawk = await HawkFactory.deploy(sepoliaUSDC);

  await hawk.waitForDeployment();
  const contractAddress = await hawk.getAddress();

  console.log(`✅ Hawk deployed successfully at: ${contractAddress}`);

  // Auto-generate deployments folder
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentData = {
    contractName: "Hawk",
    network: network.name,
    chainId: network.config.chainId || 11155111,
    address: contractAddress,
    underlyingAsset: sepoliaUSDC,
    timestamp: new Date().toISOString(),
  };

  const filePath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));

  console.log(`💾 Deployment info saved to deployments/${network.name}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});