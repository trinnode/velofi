// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title CreditScore Contract
 * @dev Decentralized credit scoring system based on on-chain activities
 * Features: DeFi activity tracking, credit score calculation, reputation building.
 */
contract CreditScore {
    // Credit score parameters
    uint256 public constant MAX_CREDIT_SCORE = 1000;
    uint256 public constant MIN_CREDIT_SCORE = 100;
    uint256 public constant INITIAL_CREDIT_SCORE = 300;

    // Activity weights (basis points)
    uint256 public constant SAVINGS_WEIGHT = 200; // 2%
    uint256 public constant LENDING_WEIGHT = 300; // 3%
    uint256 public constant REPAYMENT_WEIGHT = 400; // 4%
    uint256 public constant DEX_WEIGHT = 100; // 1%
    uint256 public constant GOVERNANCE_WEIGHT = 150; // 1.5%
    uint256 public constant TIME_WEIGHT = 50; // 0.5%

    address public owner;
    mapping(address => bool) public authorizedCallers;

    // User credit data
    struct CreditData {
        uint256 creditScore;
        uint256 totalSavingsAmount;
        uint256 totalLendingAmount;
        uint256 totalRepaidAmount;
        uint256 totalDexVolume;
        uint256 governanceParticipation;
        uint256 accountAge;
        uint256 lastUpdateTime;
        uint256 defaultCount;
        bool exists;
    }

    mapping(address => CreditData) public creditData;
    address[] public users;

    // Events
    event CreditScoreUpdated(
        address indexed user,
        uint256 oldScore,
        uint256 newScore
    );
    event ActivityRecorded(
        address indexed user,
        string activityType,
        uint256 amount
    );
    event DefaultRecorded(address indexed user, uint256 amount);
    event AuthorizedCallerAdded(address indexed caller);
    event AuthorizedCallerRemoved(address indexed caller);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyAuthorized() {
        require(
            authorizedCallers[msg.sender] || msg.sender == owner,
            "Not authorized"
        );
        _;
    }

    /**
     * @dev Constructor
     */
    constructor() {
        owner = msg.sender;
        authorizedCallers[msg.sender] = true;
    }

    /**
     * @dev Initialize credit score for a new user
     * @param user User address
     */
    function initializeUser(address user) external onlyAuthorized {
        require(user != address(0), "Invalid user address");

        if (!creditData[user].exists) {
            creditData[user] = CreditData({
                creditScore: INITIAL_CREDIT_SCORE,
                totalSavingsAmount: 0,
                totalLendingAmount: 0,
                totalRepaidAmount: 0,
                totalDexVolume: 0,
                governanceParticipation: 0,
                accountAge: block.timestamp,
                lastUpdateTime: block.timestamp,
                defaultCount: 0,
                exists: true
            });

            users.push(user);
            emit CreditScoreUpdated(user, 0, INITIAL_CREDIT_SCORE);
        }
    }

    /**
     * @dev Record savings activity
     * @param user User address
     * @param amount Amount saved
     */
    function recordSavingsActivity(
        address user,
        uint256 amount
    ) external onlyAuthorized {
        this.initializeUser(user);

        CreditData storage data = creditData[user];
        data.totalSavingsAmount += amount;
        data.lastUpdateTime = block.timestamp;

        updateCreditScore(user);
        emit ActivityRecorded(user, "SAVINGS", amount);
    }

    /**
     * @dev Record lending activity
     * @param user User address
     * @param amount Amount lent
     */
    function recordLendingActivity(
        address user,
        uint256 amount
    ) external onlyAuthorized {
        this.initializeUser(user);

        CreditData storage data = creditData[user];
        data.totalLendingAmount += amount;
        data.lastUpdateTime = block.timestamp;

        updateCreditScore(user);
        emit ActivityRecorded(user, "LENDING", amount);
    }

    /**
     * @dev Record repayment activity
     * @param user User address
     * @param amount Amount repaid
     */
    function recordRepaymentActivity(
        address user,
        uint256 amount
    ) external onlyAuthorized {
        this.initializeUser(user);

        CreditData storage data = creditData[user];
        data.totalRepaidAmount += amount;
        data.lastUpdateTime = block.timestamp;

        updateCreditScore(user);
        emit ActivityRecorded(user, "REPAYMENT", amount);
    }

    /**
     * @dev Record DEX trading activity
     * @param user User address
     * @param volume Trading volume
     */
    function recordDexActivity(
        address user,
        uint256 volume
    ) external onlyAuthorized {
        this.initializeUser(user);

        CreditData storage data = creditData[user];
        data.totalDexVolume += volume;
        data.lastUpdateTime = block.timestamp;

        updateCreditScore(user);
        emit ActivityRecorded(user, "DEX_TRADING", volume);
    }

    /**
     * @dev Record governance participation
     * @param user User address
     */
    function recordGovernanceActivity(address user) external onlyAuthorized {
        this.initializeUser(user);

        CreditData storage data = creditData[user];
        data.governanceParticipation += 1;
        data.lastUpdateTime = block.timestamp;

        updateCreditScore(user);
        emit ActivityRecorded(user, "GOVERNANCE", 1);
    }

    /**
     * @dev Record a default (missed payment)
     * @param user User address
     * @param amount Amount defaulted
     */
    function recordDefault(
        address user,
        uint256 amount
    ) external onlyAuthorized {
        require(creditData[user].exists, "User not found");

        CreditData storage data = creditData[user];
        data.defaultCount += 1;
        data.lastUpdateTime = block.timestamp;

        updateCreditScore(user);
        emit DefaultRecorded(user, amount);
    }

    /**
     * @dev Calculate and update credit score
     * @param user User address
     */
    function updateCreditScore(address user) public {
        CreditData storage data = creditData[user];
        require(data.exists, "User not found");

        uint256 oldScore = data.creditScore;
        uint256 newScore = calculateCreditScore(user);

        data.creditScore = newScore;

        if (newScore != oldScore) {
            emit CreditScoreUpdated(user, oldScore, newScore);
        }
    }

    /**
     * @dev Calculate credit score based on user activities
     * @param user User address
     * @return score Calculated credit score
     */
    function calculateCreditScore(
        address user
    ) public view returns (uint256 score) {
        CreditData memory data = creditData[user];
        if (!data.exists) return INITIAL_CREDIT_SCORE;

        // Base score
        score = INITIAL_CREDIT_SCORE;

        // Savings contribution (normalized to 18 decimals)
        uint256 savingsContribution = (data.totalSavingsAmount *
            SAVINGS_WEIGHT) / 1e18;
        if (savingsContribution > 100) savingsContribution = 100;

        // Lending contribution
        uint256 lendingContribution = (data.totalLendingAmount *
            LENDING_WEIGHT) / 1e18;
        if (lendingContribution > 150) lendingContribution = 150;

        // Repayment ratio bonus
        uint256 repaymentBonus = 0;
        if (data.totalLendingAmount > 0) {
            uint256 repaymentRatio = (data.totalRepaidAmount * 10000) /
                data.totalLendingAmount;
            if (repaymentRatio >= 10000) {
                // 100% or more repaid
                repaymentBonus = 200;
            } else if (repaymentRatio >= 8000) {
                // 80% or more repaid
                repaymentBonus = 100;
            } else if (repaymentRatio >= 5000) {
                // 50% or more repaid
                repaymentBonus = 50;
            }
        }

        // DEX activity contribution
        uint256 dexContribution = (data.totalDexVolume * DEX_WEIGHT) / 1e18;
        if (dexContribution > 50) dexContribution = 50;

        // Governance participation bonus
        uint256 governanceBonus = (data.governanceParticipation *
            GOVERNANCE_WEIGHT) / 100;
        if (governanceBonus > 100) governanceBonus = 100;

        // Account age bonus (time since first activity)
        uint256 ageBonus = (((block.timestamp - data.accountAge) / 30 days) *
            TIME_WEIGHT) / 100;
        if (ageBonus > 50) ageBonus = 50;

        // Default penalty
        uint256 defaultPenalty = data.defaultCount * 100;

        // Calculate final score
        score =
            score +
            savingsContribution +
            lendingContribution +
            repaymentBonus +
            dexContribution +
            governanceBonus +
            ageBonus -
            defaultPenalty;

        // Ensure score is within bounds
        if (score > MAX_CREDIT_SCORE) score = MAX_CREDIT_SCORE;
        if (score < MIN_CREDIT_SCORE) score = MIN_CREDIT_SCORE;
    }

    /**
     * @dev Get credit score for a user
     * @param user User address
     * @return score Current credit score
     */
    function getCreditScore(
        address user
    ) external view returns (uint256 score) {
        if (!creditData[user].exists) return INITIAL_CREDIT_SCORE;
        return creditData[user].creditScore;
    }

    /**
     * @dev Get detailed credit data for a user
     * @param user User address
     * @return data Complete credit data struct
     */
    function getCreditData(
        address user
    ) external view returns (CreditData memory data) {
        return creditData[user];
    }

    /**
     * @dev Get credit tier based on score
     * @param score Credit score
     * @return tier Credit tier (0-5)
     */
    function getCreditTier(uint256 score) public pure returns (uint256 tier) {
        if (score >= 900) return 5; // Excellent
        if (score >= 750) return 4; // Very Good
        if (score >= 600) return 3; // Good
        if (score >= 450) return 2; // Fair
        if (score >= 300) return 1; // Poor
        return 0; // Very Poor
    }

    /**
     * @dev Check if user is eligible for lending based on credit score
     * @param user User address
     * @param amount Loan amount requested
     * @return eligible True if eligible
     * @return maxAmount Maximum loan amount allowed
     */
    function checkLendingEligibility(
        address user,
        uint256 amount
    ) external view returns (bool eligible, uint256 maxAmount) {
        uint256 score = creditData[user].exists
            ? creditData[user].creditScore
            : INITIAL_CREDIT_SCORE;
        uint256 tier = getCreditTier(score);

        if (tier == 0) {
            return (false, 0);
        }

        // Calculate max loan based on tier and activities
        uint256 baseAmount = creditData[user].totalSavingsAmount * 2; // 2x savings
        maxAmount = (baseAmount * tier) / 5; // Adjusted by tier

        eligible = amount <= maxAmount;
    }

    /**
     * @dev Add authorized caller
     * @param caller Address to authorize
     */
    function addAuthorizedCaller(address caller) external onlyOwner {
        require(caller != address(0), "Invalid caller address");
        authorizedCallers[caller] = true;
        emit AuthorizedCallerAdded(caller);
    }

    /**
     * @dev Remove authorized caller
     * @param caller Address to remove authorization
     */
    function removeAuthorizedCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
        emit AuthorizedCallerRemoved(caller);
    }

    /**
     * @dev Get total number of users
     */
    function getTotalUsers() external view returns (uint256) {
        return users.length;
    }

    /**
     * @dev Batch update credit scores for multiple users
     * @param userList Array of user addresses
     */
    function batchUpdateCreditScores(address[] calldata userList) external {
        for (uint i = 0; i < userList.length; i++) {
            if (creditData[userList[i]].exists) {
                updateCreditScore(userList[i]);
            }
        }
    }
}
