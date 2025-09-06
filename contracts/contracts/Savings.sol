// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Interfaces/IERC20.sol";

/**
 * @title Savings Contract
 * @dev Real-time yield savings contract with compound interest
 * Features: Deposit, withdraw, real-time interest accrual, emergency withdrawals
 */
contract Savings {
    // State variables
    IERC20 public immutable depositToken;
    address public owner;
    uint256 public totalDeposits;
    uint256 public annualInterestRate; // In basis points (e.g., 500 = 5%)
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public lastUpdateTime;
    uint256 public accumulatedInterest;
    bool public paused;

    // User deposit information
    struct UserDeposit {
        uint256 principal;
        uint256 lastUpdateTime;
        uint256 accruedInterest;
        bool exists;
    }

    mapping(address => UserDeposit) public userDeposits;
    address[] public depositors;

    // Events
    event Deposit(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawal(
        address indexed user,
        uint256 principal,
        uint256 interest,
        uint256 timestamp
    );
    event InterestRateUpdated(uint256 oldRate, uint256 newRate);
    event InterestAccrued(
        address indexed user,
        uint256 interest,
        uint256 timestamp
    );
    event EmergencyWithdrawal(address indexed user, uint256 amount);
    event ContractPaused(bool paused);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier notPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier validAmount(uint256 amount) {
        require(amount > 0, "Amount must be greater than 0");
        _;
    }

    /**
     * @dev Contract constructor
     * @param _depositToken Address of the ERC20 token to accept deposits
     * @param _annualInterestRate Initial annual interest rate in basis points
     */
    constructor(address _depositToken, uint256 _annualInterestRate) {
        require(_depositToken != address(0), "Invalid token address");
        require(_annualInterestRate <= 5000, "Interest rate too high"); // Max 50%

        depositToken = IERC20(_depositToken);
        owner = msg.sender;
        annualInterestRate = _annualInterestRate;
        lastUpdateTime = block.timestamp;
    }

    /**
     * @dev Deposit tokens to start earning interest
     * @param amount Amount of tokens to deposit
     */
    function deposit(uint256 amount) external validAmount(amount) notPaused {
        require(
            depositToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        updateInterest(msg.sender);

        UserDeposit storage userDeposit = userDeposits[msg.sender];

        if (!userDeposit.exists) {
            userDeposit.exists = true;
            depositors.push(msg.sender);
        }

        userDeposit.principal += amount;
        userDeposit.lastUpdateTime = block.timestamp;
        totalDeposits += amount;

        emit Deposit(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Withdraw principal and accrued interest
     * @param amount Amount of principal to withdraw (0 = withdraw all)
     */
    function withdraw(uint256 amount) external notPaused {
        UserDeposit storage userDeposit = userDeposits[msg.sender];
        require(userDeposit.exists, "No deposit found");

        updateInterest(msg.sender);

        uint256 withdrawAmount = amount == 0 ? userDeposit.principal : amount;
        require(
            withdrawAmount <= userDeposit.principal,
            "Insufficient balance"
        );

        uint256 interestToWithdraw = userDeposit.accruedInterest;
        uint256 totalWithdrawal = withdrawAmount + interestToWithdraw;

        userDeposit.principal -= withdrawAmount;
        userDeposit.accruedInterest = 0;
        totalDeposits -= withdrawAmount;

        if (userDeposit.principal == 0) {
            userDeposit.exists = false;
            // Remove from depositors array
            for (uint i = 0; i < depositors.length; i++) {
                if (depositors[i] == msg.sender) {
                    depositors[i] = depositors[depositors.length - 1];
                    depositors.pop();
                    break;
                }
            }
        }

        require(
            depositToken.transfer(msg.sender, totalWithdrawal),
            "Transfer failed"
        );

        emit Withdrawal(
            msg.sender,
            withdrawAmount,
            interestToWithdraw,
            block.timestamp
        );
    }

    /**
     * @dev Update interest for a specific user
     * @param user Address of the user
     */
    function updateInterest(address user) public {
        UserDeposit storage userDeposit = userDeposits[user];
        if (!userDeposit.exists || userDeposit.principal == 0) return;

        uint256 timeElapsed = block.timestamp - userDeposit.lastUpdateTime;
        if (timeElapsed > 0) {
            uint256 interest = calculateInterest(
                userDeposit.principal,
                timeElapsed
            );
            userDeposit.accruedInterest += interest;
            userDeposit.lastUpdateTime = block.timestamp;
            accumulatedInterest += interest;

            emit InterestAccrued(user, interest, block.timestamp);
        }
    }

    /**
     * @dev Calculate interest for a principal amount over time
     * @param principal Principal amount
     * @param timeElapsed Time elapsed in seconds
     * @return interest Calculated interest
     */
    function calculateInterest(
        uint256 principal,
        uint256 timeElapsed
    ) public view returns (uint256 interest) {
        // Simple interest calculation: (principal * rate * time) / (BASIS_POINTS * 365 days)
        interest =
            (principal * annualInterestRate * timeElapsed) /
            (BASIS_POINTS * 365 days);
    }

    /**
     * @dev Get user's current balance including accrued interest
     * @param user Address of the user
     * @return principal User's principal amount
     * @return accruedInterest User's accrued interest (including pending)
     * @return totalBalance Total balance (principal + interest)
     */
    function getUserBalance(
        address user
    )
        external
        view
        returns (
            uint256 principal,
            uint256 accruedInterest,
            uint256 totalBalance
        )
    {
        UserDeposit memory userDeposit = userDeposits[user];
        if (!userDeposit.exists) return (0, 0, 0);

        principal = userDeposit.principal;

        uint256 timeElapsed = block.timestamp - userDeposit.lastUpdateTime;
        uint256 pendingInterest = calculateInterest(principal, timeElapsed);

        accruedInterest = userDeposit.accruedInterest + pendingInterest;
        totalBalance = principal + accruedInterest;
    }

    /**
     * @dev Update interest rates for all users (batch operation)
     */
    function updateAllInterests() external {
        for (uint i = 0; i < depositors.length; i++) {
            updateInterest(depositors[i]);
        }
    }

    /**
     * @dev Set new annual interest rate (owner only)
     * @param newRate New annual interest rate in basis points
     */
    function setInterestRate(uint256 newRate) external onlyOwner {
        require(newRate <= 5000, "Interest rate too high"); // Max 50%

        // Update all existing deposits before changing rate
        this.updateAllInterests();

        uint256 oldRate = annualInterestRate;
        annualInterestRate = newRate;

        emit InterestRateUpdated(oldRate, newRate);
    }

    /**
     * @dev Emergency withdrawal (owner only) - withdraw without interest
     * @param user User address for emergency withdrawal
     */
    function emergencyWithdraw(address user) external onlyOwner {
        UserDeposit storage userDeposit = userDeposits[user];
        require(userDeposit.exists, "No deposit found");

        uint256 amount = userDeposit.principal;
        userDeposit.principal = 0;
        userDeposit.accruedInterest = 0;
        userDeposit.exists = false;
        totalDeposits -= amount;

        require(depositToken.transfer(user, amount), "Transfer failed");

        emit EmergencyWithdrawal(user, amount);
    }

    /**
     * @dev Pause/unpause contract (owner only)
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit ContractPaused(_paused);
    }

    /**
     * @dev Get total number of depositors
     */
    function getTotalDepositors() external view returns (uint256) {
        return depositors.length;
    }

    /**
     * @dev Get contract statistics
     */
    function getStats()
        external
        view
        returns (
            uint256 _totalDeposits,
            uint256 _totalDepositors,
            uint256 _annualInterestRate,
            uint256 _accumulatedInterest
        )
    {
        return (
            totalDeposits,
            depositors.length,
            annualInterestRate,
            accumulatedInterest
        );
    }
}
