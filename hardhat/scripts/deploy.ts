import { ethers } from "hardhat";

async function main() {
    const proposalNames = [
        ethers.encodeBytes32String("Proposal A"),
        ethers.encodeBytes32String("Proposal B"),
        ethers.encodeBytes32String("Proposal C"),
    ];

    console.log("Deploying Ballot contract...");

    const Ballot = await ethers.getContractFactory("Ballot");
    const ballot = await Ballot.deploy(proposalNames);

    await ballot.waitForDeployment();

    const address = await ballot.getAddress();
    console.log(`Ballot deployed to: ${address}`);

    const now = Math.floor(Date.now() / 1000);
    const startTime = now + 60;
    const endTime = now + 600;

    console.log(`Setting voting time: start=${startTime}, end=${endTime}`);
    const tx = await ballot.setVotingTime(startTime, endTime);
    await tx.wait();

    console.log("Voting time set successfully!");
    console.log("\n========== Deployment Info ==========");
    console.log(`Contract Address: ${address}`);
    console.log(`Chairperson: ${await ballot.chairperson()}`);
    console.log(`Voting Start: ${new Date(startTime * 1000).toLocaleString()}`);
    console.log(`Voting End: ${new Date(endTime * 1000).toLocaleString()}`);
    console.log("=====================================\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});