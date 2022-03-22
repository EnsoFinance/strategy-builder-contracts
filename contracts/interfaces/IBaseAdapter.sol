//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0 <0.9.0;

interface IBaseAdapter {
    function swap(
        uint256 amount,
        uint256 expected,
        address tokenIn,
        address tokenOut,
        address from,
        address to
    ) external;

    function spotPrice(
        uint256 amount,
        address tokenIn,
        address tokenOut
    ) external returns (uint256);
}
