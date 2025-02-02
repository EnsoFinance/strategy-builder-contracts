//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../../libraries/SafeERC20.sol";
import "../../interfaces/IRewardsAdapter.sol";
import "../../interfaces/compound/ICToken.sol";
import "../../interfaces/compound/IComptroller.sol";
import "../ProtocolAdapter.sol";
import "../../helpers/StringUtils.sol";

contract CompoundAdapter is ProtocolAdapter, IRewardsAdapter, StringUtils {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IComptroller public immutable comptroller;

    constructor(
      address comptroller_,
      address weth_,
      address tokenRegistry_,
      uint256 categoryIndex_
    ) public ProtocolAdapter(weth_, tokenRegistry_, categoryIndex_) {
        comptroller = IComptroller(comptroller_);
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

        if (from != address(this)){
            uint256 beforeBalance = IERC20(tokenIn).balanceOf(address(this));
            IERC20(tokenIn).safeTransferFrom(from, address(this), amount);
            uint256 afterBalance = IERC20(tokenIn).balanceOf(address(this));
            require(afterBalance > beforeBalance, "No tokens transferred to adapter");
            amount = afterBalance - beforeBalance;
        }
        uint256 err;
        if (_checkToken(tokenOut)) {
            ICToken cToken = ICToken(tokenOut);
            require(cToken.underlying() == tokenIn, "Incompatible");
            IERC20(tokenIn).sortaSafeApprove(tokenOut, amount);
            err = cToken.mint(amount);
            require(IERC20(tokenIn).allowance(address(this), tokenOut) == 0, "Incomplete swap"); // sanity check
        } else {
            require(_checkToken(tokenIn), "No Compound token");
            ICToken cToken = ICToken(tokenIn);
            require(cToken.underlying() == tokenOut, "Incompatible");
            err = cToken.redeem(amount);
        }
        if (err != 0)
            revert(string(abi.encodePacked("swap: Compound error (", toString(err), ").")));
        uint256 received = IERC20(tokenOut).balanceOf(address(this));
        require(received >= expected, "Insufficient tokenOut amount");

        if (to != address(this))
            IERC20(tokenOut).safeTransfer(to, received);
    }

    // Intended to be called via delegateCall
    function claim(address[] calldata tokens) external override {
        comptroller.claimComp(address(this), tokens);
    }

    function rewardsTokens(address token) external view override returns(address[] memory) {
        token; // shh baby compiler
        address[] memory ret = new address[](1);
        ret[0] = comptroller.getCompAddress();
        return ret;
    }
}
