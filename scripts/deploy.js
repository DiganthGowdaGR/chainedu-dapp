const hre = require("hardhat");

async function main() {
  const StudyMaterial = await hre.ethers.getContractFactory("StudyMaterial");
  const studyMaterial = await StudyMaterial.deploy();

  await studyMaterial.waitForDeployment();

  const address = await studyMaterial.getAddress();
  console.log("StudyMaterial deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
