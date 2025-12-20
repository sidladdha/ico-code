const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Deploying Asset-Backed Token Trading Platform...");
  
  const [deployer, admin, owner, user1, user2, user3] = await hre.ethers.getSigners();
  
  console.log("Deploying with account:", deployer.address);
  console.log("Admin:", admin.address);
  console.log("Owner:", owner.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);
  console.log("User3:", user3.address);
  
  // Deploy AssetBackedToken
  console.log("\n1. Deploying AssetBackedToken...");
  const AssetBackedToken = await hre.ethers.getContractFactory("AssetBackedToken");
  const token = await AssetBackedToken.deploy(
    "Asset Backed Token",
    "ABT",
    admin.address,
    owner.address,
    user1.address,
    user2.address,
    user3.address
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("AssetBackedToken deployed to:", tokenAddress);
  
  // Deploy OrderBook
  console.log("\n2. Deploying OrderBook...");
  const OrderBook = await hre.ethers.getContractFactory("OrderBook");
  const orderBook = await OrderBook.deploy(tokenAddress);
  await orderBook.waitForDeployment();
  const orderBookAddress = await orderBook.getAddress();
  console.log("OrderBook deployed to:", orderBookAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contracts: {
      AssetBackedToken: tokenAddress,
      OrderBook: orderBookAddress
    },
    accounts: {
      deployer: deployer.address,
      admin: admin.address,
      owner: owner.address,
      user1: user1.address,
      user2: user2.address,
      user3: user3.address
    },
    timestamp: new Date().toISOString()
  };
  
  const deploymentsDir = "../deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  fs.writeFileSync(
    `${deploymentsDir}/${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n✅ Deployment complete!");
  console.log("\nDeployment info saved to:", `${deploymentsDir}/${hre.network.name}.json`);
  
  // Save ABIs
  const tokenArtifact = await hre.artifacts.readArtifact("AssetBackedToken");
  const orderBookArtifact = await hre.artifacts.readArtifact("OrderBook");
  
  const abisDir = "../abis";
  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir);
  }
  
  fs.writeFileSync(
    `${abisDir}/AssetBackedToken.json`,
    JSON.stringify(tokenArtifact.abi, null, 2)
  );
  fs.writeFileSync(
    `${abisDir}/OrderBook.json`,
    JSON.stringify(orderBookArtifact.abi, null, 2)
  );
  
  console.log("\nABIs saved to:", abisDir);
  
  console.log("\n📝 Next steps:");
  console.log("1. Update .env files in admin-service and trading-service with contract addresses");
  console.log("2. Update frontend .env with contract addresses");
  console.log("3. Test token issuance flow");
  console.log("4. Test trading flow");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });