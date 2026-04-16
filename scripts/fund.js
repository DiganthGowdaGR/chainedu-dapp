const hre = require("hardhat");

async function main() {
    // Get the default Hardhat wealthy account
    const signers = await hre.ethers.getSigners();
    const sender = signers[0]; 

    const targetAddress = "0x02279a29Aa7eB7c46C55dCA291e002281c6A4612";

    console.log(`Sending 5,000 ETH from ${sender.address} to ${targetAddress}...`);

    const tx = await sender.sendTransaction({
        to: targetAddress,
        value: hre.ethers.parseEther("5000.0")
    });

    await tx.wait();
    console.log("Mission accomplished! Beamed 5,000 ETH successfully.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
