// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Interfaces/IERC20.sol";

/**
 * @title Governance Contract
 * @dev Decentralized governance system for protocol parameter management
 * Features: Proposal creation, voting, execution, delegation, time locks
 */
contract Governance {
    // Governance parameters
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant EXECUTION_DELAY = 1 days;
    uint256 public constant PROPOSAL_THRESHOLD = 1000e18; // 1000 tokens to create proposal
    uint256 public constant QUORUM_THRESHOLD = 4; // 4% of total supply
    uint256 public constant BASIS_POINTS = 10000;

    IERC20 public immutable governanceToken;
    address public owner;
    uint256 public proposalCount;
    uint256 public totalDelegatedVotes;

    enum ProposalState {
        Pending,
        Active,
        Defeated,
        Succeeded,
        Queued,
        Executed,
        Cancelled
    }

    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        uint256 startTime;
        uint256 endTime;
        uint256 executionTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        bool cancelled;
        mapping(address => Receipt) receipts;
    }

    struct Receipt {
        bool hasVoted;
        uint8 support; // 0=against, 1=for, 2=abstain
        uint256 votes;
    }

    struct Checkpoint {
        uint256 fromBlock;
        uint256 votes;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(address => address) public delegates;
    mapping(address => Checkpoint[]) public checkpoints;
    mapping(address => uint256) public numCheckpoints;
    mapping(bytes32 => bool) public queuedTransactions;

    // Events
    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        string title,
        string description,
        uint256 startTime,
        uint256 endTime
    );
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support,
        uint256 weight
    );
    event ProposalQueued(uint256 indexed id, uint256 executionTime);
    event ProposalExecuted(uint256 indexed id);
    event ProposalCancelled(uint256 indexed id);
    event DelegateChanged(
        address indexed delegator,
        address indexed fromDelegate,
        address indexed toDelegate
    );
    event DelegateVotesChanged(
        address indexed delegate,
        uint256 previousBalance,
        uint256 newBalance
    );

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier validProposal(uint256 proposalId) {
        require(
            proposalId > 0 && proposalId <= proposalCount,
            "Invalid proposal ID"
        );
        _;
    }

    /**
     * @dev Constructor
     * @param _governanceToken Address of the governance token
     */
    constructor(address _governanceToken) {
        require(_governanceToken != address(0), "Invalid governance token");
        governanceToken = IERC20(_governanceToken);
        owner = msg.sender;
    }

    /**
     * @dev Create a new proposal
     * @param title Proposal title
     * @param description Proposal description
     * @param targets Array of target addresses for execution
     * @param values Array of values to send to targets
     * @param calldatas Array of function call data
     * @return proposalId ID of the created proposal
     */
    function propose(
        string memory title,
        string memory description,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    ) public returns (uint256 proposalId) {
        require(
            getVotes(msg.sender, block.number - 1) >= PROPOSAL_THRESHOLD,
            "Insufficient voting power to create proposal"
        );
        require(
            targets.length == values.length &&
                targets.length == calldatas.length,
            "Proposal function information arity mismatch"
        );
        require(targets.length != 0, "Must provide actions");
        require(targets.length <= 10, "Too many actions");

        proposalId = ++proposalCount;
        Proposal storage newProposal = proposals[proposalId];

        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.title = title;
        newProposal.description = description;
        newProposal.targets = targets;
        newProposal.values = values;
        newProposal.calldatas = calldatas;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + VOTING_PERIOD;
        newProposal.executionTime = 0;
        newProposal.forVotes = 0;
        newProposal.againstVotes = 0;
        newProposal.abstainVotes = 0;
        newProposal.executed = false;
        newProposal.cancelled = false;

        emit ProposalCreated(
            proposalId,
            msg.sender,
            title,
            description,
            newProposal.startTime,
            newProposal.endTime
        );
    }

    /**
     * @dev Cast a vote on a proposal
     * @param proposalId ID of the proposal to vote on
     * @param support Vote type (0=against, 1=for, 2=abstain)
     */
    function castVote(
        uint256 proposalId,
        uint8 support
    ) external validProposal(proposalId) {
        return _castVote(msg.sender, proposalId, support);
    }

    /** 

    /**
     * @dev Internal vote casting logic
     * @param voter Address of the voter
     * @param proposalId ID of the proposal
     * @param support Vote type
     */
    function _castVote(
        address voter,
        uint256 proposalId,
        uint8 support
    ) internal {
        require(support <= 2, "Invalid vote type");

        Proposal storage proposal = proposals[proposalId];
        require(state(proposalId) == ProposalState.Active, "Voting is closed");

        Receipt storage receipt = proposal.receipts[voter];
        require(!receipt.hasVoted, "Voter already voted");

        uint256 votes = getVotes(voter, proposal.startTime);
        require(votes > 0, "No voting power");

        if (support == 0) {
            proposal.againstVotes += votes;
        } else if (support == 1) {
            proposal.forVotes += votes;
        } else {
            proposal.abstainVotes += votes;
        }

        receipt.hasVoted = true;
        receipt.support = support;
        receipt.votes = votes;

        emit VoteCast(voter, proposalId, support, votes);
    }

    /**
     * @dev Queue a successful proposal for execution
     * @param proposalId ID of the proposal to queue
     */
    function queue(uint256 proposalId) external validProposal(proposalId) {
        require(
            state(proposalId) == ProposalState.Succeeded,
            "Proposal cannot be queued"
        );

        Proposal storage proposal = proposals[proposalId];
        uint256 executionTime = block.timestamp + EXECUTION_DELAY;
        proposal.executionTime = executionTime;

        for (uint256 i = 0; i < proposal.targets.length; i++) {
            _queueOrRevert(
                proposal.targets[i],
                proposal.values[i],
                proposal.calldatas[i],
                executionTime
            );
        }

        emit ProposalQueued(proposalId, executionTime);
    }

    /**
     * @dev Execute a queued proposal
     * @param proposalId ID of the proposal to execute
     */
    function execute(
        uint256 proposalId
    ) external payable validProposal(proposalId) {
        require(
            state(proposalId) == ProposalState.Queued,
            "Proposal cannot be executed"
        );

        Proposal storage proposal = proposals[proposalId];
        require(
            block.timestamp >= proposal.executionTime,
            "Execution time not reached"
        );
        require(
            block.timestamp <= proposal.executionTime + 14 days,
            "Execution window expired"
        );

        proposal.executed = true;

        for (uint256 i = 0; i < proposal.targets.length; i++) {
            bytes32 txHash = keccak256(
                abi.encode(
                    proposal.targets[i],
                    proposal.values[i],
                    proposal.calldatas[i],
                    proposal.executionTime
                )
            );
            require(queuedTransactions[txHash], "Transaction not queued");

            queuedTransactions[txHash] = false;

            (bool success, ) = proposal.targets[i].call{
                value: proposal.values[i]
            }(proposal.calldatas[i]);
            require(success, "Transaction execution reverted");
        }

        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev Cancel a proposal (owner only)
     * @param proposalId ID of the proposal to cancel
     */
    function cancel(
        uint256 proposalId
    ) external onlyOwner validProposal(proposalId) {
        ProposalState currentState = state(proposalId);
        require(
            currentState == ProposalState.Pending ||
                currentState == ProposalState.Active ||
                currentState == ProposalState.Queued,
            "Cannot cancel executed or cancelled proposal"
        );

        Proposal storage proposal = proposals[proposalId];
        proposal.cancelled = true;

        // Remove from queue if it was queued
        if (currentState == ProposalState.Queued) {
            for (uint256 i = 0; i < proposal.targets.length; i++) {
                bytes32 txHash = keccak256(
                    abi.encode(
                        proposal.targets[i],
                        proposal.values[i],
                        proposal.calldatas[i],
                        proposal.executionTime
                    )
                );
                queuedTransactions[txHash] = false;
            }
        }

        emit ProposalCancelled(proposalId);
    }

    /**
     * @dev Get the current state of a proposal
     * @param proposalId ID of the proposal
     * @return Current state of the proposal
     */
    function state(
        uint256 proposalId
    ) public view validProposal(proposalId) returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.cancelled) {
            return ProposalState.Cancelled;
        } else if (proposal.executed) {
            return ProposalState.Executed;
        } else if (block.timestamp <= proposal.endTime) {
            return ProposalState.Active;
        } else if (
            proposal.forVotes <= proposal.againstVotes ||
            _quorum(proposalId) == false
        ) {
            return ProposalState.Defeated;
        } else if (proposal.executionTime == 0) {
            return ProposalState.Succeeded;
        } else {
            return ProposalState.Queued;
        }
    }

    /**
     * @dev Check if proposal reached quorum
     * @param proposalId ID of the proposal
     * @return true if quorum reached
     */
    function _quorum(uint256 proposalId) internal view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        uint256 totalVotes = proposal.forVotes +
            proposal.againstVotes +
            proposal.abstainVotes;
        uint256 requiredQuorum = (governanceToken.totalSupply() *
            QUORUM_THRESHOLD) / 100;
        return totalVotes >= requiredQuorum;
    }

    /**
     * @dev Delegate voting power to another address
     * @param delegatee Address to delegate votes to
     */
    function delegate(address delegatee) public {
        return _delegate(msg.sender, delegatee);
    }

    /**
     * @dev Get current voting power of an address
     * @param account Address to check
     * @return Current voting power
     */
    function getCurrentVotes(address account) external view returns (uint256) {
        uint256 nCheckpoints = numCheckpoints[account];
        return
            nCheckpoints > 0 ? checkpoints[account][nCheckpoints - 1].votes : 0;
    }

    /**
     * @dev Get voting power at a specific block
     * @param account Address to check
     * @param blockNumber Block number to check
     * @return Voting power at the specified block
     */
    function getVotes(
        address account,
        uint256 blockNumber
    ) public view returns (uint256) {
        require(blockNumber < block.number, "Not yet determined");

        uint256 nCheckpoints = numCheckpoints[account];
        if (nCheckpoints == 0) {
            return 0;
        }

        // First check most recent balance
        if (checkpoints[account][nCheckpoints - 1].fromBlock <= blockNumber) {
            return checkpoints[account][nCheckpoints - 1].votes;
        }

        // Next check implicit zero balance
        if (checkpoints[account][0].fromBlock > blockNumber) {
            return 0;
        }

        uint256 lower = 0;
        uint256 upper = nCheckpoints - 1;
        while (upper > lower) {
            uint256 center = upper - (upper - lower) / 2;
            Checkpoint memory cp = checkpoints[account][center];
            if (cp.fromBlock == blockNumber) {
                return cp.votes;
            } else if (cp.fromBlock < blockNumber) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }
        return checkpoints[account][lower].votes;
    }

    /**
     * @dev Internal delegation logic
     * @param delegator Address delegating votes
     * @param delegatee Address receiving votes
     */
    function _delegate(address delegator, address delegatee) internal {
        address currentDelegate = delegates[delegator];
        uint256 delegatorBalance = governanceToken.balanceOf(delegator);
        delegates[delegator] = delegatee;

        emit DelegateChanged(delegator, currentDelegate, delegatee);

        _moveDelegates(currentDelegate, delegatee, delegatorBalance);
    }

    /**
     * @dev Move delegated votes from one delegate to another
     * @param srcRep Source delegate
     * @param dstRep Destination delegate
     * @param amount Amount of votes to move
     */
    function _moveDelegates(
        address srcRep,
        address dstRep,
        uint256 amount
    ) internal {
        if (srcRep != dstRep && amount > 0) {
            if (srcRep != address(0)) {
                uint256 srcRepNum = numCheckpoints[srcRep];
                uint256 srcRepOld = srcRepNum > 0
                    ? checkpoints[srcRep][srcRepNum - 1].votes
                    : 0;
                uint256 srcRepNew = srcRepOld - amount;
                _writeCheckpoint(srcRep, srcRepNum, srcRepOld, srcRepNew);
            }

            if (dstRep != address(0)) {
                uint256 dstRepNum = numCheckpoints[dstRep];
                uint256 dstRepOld = dstRepNum > 0
                    ? checkpoints[dstRep][dstRepNum - 1].votes
                    : 0;
                uint256 dstRepNew = dstRepOld + amount;
                _writeCheckpoint(dstRep, dstRepNum, dstRepOld, dstRepNew);
            }
        }
    }

    /**
     * @dev Write a checkpoint for vote tracking
     * @param delegatee Address of the delegate
     * @param nCheckpoints Number of existing checkpoints
     * @param oldVotes Previous vote count
     * @param newVotes New vote count
     */
    function _writeCheckpoint(
        address delegatee,
        uint256 nCheckpoints,
        uint256 oldVotes,
        uint256 newVotes
    ) internal {
        if (
            nCheckpoints > 0 &&
            checkpoints[delegatee][nCheckpoints - 1].fromBlock == block.number
        ) {
            checkpoints[delegatee][nCheckpoints - 1].votes = newVotes;
        } else {
            checkpoints[delegatee][nCheckpoints] = Checkpoint(
                block.number,
                newVotes
            );
            numCheckpoints[delegatee] = nCheckpoints + 1;
        }

        emit DelegateVotesChanged(delegatee, oldVotes, newVotes);
    }

    /**
     * @dev Queue a transaction or revert if already queued
     */
    function _queueOrRevert(
        address target,
        uint256 value,
        bytes memory data,
        uint256 executionTime
    ) internal {
        bytes32 txHash = keccak256(
            abi.encode(target, value, data, executionTime)
        );
        require(
            !queuedTransactions[txHash],
            "Identical proposal action already queued"
        );
        queuedTransactions[txHash] = true;
    }

    /**
     * @dev Get proposal details
     * @param proposalId ID of the proposal
     * Proposal details
     */
    function getProposal(
        uint256 proposalId
    )
        external
        view
        validProposal(proposalId)
        returns (
            address proposer,
            string memory title,
            string memory description,
            uint256 startTime,
            uint256 endTime,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 abstainVotes,
            bool executed,
            bool cancelled
        )
    {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.proposer,
            proposal.title,
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.executed,
            proposal.cancelled
        );
    }

    /**
     * @dev Get proposal actions
     * @param proposalId ID of the proposal
     * targets Array of target addresses
     * values Array of values
     *  calldatas Array of call data
     */
    function getProposalActions(
        uint256 proposalId
    )
        external
        view
        validProposal(proposalId)
        returns (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas
        )
    {
        Proposal storage proposal = proposals[proposalId];
        return (proposal.targets, proposal.values, proposal.calldatas);
    }

    /**
     * @dev Get receipt for a voter on a proposal
     * @param proposalId ID of the proposal
     * @param voter Address of the voter
     *  Receipt information
     */
    function getReceipt(
        uint256 proposalId,
        address voter
    )
        external
        view
        validProposal(proposalId)
        returns (bool hasVoted, uint8 support, uint256 votes)
    {
        Receipt storage receipt = proposals[proposalId].receipts[voter];
        return (receipt.hasVoted, receipt.support, receipt.votes);
    }

    /**
     * @dev Emergency function to recover tokens sent to contract
     * @param token Address of token to recover
     * @param amount Amount to recover
     */
    function recoverToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }
}
