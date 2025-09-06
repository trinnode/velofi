// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC20 Interface
 * @dev Standard ERC20 interface for token interactions
 */
interface IERC20 {
    /**
     * @dev Returns the total token supply
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the account balance of another account with address `account`
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Transfers `amount` tokens to address `to`, and MUST fire the Transfer event
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev Returns the amount which `spender` is still allowed to withdraw from `owner`
     */
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    /**
     * @dev Allows `spender` to withdraw from your account multiple times, up to the `amount`
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Transfers `amount` tokens from address `from` to address `to`
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    /**
     * @dev MUST trigger when tokens are transferred, including zero value transfers
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev MUST trigger on any successful call to approve
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}
