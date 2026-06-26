import { expect } from "chai";
import { ethers } from "hardhat";

describe("Ballot Contract", function () {
    let ballot: any;
    let chairperson: any;
    let addr1: any;
    let addr2: any;
    let addr3: any;
    let proposalNames: any;

    beforeEach(async function () {
        [chairperson, addr1, addr2, addr3] = await ethers.getSigners();

        proposalNames = [
            ethers.encodeBytes32String("Proposal A"),
            ethers.encodeBytes32String("Proposal B"),
        ];

        const Ballot = await ethers.getContractFactory("Ballot");
        ballot = await Ballot.deploy(proposalNames);
        await ballot.waitForDeployment();

        await ballot.activateVotingForTest();
    });

    it("Should deploy with correct chairperson", async function () {
        expect(await ballot.chairperson()).to.equal(chairperson.address);
    });

    it("Should have correct number of proposals", async function () {
        const count = await ballot.getProposalCount();
        expect(count).to.equal(2);
    });

    it("Should grant voting right to an address", async function () {
        await ballot.giveRightToVote(addr1.address);
        const voter = await ballot.voters(addr1.address);
        expect(voter.weight).to.equal(1);
    });

    it("Should only allow chairperson to grant voting right", async function () {
        await expect(
            ballot.connect(addr1).giveRightToVote(addr2.address)
        ).to.be.revertedWith("Only chairperson can call this");
    });

    it("Should allow voting", async function () {
        await ballot.giveRightToVote(addr1.address);
        await ballot.connect(addr1).vote(0);
        const proposal = await ballot.proposals(0);
        expect(proposal.voteCount).to.equal(1);
    });

    it("Should not allow double voting", async function () {
        await ballot.giveRightToVote(addr1.address);
        await ballot.connect(addr1).vote(0);
        await expect(
            ballot.connect(addr1).vote(1)
        ).to.be.revertedWith("Already voted");
    });

    it("Should not allow voting without right", async function () {
        await expect(
            ballot.connect(addr1).vote(0)
        ).to.be.revertedWith("No voting right");
    });

    it("Should allow delegation", async function () {
        await ballot.giveRightToVote(addr1.address);
        await ballot.giveRightToVote(addr2.address);
        await ballot.connect(addr1).delegate(addr2.address);
        const voter1 = await ballot.voters(addr1.address);
        expect(voter1.voted).to.be.true;
        expect(voter1.delegate).to.equal(addr2.address);
    });

    it("Should not allow self-delegation", async function () {
        await ballot.giveRightToVote(addr1.address);
        await expect(
            ballot.connect(addr1).delegate(addr1.address)
        ).to.be.revertedWith("Cannot delegate to self");
    });

    it("Should detect delegation loop", async function () {
        await ballot.giveRightToVote(addr1.address);
        await ballot.giveRightToVote(addr2.address);
        await ballot.giveRightToVote(addr3.address);

        await ballot.connect(addr1).delegate(addr2.address);
        await ballot.connect(addr2).delegate(addr3.address);
        
        await expect(
            ballot.connect(addr3).delegate(addr1.address)
        ).to.be.revertedWith("Delegation loop detected");
    });

    it("Should correctly calculate winning proposal", async function () {
        await ballot.giveRightToVote(addr1.address);
        await ballot.giveRightToVote(addr2.address);
        await ballot.connect(addr1).vote(1);
        await ballot.connect(addr2).vote(1);
        const winner = await ballot.winningProposal();
        expect(winner).to.equal(1);
    });

    it("Should emit event on vote", async function () {
        await ballot.giveRightToVote(addr1.address);
        await expect(ballot.connect(addr1).vote(0))
            .to.emit(ballot, "VoteCasted")
            .withArgs(addr1.address, 0);
    });

    it("Should emit event on authorization", async function () {
        await expect(ballot.giveRightToVote(addr1.address))
            .to.emit(ballot, "VoterAuthorized")
            .withArgs(addr1.address, 1);
    });
});