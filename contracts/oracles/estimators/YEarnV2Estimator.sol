//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../../interfaces/IEstimator.sol";
import "../../interfaces/IOracle.sol";
import "../../interfaces/IERC20NonStandard.sol";
import "../../interfaces/yearn/IYEarnV2Vault.sol";

contract YEarnV2Estimator is IEstimator {
    using SafeMath for uint256;

    function estimateItem(
        IStrategy strategy,
        address token
    ) public view override returns (int256) {
        uint256 balance = IERC20(token).balanceOf(address(strategy));
        return estimateItem(strategy, token, balance);
    }

    function estimateItem(
        IStrategy strategy,
        address token,
        uint256 balance
    ) public view override returns (int256) {
        address underlyingToken = address(IYEarnV2Vault(token).token());
        uint256 share = balance.mul(IYEarnV2Vault(token).pricePerShare()) / 10**uint256(IERC20NonStandard(token).decimals());
        return IOracle(msg.sender).estimateItem(strategy, underlyingToken, share);
    }
}
