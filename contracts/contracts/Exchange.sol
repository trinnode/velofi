// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Interfaces/IERC20.sol";
import "./LiquidityPool.sol";

/**
 * @title Exchange Contract
 * @dev Ultra-fast decentralized exchange with AMM functionality
 * Features: Token swapping, liquidity provision, price discovery, fee collection
 */
contract Exchange {
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant DEFAULT_FEE = 30; // 0.3%
    uint256 public constant MAX_FEE = 1000; // 10%

    address public owner;
    address public feeRecipient;
    uint256 public defaultSwapFee;
    bool public paused;

    // Pool tracking
    mapping(bytes32 => address) public pools;
    mapping(address => bool) public isPool;
    address[] public allPools;

    // Fee overrides for specific pairs
    mapping(bytes32 => uint256) public customFees;

    // Events
    event PoolCreated(
        address indexed token0,
        address indexed token1,
        address pool,
        uint256 poolIndex
    );
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event CustomFeeSet(
        address indexed token0,
        address indexed token1,
        uint256 fee
    );

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier notPaused() {
        require(!paused, "Exchange is paused");
        _;
    }

    /**
     * @dev Constructor
     * @param _feeRecipient Address to receive trading fees
     */
    constructor(address _feeRecipient) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        owner = msg.sender;
        feeRecipient = _feeRecipient;
        defaultSwapFee = DEFAULT_FEE;
    }

    /**
     * @dev Create a new liquidity pool for token pair
     * @param tokenA Address of first token
     * @param tokenB Address of second token
     * @return pool Address of created pool
     */
    function createPool(
        address tokenA,
        address tokenB
    ) external returns (address pool) {
        require(tokenA != tokenB, "Identical tokens");
        require(tokenA != address(0) && tokenB != address(0), "Zero address");

        // Ensure token0 < token1 for consistent pair ordering
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        bytes32 pairHash = keccak256(abi.encodePacked(token0, token1));

        require(pools[pairHash] == address(0), "Pool already exists");

        // Create new liquidity pool
        pool = address(new LiquidityPool(token0, token1, address(this)));

        pools[pairHash] = pool;
        isPool[pool] = true;
        allPools.push(pool);

        emit PoolCreated(token0, token1, pool, allPools.length - 1);
    }

    /**
     * @dev Get pool address for token pair
     * @param tokenA Address of first token
     * @param tokenB Address of second token
     * @return pool Address of the pool (address(0) if doesn't exist)
     */
    function getPool(
        address tokenA,
        address tokenB
    ) public view returns (address pool) {
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        bytes32 pairHash = keccak256(abi.encodePacked(token0, token1));
        return pools[pairHash];
    }

    /**
     * @dev Swap tokens using AMM
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input tokens
     * @param minAmountOut Minimum amount of output tokens expected
     * @param recipient Address to receive output tokens
     * @param deadline Transaction deadline timestamp
     * @return amountOut Actual amount of output tokens received
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external notPaused returns (uint256 amountOut) {
        require(deadline >= block.timestamp, "Transaction expired");
        require(amountIn > 0, "Invalid input amount");
        require(recipient != address(0), "Invalid recipient");

        address pool = getPool(tokenIn, tokenOut);
        require(pool != address(0), "Pool does not exist");

        // Calculate output amount
        amountOut = getAmountOut(amountIn, tokenIn, tokenOut);
        require(amountOut >= minAmountOut, "Insufficient output amount");

        // Calculate fee
        uint256 fee = calculateFee(tokenIn, tokenOut, amountIn);
        uint256 amountInAfterFee = amountIn - fee;

        // Transfer input tokens from user to pool
        IERC20(tokenIn).transferFrom(msg.sender, pool, amountInAfterFee);

        // Transfer fee to fee recipient
        if (fee > 0) {
            IERC20(tokenIn).transferFrom(msg.sender, feeRecipient, fee);
        }

        // Execute swap through pool
        LiquidityPool(pool).swap(
            tokenIn,
            tokenOut,
            amountInAfterFee,
            recipient
        );

        emit SwapExecuted(
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            fee
        );
    }

    /**
     * @dev Add liquidity to a token pair
     * @param tokenA Address of first token
     * @param tokenB Address of second token
     * @param amountADesired Desired amount of tokenA
     * @param amountBDesired Desired amount of tokenB
     * @param amountAMin Minimum amount of tokenA
     * @param amountBMin Minimum amount of tokenB
     * @param to Address to receive LP tokens
     * @param deadline Transaction deadline
     * @return amountA Actual amount of tokenA added
     * @return amountB Actual amount of tokenB added
     * @return liquidity Amount of LP tokens minted
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        notPaused
        returns (uint256 amountA, uint256 amountB, uint256 liquidity)
    {
        require(deadline >= block.timestamp, "Transaction expired");

        address pool = getPool(tokenA, tokenB);
        if (pool == address(0)) {
            pool = createPool(tokenA, tokenB);
        }

        // Calculate optimal amounts
        (amountA, amountB) = _calculateLiquidityAmounts(
            pool,
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );

        // Transfer tokens to pool
        IERC20(tokenA).transferFrom(msg.sender, pool, amountA);
        IERC20(tokenB).transferFrom(msg.sender, pool, amountB);

        // Mint LP tokens
        liquidity = LiquidityPool(pool).mint(to);
    }

    /**
     * @dev Remove liquidity from a token pair
     * @param tokenA Address of first token
     * @param tokenB Address of second token
     * @param liquidity Amount of LP tokens to burn
     * @param amountAMin Minimum amount of tokenA to receive
     * @param amountBMin Minimum amount of tokenB to receive
     * @param to Address to receive tokens
     * @param deadline Transaction deadline
     * @return amountA Amount of tokenA received
     * @return amountB Amount of tokenB received
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external notPaused returns (uint256 amountA, uint256 amountB) {
        require(deadline >= block.timestamp, "Transaction expired");

        address pool = getPool(tokenA, tokenB);
        require(pool != address(0), "Pool does not exist");

        // Transfer LP tokens to pool
        LiquidityPool(pool).transferFrom(msg.sender, pool, liquidity);

        // Burn LP tokens and receive underlying tokens
        (amountA, amountB) = LiquidityPool(pool).burn(to);

        require(amountA >= amountAMin, "Insufficient tokenA amount");
        require(amountB >= amountBMin, "Insufficient tokenB amount");
    }

    /**
     * @dev Calculate output amount for a swap
     * @param amountIn Input amount
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @return amountOut Output amount
     */
    function getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) public view returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid input amount");

        address pool = getPool(tokenIn, tokenOut);
        require(pool != address(0), "Pool does not exist");

        return LiquidityPool(pool).getAmountOut(amountIn, tokenIn);
    }

    /**
     * @dev Get current exchange rate between tokens
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return rate Exchange rate (tokenA per tokenB * 1e18)
     */
    function getExchangeRate(
        address tokenA,
        address tokenB
    ) external view returns (uint256 rate) {
        address pool = getPool(tokenA, tokenB);
        if (pool == address(0)) return 0;

        return LiquidityPool(pool).getExchangeRate(tokenA, tokenB);
    }

    /**
     * @dev Calculate trading fee for a swap
     * @param tokenA First token address
     * @param tokenB Second token address
     * @param amountIn Input amount
     * @return fee Fee amount
     */
    function calculateFee(
        address tokenA,
        address tokenB,
        uint256 amountIn
    ) public view returns (uint256 fee) {
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        bytes32 pairHash = keccak256(abi.encodePacked(token0, token1));

        uint256 feeRate = customFees[pairHash];
        if (feeRate == 0) {
            feeRate = defaultSwapFee;
        }

        fee = (amountIn * feeRate) / BASIS_POINTS;
    }

    /**
     * @dev Calculate optimal liquidity amounts
     */
    function _calculateLiquidityAmounts(
        address pool,
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal view returns (uint256 amountA, uint256 amountB) {
        (uint256 reserveA, uint256 reserveB) = LiquidityPool(pool).getReserves(
            tokenA,
            tokenB
        );

        if (reserveA == 0 && reserveB == 0) {
            // First liquidity provision
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = (amountADesired * reserveB) / reserveA;
            if (amountBOptimal <= amountBDesired) {
                require(
                    amountBOptimal >= amountBMin,
                    "Insufficient tokenB amount"
                );
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = (amountBDesired * reserveA) / reserveB;
                require(
                    amountAOptimal >= amountAMin,
                    "Insufficient tokenA amount"
                );
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    /**
     * @dev Set custom fee for a token pair (owner only)
     * @param tokenA First token address
     * @param tokenB Second token address
     * @param fee Fee in basis points
     */
    function setCustomFee(
        address tokenA,
        address tokenB,
        uint256 fee
    ) external onlyOwner {
        require(fee <= MAX_FEE, "Fee too high");

        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        bytes32 pairHash = keccak256(abi.encodePacked(token0, token1));

        customFees[pairHash] = fee;
        emit CustomFeeSet(token0, token1, fee);
    }

    /**
     * @dev Set default swap fee (owner only)
     * @param fee New default fee in basis points
     */
    function setDefaultFee(uint256 fee) external onlyOwner {
        require(fee <= MAX_FEE, "Fee too high");

        uint256 oldFee = defaultSwapFee;
        defaultSwapFee = fee;

        emit FeeUpdated(oldFee, fee);
    }

    /**
     * @dev Set fee recipient (owner only)
     * @param _feeRecipient New fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Pause/unpause exchange (owner only)
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    /**
     * @dev Get total number of pools
     */
    function getTotalPools() external view returns (uint256) {
        return allPools.length;
    }

    /**
     * @dev Get pool information by index
     * @param index Pool index
     * @return pool Pool address
     * @return token0 First token address
     * @return token1 Second token address
     * @return reserve0 Reserve of token0
     * @return reserve1 Reserve of token1
     */
    function getPoolByIndex(
        uint256 index
    )
        external
        view
        returns (
            address pool,
            address token0,
            address token1,
            uint256 reserve0,
            uint256 reserve1
        )
    {
        require(index < allPools.length, "Index out of bounds");

        pool = allPools[index];
        LiquidityPool poolContract = LiquidityPool(pool);

        token0 = poolContract.token0();
        token1 = poolContract.token1();
        (reserve0, reserve1, ) = poolContract.getReserves();
    }

    /**
     * @dev Emergency withdrawal function (owner only)
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }
}
