//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0 <0.9.0;

interface IRewardsAdapter {
    function claim(address[] memory token) external;

    function rewardsTokens(address token) external view returns(address[] memory);
}
