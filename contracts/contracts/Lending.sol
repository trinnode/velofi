// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Interfaces/IERC20.sol";
import "./CreditScore.sol";

/**
 * @title Lending Contract
 * @dev Decentralized lending platform with credit-score based approvals
 * Features: Credit-based lending, collateralized loans, automated liquidation
 */
contract Lending {
    // Loan parameters
    uint256 public constant MAX_LOAN_DURATION = 365 days;
    uint256 public constant MIN_LOAN_DURATION = 7 days;
    uint256 public constant LIQUIDATION_THRESHOLD = 8000; // 80% in basis points
    uint256 public constant BASIS_POINTS = 10000;

    IERC20 public immutable lendingToken;
    CreditScore public immutable creditScoreContract;
    address public owner;
    uint256 public nextLoanId;
    uint256 public totalLent;
    uint256 public totalRepaid;
    bool public paused;

    // Interest rates based on credit tiers (basis points per year)
    mapping(uint256 => uint256) public tierInterestRates;

    struct Loan {
        uint256 id;
        address borrower;
        uint256 principal;
        uint256 interestRate;
        uint256 collateralAmount;
        address collateralToken;
        uint256 startTime;
        uint256 duration;
        uint256 repaidAmount;
        bool isRepaid;
        bool isLiquidated;
        bool exists;
    }

    struct LoanRequest {
        address borrower;
        uint256 amount;
        uint256 duration;
        uint256 collateralAmount;
        address collateralToken;
        uint256 timestamp;
        bool processed;
    }

    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public userLoans;
    mapping(uint256 => LoanRequest) public loanRequests;
    mapping(address => uint256[]) public userRequests;
    uint256 public nextRequestId;

    // Supported collateral tokens
    mapping(address => bool) public supportedCollateral;
    mapping(address => uint256) public collateralRatios; // Required collateral ratio in basis points

    // Events
    event LoanRequested(
        uint256 indexed requestId,
        address indexed borrower,
        uint256 amount
    );
    event LoanApproved(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount
    );
    event LoanRepaid(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount
    );
    event LoanLiquidated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 collateralSeized
    );
    event CollateralAdded(address indexed token, uint256 ratio);
    event InterestRateUpdated(uint256 tier, uint256 rate);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier notPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier validLoan(uint256 loanId) {
        require(loans[loanId].exists, "Loan does not exist");
        _;
    }

    /**
     * @dev Constructor
     * @param _lendingToken Address of the token to lend
     * @param _creditScoreContract Address of the credit score contract
     */
    constructor(address _lendingToken, address _creditScoreContract) {
        require(_lendingToken != address(0), "Invalid lending token");
        require(
            _creditScoreContract != address(0),
            "Invalid credit score contract"
        );

        lendingToken = IERC20(_lendingToken);
        creditScoreContract = CreditScore(_creditScoreContract);
        owner = msg.sender;
        nextLoanId = 1;
        nextRequestId = 1;

        // Initialize default interest rates (annual)
        tierInterestRates[0] = 2000; // 20% for tier 0
        tierInterestRates[1] = 1500; // 15% for tier 1
        tierInterestRates[2] = 1200; // 12% for tier 2
        tierInterestRates[3] = 1000; // 10% for tier 3
        tierInterestRates[4] = 800; // 8% for tier 4
        tierInterestRates[5] = 600; // 6% for tier 5
    }

    /**
     * @dev Request a loan
     * @param amount Loan amount requested
     * @param duration Loan duration in seconds
     * @param collateralAmount Amount of collateral to provide
     * @param collateralToken Address of collateral token
     */
    function requestLoan(
        uint256 amount,
        uint256 duration,
        uint256 collateralAmount,
        address collateralToken
    ) external notPaused {
        require(amount > 0, "Loan amount must be positive");
        require(
            duration >= MIN_LOAN_DURATION && duration <= MAX_LOAN_DURATION,
            "Invalid duration"
        );
        require(
            supportedCollateral[collateralToken],
            "Collateral not supported"
        );
        require(collateralAmount > 0, "Collateral amount must be positive");

        // Check collateral requirements
        uint256 requiredCollateral = (amount *
            collateralRatios[collateralToken]) / BASIS_POINTS;
        require(
            collateralAmount >= requiredCollateral,
            "Insufficient collateral"
        );

        // Transfer collateral to contract
        IERC20(collateralToken).transferFrom(
            msg.sender,
            address(this),
            collateralAmount
        );

        uint256 requestId = nextRequestId++;
        loanRequests[requestId] = LoanRequest({
            borrower: msg.sender,
            amount: amount,
            duration: duration,
            collateralAmount: collateralAmount,
            collateralToken: collateralToken,
            timestamp: block.timestamp,
            processed: false
        });

        userRequests[msg.sender].push(requestId);

        emit LoanRequested(requestId, msg.sender, amount);
    }

    /**
     * @dev Approve a loan request (owner only)
     * @param requestId ID of the loan request
     */
    function approveLoan(uint256 requestId) external onlyOwner {
        LoanRequest storage request = loanRequests[requestId];
        require(!request.processed, "Request already processed");
        require(request.borrower != address(0), "Invalid request");

        // Check credit eligibility
        (bool eligible, uint256 maxAmount) = creditScoreContract
            .checkLendingEligibility(request.borrower, request.amount);
        require(eligible, "Not eligible for loan");
        require(request.amount <= maxAmount, "Loan amount exceeds limit");

        // Get credit score and determine interest rate
        uint256 creditScore = creditScoreContract.getCreditScore(
            request.borrower
        );
        uint256 tier = creditScoreContract.getCreditTier(creditScore);
        uint256 interestRate = tierInterestRates[tier];

        uint256 loanId = nextLoanId++;
        loans[loanId] = Loan({
            id: loanId,
            borrower: request.borrower,
            principal: request.amount,
            interestRate: interestRate,
            collateralAmount: request.collateralAmount,
            collateralToken: request.collateralToken,
            startTime: block.timestamp,
            duration: request.duration,
            repaidAmount: 0,
            isRepaid: false,
            isLiquidated: false,
            exists: true
        });

        userLoans[request.borrower].push(loanId);
        request.processed = true;
        totalLent += request.amount;

        // Transfer loan amount to borrower
        require(
            lendingToken.transfer(request.borrower, request.amount),
            "Transfer failed"
        );

        // Record lending activity in credit score
        creditScoreContract.recordLendingActivity(
            request.borrower,
            request.amount
        );

        emit LoanApproved(loanId, request.borrower, request.amount);
    }

    /**
     * @dev Repay loan (partial or full)
     * @param loanId ID of the loan to repay
     * @param amount Amount to repay
     */
    function repayLoan(
        uint256 loanId,
        uint256 amount
    ) external validLoan(loanId) notPaused {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.borrower, "Only borrower can repay");
        require(!loan.isRepaid, "Loan already repaid");
        require(!loan.isLiquidated, "Loan has been liquidated");
        require(amount > 0, "Repayment amount must be positive");

        uint256 totalOwed = calculateTotalOwed(loanId);
        uint256 remainingDebt = totalOwed - loan.repaidAmount;
        require(amount <= remainingDebt, "Amount exceeds remaining debt");

        // Transfer repayment from borrower
        require(
            lendingToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        loan.repaidAmount += amount;
        totalRepaid += amount;

        // Check if loan is fully repaid
        if (loan.repaidAmount >= totalOwed) {
            loan.isRepaid = true;

            // Return collateral to borrower
            IERC20(loan.collateralToken).transfer(
                loan.borrower,
                loan.collateralAmount
            );
        }

        // Record repayment activity in credit score
        creditScoreContract.recordRepaymentActivity(msg.sender, amount);

        emit LoanRepaid(loanId, msg.sender, amount);
    }

    /**
     * @dev Liquidate an overdue loan
     * @param loanId ID of the loan to liquidate
     */
    function liquidateLoan(uint256 loanId) external validLoan(loanId) {
        Loan storage loan = loans[loanId];
        require(!loan.isRepaid, "Loan already repaid");
        require(!loan.isLiquidated, "Loan already liquidated");

        // Check if loan is overdue
        require(
            block.timestamp > loan.startTime + loan.duration,
            "Loan not overdue"
        );

        uint256 totalOwed = calculateTotalOwed(loanId);
        uint256 remainingDebt = totalOwed - loan.repaidAmount;

        // Calculate liquidation threshold
        uint256 liquidationAmount = (totalOwed * LIQUIDATION_THRESHOLD) /
            BASIS_POINTS;
        require(
            loan.repaidAmount < liquidationAmount,
            "Loan above liquidation threshold"
        );

        loan.isLiquidated = true;

        // Seize collateral (keep in contract as protocol revenue)
        uint256 collateralSeized = loan.collateralAmount;

        // Record default in credit score
        creditScoreContract.recordDefault(loan.borrower, remainingDebt);

        emit LoanLiquidated(loanId, loan.borrower, collateralSeized);
    }

    /**
     * @dev Calculate total amount owed for a loan
     * @param loanId ID of the loan
     * @return totalOwed Total amount owed (principal + interest)
     */
    function calculateTotalOwed(
        uint256 loanId
    ) public view validLoan(loanId) returns (uint256 totalOwed) {
        Loan memory loan = loans[loanId];
        uint256 timeElapsed = block.timestamp - loan.startTime;
        if (timeElapsed > loan.duration) {
            timeElapsed = loan.duration;
        }

        uint256 interest = (loan.principal * loan.interestRate * timeElapsed) /
            (BASIS_POINTS * 365 days);
        totalOwed = loan.principal + interest;
    }

    /**
     * @dev Get loan details
     * @param loanId ID of the loan
     * @return loan Loan struct
     * @return totalOwed Total amount owed
     * @return remainingDebt Remaining debt amount
     */
    function getLoanDetails(
        uint256 loanId
    )
        external
        view
        validLoan(loanId)
        returns (Loan memory loan, uint256 totalOwed, uint256 remainingDebt)
    {
        loan = loans[loanId];
        totalOwed = calculateTotalOwed(loanId);
        remainingDebt = totalOwed - loan.repaidAmount;
    }

    /**
     * @dev Get user's active loans
     * @param user User address
     * @return activeLoans Array of active loan IDs
     */
    function getUserActiveLoans(
        address user
    ) external view returns (uint256[] memory activeLoans) {
        uint256[] memory allLoans = userLoans[user];
        uint256 activeCount = 0;

        // Count active loans
        for (uint i = 0; i < allLoans.length; i++) {
            if (
                !loans[allLoans[i]].isRepaid && !loans[allLoans[i]].isLiquidated
            ) {
                activeCount++;
            }
        }

        // Populate active loans array
        activeLoans = new uint256[](activeCount);
        uint256 index = 0;
        for (uint i = 0; i < allLoans.length; i++) {
            if (
                !loans[allLoans[i]].isRepaid && !loans[allLoans[i]].isLiquidated
            ) {
                activeLoans[index] = allLoans[i];
                index++;
            }
        }
    }

    /**
     * @dev Add supported collateral token (owner only)
     * @param token Token address
     * @param ratio Required collateral ratio in basis points
     */
    function addSupportedCollateral(
        address token,
        uint256 ratio
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(ratio > BASIS_POINTS, "Ratio must be > 100%");

        supportedCollateral[token] = true;
        collateralRatios[token] = ratio;

        emit CollateralAdded(token, ratio);
    }

    /**
     * @dev Update interest rate for a credit tier (owner only)
     * @param tier Credit tier (0-5)
     * @param rate Interest rate in basis points
     */
    function updateInterestRate(uint256 tier, uint256 rate) external onlyOwner {
        require(tier <= 5, "Invalid tier");
        require(rate <= 5000, "Rate too high"); // Max 50%

        tierInterestRates[tier] = rate;
        emit InterestRateUpdated(tier, rate);
    }

    /**
     * @dev Withdraw protocol funds (owner only)
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
    function withdrawFunds(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }

    /**
     * @dev Pause/unpause contract (owner only)
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    /**
     * @dev Get lending statistics
     */
    function getLendingStats()
        external
        view
        returns (
            uint256 _totalLent,
            uint256 _totalRepaid,
            uint256 _activeLoans,
            uint256 _totalRequests
        )
    {
        uint256 activeCount = 0;
        for (uint i = 1; i < nextLoanId; i++) {
            if (
                loans[i].exists && !loans[i].isRepaid && !loans[i].isLiquidated
            ) {
                activeCount++;
            }
        }

        return (totalLent, totalRepaid, activeCount, nextRequestId - 1);
    }
}
