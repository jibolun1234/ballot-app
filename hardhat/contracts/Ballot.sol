// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Ballot {
    struct Voter {
        uint256 weight;
        bool voted;
        address delegate;
        uint256 vote;
    }

    struct Proposal {
        bytes32 name;
        uint256 voteCount;
    }

    address public chairperson;
    mapping(address => Voter) public voters;
    Proposal[] public proposals;

    uint256 public votingStartTime;
    uint256 public votingEndTime;
    bool public votingTimeSet;

    event VoterAuthorized(address indexed voter, uint256 weight);
    event VoteCasted(address indexed voter, uint256 proposalIndex);
    event DelegateVoted(address indexed from, address indexed to);
    event VotingTimeSet(uint256 startTime, uint256 endTime);

    modifier onlyChairperson() {
        require(msg.sender == chairperson, "Only chairperson can call this");
        _;
    }

    modifier onlyDuringVoting() {
        require(
            votingTimeSet && block.timestamp >= votingStartTime && block.timestamp <= votingEndTime,
            "Voting is not active"
        );
        _;
    }

    constructor(bytes32[] memory proposalNames) {
        chairperson = msg.sender;
        voters[chairperson].weight = 1;

        for (uint256 i = 0; i < proposalNames.length; i++) {
            proposals.push(Proposal({
                name: proposalNames[i],
                voteCount: 0
            }));
        }
    }

    function setVotingTime(uint256 startTime, uint256 endTime) external onlyChairperson {
        require(startTime < endTime, "Start time must be before end time");
        require(block.timestamp < startTime, "Start time must be in future");
        votingStartTime = startTime;
        votingEndTime = endTime;
        votingTimeSet = true;
        emit VotingTimeSet(startTime, endTime);
    }

    function giveRightToVote(address voter) external onlyChairperson {
        require(!voters[voter].voted, "Already voted");
        require(voters[voter].weight == 0, "Already has voting right");
        voters[voter].weight = 1;
        emit VoterAuthorized(voter, 1);
    }

    function vote(uint256 proposalIndex) external onlyDuringVoting {
        Voter storage sender = voters[msg.sender];
        require(sender.weight > 0, "No voting right");
        require(!sender.voted, "Already voted");
        require(proposalIndex < proposals.length, "Invalid proposal");

        sender.voted = true;
        sender.vote = proposalIndex;
        proposals[proposalIndex].voteCount += sender.weight;

        emit VoteCasted(msg.sender, proposalIndex);
    }

    function delegate(address to) external onlyDuringVoting {
        Voter storage sender = voters[msg.sender];
        require(sender.weight > 0, "No voting right");
        require(!sender.voted, "Already voted");
        require(to != msg.sender, "Cannot delegate to self");

        address current = to;
        while (current != address(0)) {
            require(current != msg.sender, "Delegation loop detected");
            if (voters[current].delegate == address(0)) {
                break;
            }
            current = voters[current].delegate;
        }

        if (voters[to].weight > 0 && !voters[to].voted) {
            voters[to].weight += sender.weight;
        } else {
            voters[to].weight += sender.weight;
            if (voters[to].voted) {
                proposals[voters[to].vote].voteCount += sender.weight;
            }
        }

        sender.voted = true;
        sender.delegate = to;
        emit DelegateVoted(msg.sender, to);
    }

    function winningProposal() public view returns (uint256 winningIndex) {
        uint256 winningVoteCount = 0;
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > winningVoteCount) {
                winningVoteCount = proposals[i].voteCount;
                winningIndex = i;
            }
        }
    }

    function winnerName() external view returns (bytes32) {
        return proposals[winningProposal()].name;
    }

    function getProposalCount() external view returns (uint256) {
        return proposals.length;
    }

    function getAllProposals() external view returns (Proposal[] memory) {
        return proposals;
    }

    function isVotingActive() external view returns (bool) {
        if (!votingTimeSet) return false;
        return block.timestamp >= votingStartTime && block.timestamp <= votingEndTime;
    }

    function activateVotingForTest() external onlyChairperson {
        votingTimeSet = true;
        votingStartTime = block.timestamp - 1;
        votingEndTime = block.timestamp + 86400;
    }
}