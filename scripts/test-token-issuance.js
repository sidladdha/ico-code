const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("\n🧪 Testing Token Issuance Flow...");
  console.log("=" .repeat(50));
  
  // Load deployment
  const deployment = JSON.parse(fs.readFileSync("../deployments/localhost.json"));
  const tokenAddress = deployment.contracts.AssetBackedToken;
  
  const [deployer, admin, owner, user1, user2, user3] = await hre.ethers.getSigners();
  
  console.log("\n💼 Accounts:");
  console.log("  Admin:", admin.address);
  console.log("  Owner:", owner.address);
  console.log("  User1:", user1.address);
  console.log("  User2:", user2.address);
  console.log("  User3:", user3.address);
  
  // Get contract instance
  const Token = await hre.ethers.getContractAt("AssetBackedToken", tokenAddress);
  
  // Step 1: Owner submits asset
  console.log("\n📝 Step 1: Owner submits asset for tokenization...");
  const tx1 = await Token.connect(owner).submitAssetForTokenization(
    10000, // 10,000 tokens
    "ipfs://QmXxx...realworldassetproof"
  );
  await tx1.wait();
  console.log("  ✅ Asset submitted (Batch ID: 1)");
  
  // Step 2: Admin verifies
  console.log("\n✓ Step 2: Admin verifies asset...");
  const tx2 = await Token.connect(admin).verifyAsset(1);
  await tx2.wait();
  console.log("  ✅ Asset verified by admin");
  
  // Step 3: Owner issues tokens
  console.log("\n🪙 Step 3: Owner issues tokens...");
  const tx3 = await Token.connect(owner).issueTokens(1);
  await tx3.wait();
  console.log("  ✅ Tokens issued and distributed");
  
  // Check balances
  console.log("\n💰 Token Balances:");
  const user1Balance = await Token.balanceOf(user1.address);
  const user2Balance = await Token.balanceOf(user2.address);
  const user3Balance = await Token.balanceOf(user3.address);
  const ownerBalance = await Token.balanceOf(owner.address);
  
  console.log(`  User1: ${hre.ethers.formatEther(user1Balance)} TKN (Expected: 1,000 - 10%)`);
  console.log(`  User2: ${hre.ethers.formatEther(user2Balance)} TKN (Expected: 1,800 - 18%)`);
  console.log(`  User3: ${hre.ethers.formatEther(user3Balance)} TKN (Expected: 2,500 - 25%)`);
  console.log(`  Owner: ${hre.ethers.formatEther(ownerBalance)} TKN (Expected: 4,700 - 47%)`);
  
  // Verify percentages
  const total = user1Balance + user2Balance + user3Balance + ownerBalance;
  const user1Pct = (Number(user1Balance) / Number(total)) * 100;
  const user2Pct = (Number(user2Balance) / Number(total)) * 100;
  const user3Pct = (Number(user3Balance) / Number(total)) * 100;
  const ownerPct = (Number(ownerBalance) / Number(total)) * 100;
  
  console.log("\n📋 Distribution Verification:");
  console.log(`  User1: ${user1Pct.toFixed(1)}% ${user1Pct === 10 ? '✅' : '❌'}`);
  console.log(`  User2: ${user2Pct.toFixed(1)}% ${user2Pct === 18 ? '✅' : '❌'}`);
  console.log(`  User3: ${user3Pct.toFixed(1)}% ${user3Pct === 25 ? '✅' : '❌'}`);
  console.log(`  Owner: ${ownerPct.toFixed(1)}% ${ownerPct === 47 ? '✅' : '❌'}`);
  
  console.log("\n" + "=".repeat(50));
  console.log("✅ Token Issuance Flow Test Complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });