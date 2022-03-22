//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0 <0.9.0;

interface IEstimator {
    function estimateItem(
        uint256 balance,
        address token
    ) external returns (int256);

    function estimateItem(
        address user,
        address token
    ) external returns (int256);
}
