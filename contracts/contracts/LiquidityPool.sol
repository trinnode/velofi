// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Interfaces/IERC20.sol";

/**
 * @title LiquidityPool Contract
 * @dev AMM liquidity pool for token pairs with LP token functionality
 * Features: Liquidity provision, automated market making, LP tokens, fee collection
 */
contract LiquidityPool {
    string public constant name = "VeloFi LP Token";
    string public constant symbol = "VLFI-LP";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    address public immutable token0;
    address public immutable token1;
    address public immutable exchange;

    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public blockTimestampLast;

    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    uint256 public kLast;

    uint256 private unlocked = 1;
    uint256 public constant MINIMUM_LIQUIDITY = 10 ** 3;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        address indexed to
    );
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    // Modifiers
    modifier lock() {
        require(unlocked == 1, "Pool: LOCKED");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    modifier onlyExchange() {
        require(msg.sender == exchange, "Only exchange can call");
        _;
    }

    /**
     * @dev Constructor
     * @param _token0 Address of first token
     * @param _token1 Address of second token
     * @param _exchange Address of the exchange contract
     */
    constructor(address _token0, address _token1, address _exchange) {
        token0 = _token0;
        token1 = _token1;
        exchange = _exchange;
    }

    /**
     * @dev Update reserves and price accumulators
     * @param balance0 Current balance of token0
     * @param balance1 Current balance of token1
     * @param _reserve0 Previous reserve of token0
     * @param _reserve1 Previous reserve of token1
     */
    function _update(
        uint256 balance0,
        uint256 balance1,
        uint256 _reserve0,
        uint256 _reserve1
    ) private {
        require(
            balance0 <= type(uint112).max && balance1 <= type(uint112).max,
            "Pool: OVERFLOW"
        );

        uint256 blockTimestamp = block.timestamp % 2 ** 32;
        uint256 timeElapsed = blockTimestamp - blockTimestampLast;

        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            price0CumulativeLast +=
                ((_reserve1 * 1e18) / _reserve0) *
                timeElapsed;
            price1CumulativeLast +=
                ((_reserve0 * 1e18) / _reserve1) *
                timeElapsed;
        }

        reserve0 = balance0;
        reserve1 = balance1;
        blockTimestampLast = blockTimestamp;

        emit Sync(uint112(balance0), uint112(balance1));
    }

    /**
     * @dev Mint LP tokens for liquidity provision
     * @param to Address to receive LP tokens
     * @return liquidity Amount of LP tokens minted
     */
    function mint(
        address to
    ) external lock onlyExchange returns (uint256 liquidity) {
        uint256 _reserve0 = reserve0;
        uint256 _reserve1 = reserve1;
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        uint256 _totalSupply = totalSupply;
        if (_totalSupply == 0) {
            liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
        } else {
            liquidity = min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
        }

        require(liquidity > 0, "Pool: INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);

        kLast = reserve0 * reserve1;
        emit Mint(msg.sender, amount0, amount1);
    }

    /**
     * @dev Burn LP tokens and withdraw liquidity
     * @param to Address to receive underlying tokens
     * @return amount0 Amount of token0 returned
     * @return amount1 Amount of token1 returned
     */
    function burn(
        address to
    ) external lock onlyExchange returns (uint256 amount0, uint256 amount1) {
        uint256 _reserve0 = reserve0;
        uint256 _reserve1 = reserve1;
        address _token0 = token0;
        address _token1 = token1;
        uint256 balance0 = IERC20(_token0).balanceOf(address(this));
        uint256 balance1 = IERC20(_token1).balanceOf(address(this));
        uint256 liquidity = balanceOf[address(this)];

        uint256 _totalSupply = totalSupply;
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;

        require(
            amount0 > 0 && amount1 > 0,
            "Pool: INSUFFICIENT_LIQUIDITY_BURNED"
        );

        _burn(address(this), liquidity);
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);

        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));

        _update(balance0, balance1, _reserve0, _reserve1);

        kLast = reserve0 * reserve1;
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /**
     * @dev Execute a token swap
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input tokens
     * @param to Address to receive output tokens
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address to
    ) external lock onlyExchange {
        require(tokenIn == token0 || tokenIn == token1, "Invalid input token");
        require(
            tokenOut == token0 || tokenOut == token1,
            "Invalid output token"
        );
        require(tokenIn != tokenOut, "Identical tokens");
        require(to != token0 && to != token1, "Pool: INVALID_TO");

        uint256 amount0Out;
        uint256 amount1Out;

        if (tokenIn == token0) {
            amount1Out = getAmountOut(amountIn, token0);
            amount0Out = 0;
        } else {
            amount0Out = getAmountOut(amountIn, token1);
            amount1Out = 0;
        }

        require(
            amount0Out > 0 || amount1Out > 0,
            "Pool: INSUFFICIENT_OUTPUT_AMOUNT"
        );
        require(
            amount0Out < reserve0 && amount1Out < reserve1,
            "Pool: INSUFFICIENT_LIQUIDITY"
        );

        uint256 balance0;
        uint256 balance1;

        // Transfer output tokens
        if (amount0Out > 0) _safeTransfer(token0, to, amount0Out);
        if (amount1Out > 0) _safeTransfer(token1, to, amount1Out);

        balance0 = IERC20(token0).balanceOf(address(this));
        balance1 = IERC20(token1).balanceOf(address(this));

        uint256 amount0In = balance0 > reserve0 - amount0Out
            ? balance0 - (reserve0 - amount0Out)
            : 0;
        uint256 amount1In = balance1 > reserve1 - amount1Out
            ? balance1 - (reserve1 - amount1Out)
            : 0;

        require(
            amount0In > 0 || amount1In > 0,
            "Pool: INSUFFICIENT_INPUT_AMOUNT"
        );

        // Apply 0.3% trading fee and ensure k constraint
        uint256 balance0Adjusted = balance0 * 1000 - amount0In * 3;
        uint256 balance1Adjusted = balance1 * 1000 - amount1In * 3;
        require(
            balance0Adjusted * balance1Adjusted >=
                reserve0 * reserve1 * (1000 ** 2),
            "Pool: K"
        );

        _update(balance0, balance1, reserve0, reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    /**
     * @dev Calculate output amount for a given input
     * @param amountIn Input amount
     * @param tokenIn Input token address
     * @return amountOut Output amount
     */
    function getAmountOut(
        uint256 amountIn,
        address tokenIn
    ) public view returns (uint256 amountOut) {
        require(amountIn > 0, "Pool: INSUFFICIENT_INPUT_AMOUNT");
        require(reserve0 > 0 && reserve1 > 0, "Pool: INSUFFICIENT_LIQUIDITY");

        uint256 reserveIn;
        uint256 reserveOut;

        if (tokenIn == token0) {
            reserveIn = reserve0;
            reserveOut = reserve1;
        } else {
            require(tokenIn == token1, "Pool: INVALID_TOKEN");
            reserveIn = reserve1;
            reserveOut = reserve0;
        }

        uint256 amountInWithFee = amountIn * 997; // 0.3% fee
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /**
     * @dev Get current reserves for specific token order
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return reserveA Reserve of tokenA
     * @return reserveB Reserve of tokenB
     */
    function getReserves(
        address tokenA,
        address tokenB
    ) public view returns (uint256 reserveA, uint256 reserveB) {
        if (tokenA == token0) {
            (reserveA, reserveB) = (reserve0, reserve1);
        } else {
            require(
                tokenA == token1 && tokenB == token0,
                "Pool: INVALID_TOKENS"
            );
            (reserveA, reserveB) = (reserve1, reserve0);
        }
    }

    /**
     * @dev Get current reserves (standard order)
     * @return _reserve0 Reserve of token0
     * @return _reserve1 Reserve of token1
     * @return _blockTimestampLast Last update timestamp
     */
    function getReserves()
        public
        view
        returns (
            uint256 _reserve0,
            uint256 _reserve1,
            uint256 _blockTimestampLast
        )
    {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    /**
     * @dev Get exchange rate between two tokens
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return rate Exchange rate (tokenA per tokenB * 1e18)
     */
    function getExchangeRate(
        address tokenA,
        address tokenB
    ) external view returns (uint256 rate) {
        (uint256 reserveA, uint256 reserveB) = getReserves(tokenA, tokenB);
        if (reserveA == 0 || reserveB == 0) return 0;
        rate = (reserveA * 1e18) / reserveB;
    }

    // LP Token functions
    function _mint(address to, uint256 value) internal {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint256 value) internal {
        balanceOf[from] -= value;
        totalSupply -= value;
        emit Transfer(from, address(0), value);
    }

    function _approve(address owner, address spender, uint256 value) private {
        allowance[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    function _transfer(address from, address to, uint256 value) private {
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool) {
        if (allowance[from][msg.sender] != type(uint256).max) {
            allowance[from][msg.sender] -= value;
        }
        _transfer(from, to, value);
        return true;
    }

    // Utility functions
    function _safeTransfer(address token, address to, uint256 value) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "Pool: TRANSFER_FAILED"
        );
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }
}
