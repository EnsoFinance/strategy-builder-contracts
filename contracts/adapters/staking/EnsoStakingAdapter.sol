//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "../BaseAdapter.sol";
import "../../libraries/SafeERC20.sol";
import "../../interfaces/IRewardsAdapter.sol";
import "../../interfaces/IStaking.sol";
import "../../interfaces/IStakedEnso.sol";

contract EnsoStakingAdapter is BaseAdapter, IRewardsAdapter {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public immutable staking;
    address public immutable stakedToken;
    address public immutable distributionToken;

    event RewardsClaimed(address from, address to, address token, uint256 amount);

    constructor(
        address staking_,
        address stakedToken_,
        address distributionToken_,
        address weth_
    ) BaseAdapter(weth_) public {
        staking = staking_;
        stakedToken = stakedToken_;
        distributionToken = distributionToken_;
    }

    // @dev: stakes and unstakes stakedToken on behalf of `to`
    function swap(
        uint256 amount,
        uint256 expected,
        address tokenIn,
        address tokenOut,
        address from,
        address to
    ) public override {
        require(tokenIn != tokenOut, "swap: tokens cannot match.");
        if (tokenIn == stakedToken) {
            require(tokenOut == distributionToken, "swap: invalid `tokenOut`.");
            if (from != address(this))
              IERC20(tokenIn).safeTransferFrom(from, address(this), amount);
            uint256 toBalanceBefore = IERC20(tokenOut).balanceOf(to);
            uint256 toBalanceAfter;
            uint256 difference;
            IERC20(tokenIn).approve(staking, uint256(-1));
            if (IStaking(staking).isStaker(to)) {
                IStaking(staking).restakeFor(to, SafeCast.toUint128(amount));
            } else {
                IStaking(staking).stakeFor(to, SafeCast.toUint128(amount));
            }
            IERC20(tokenIn).approve(staking, uint256(0));
            toBalanceAfter = IERC20(tokenOut).balanceOf(to);
            difference = toBalanceAfter.sub(toBalanceBefore);
            require(difference >= expected, "swap: Insufficient tokenOut amount");
        } else if (tokenIn == distributionToken) {
            require(tokenOut == stakedToken, "swap: invalid `tokenOut`.");
            /*
               stakedEnso doesn't need to be transferred in since it will
               be burnt from the beneficiary on `unstakeFor`
             */
            uint256 ensoAmount = amount.mul(uint256(IStakedEnso(tokenIn).maxHours())).div(3);
            uint256 fromBalanceBefore = IERC20(tokenOut).balanceOf(from);
            IStaking(staking).unstakeFor(from, SafeCast.toUint128(ensoAmount));
            uint256 fromBalanceAfter = IERC20(tokenOut).balanceOf(from);
            uint256 difference = fromBalanceAfter.sub(fromBalanceBefore);
            require(difference >= expected, "swap: Insufficient tokenOut amount");
            if (to != from)
              IERC20(tokenOut).transferFrom(from, to, difference);
        } else {
            revert("swap: token not supported.");
        }
    }

    // Intended to be called via delegateCall
    function claim(address token) external override {
      uint256 owed = IStaking(staking).claim();
      emit RewardsClaimed(staking, address(this), token, owed);
    }

}
