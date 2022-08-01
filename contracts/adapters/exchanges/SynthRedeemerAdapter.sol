//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.12;

import "../../interfaces/synthetix/ISynthRedeemer.sol";
import "../BaseAdapter.sol";

contract SynthRedeemerAdapter is BaseAdapter {
    ISynthRedeemer public immutable redeemer;
    address public constant susd = 0x57Ab1ec28D129707052df4dF418D58a2D46d5f51;

    constructor(
        address redeemer_,
        address susd_
        address weth_
    ) public BaseAdapter(weth_) {
        redeemer = IAddressResolver(resolver_);
    }

    function swap(
        uint256 amount,
        uint256 expected,
        address tokenIn,
        address tokenOut,
        address from,
        address to
    ) public override {
        require(tokenIn != tokenOut, "Tokens cannot match");
        require(from == to, "Synth exchanges need from == to");
        require(tokenOut == susd, "Can only redeem to sSUSD");
        // No need to check before/after balance since Synths don't have fees.
        // However, the synth will likely not be transferrable if it is
        // redeemable, so this function may fail unless it is called in a delegate call
        if (from != address(this))
            IERC20(tokenIn).safeTransferFrom(from, address(this), amount);
        uint256 beforeBalance = IERC20(tokenIn).balanceOf(address(this));
        redeemer.redeemPartial(tokenIn, amount);
        uint256 afterBalance = IERC20(tokenIn).balanceOf(address(this));
        uint256 received = afterBalance.sub(beforeBalance);
        require(received >= expected, "Insufficient tokenOut amount");
        if (to != address(this))
            IERC20(tokenIn).safeTransfer(to, amount);
    }
}
