// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IDex Interface
 * @dev Interface for decentralized exchange functionality
 */
interface IDex {
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        address recipient;
        uint256 deadline;
    }

    struct Pool {
        address token0;
        address token1;
        uint256 reserve0;
        uint256 reserve1;
        uint256 totalSupply;
        uint256 fee; // Fee in basis points (e.g., 30 = 0.3%)
    }

    /**
     * @dev Swap tokens with specified parameters
     */
    function swap(
        SwapParams calldata params
    ) external returns (uint256 amountOut);

    /**
     * @dev Add liquidity to a token pair
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
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    /**
     * @dev Remove liquidity from a token pair
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    /**
     * @dev Get pool information for a token pair
     */
    function getPool(
        address tokenA,
        address tokenB
    ) external view returns (Pool memory);

    /**
     * @dev Calculate output amount for a given input
     */
    function getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external view returns (uint256 amountOut);

    /**
     * @dev Get current exchange rate between two tokens
     */
    function getExchangeRate(
        address tokenA,
        address tokenB
    ) external view returns (uint256 rate);

    // Events
    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    event LiquidityAdded(
        address indexed user,
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    event LiquidityRemoved(
        address indexed user,
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
}
