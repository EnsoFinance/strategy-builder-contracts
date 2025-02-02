//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./IStrategyFees.sol";
import "./IStrategyToken.sol";
import "./IStrategyManagement.sol";
import "./IOracle.sol";
import "./IWhitelist.sol";

interface IStrategy is IStrategyFees, IStrategyToken, IStrategyManagement {

    event Withdraw(address indexed account, uint256 amount, uint256[] amounts);
    event UpdateManager(address manager);
    event ClaimablesUpdated();
    event RewardsUpdated();
    event RewardsClaimed(address indexed adapter, address[] indexed tokens);
    event VersionUpdated(string indexed newVersion);

    function approveToken(
        address token,
        address account,
        uint256 amount
    ) external;

    function approveTokens(
        address[] memory tokens,
        address account,
        uint256 amount
    ) external;

    function approveDebt(
        address[] memory tokens,
        address account,
        uint256 amount
    ) external;

    function approveSynths(
        address account,
        uint256 amount
    ) external;

    function setStructure(StrategyItem[] memory newItems) external;

    function setRouter(address router) external;

    function setCollateral(address token) external;

    function claimAll() external;

    function withdrawAll(uint256 amount) external;

    function mint(address account, uint256 amount) external;

    function burn(address account, uint256 amount) external returns (uint256);

    function delegateSwap(
        address adapter,
        uint256 amount,
        address tokenIn,
        address tokenOut
    ) external;

    function settleSynths() external;

    function updateRebalanceThreshold(uint16 threshold) external;

    function updateTradeData(address item, TradeData memory data) external;

    function updateClaimables() external;

    function updateAddresses() external;

    function updateRewards() external;

    function lock(LockType lt) external;

    function unlock() external;

    function locked() external view returns (bool);

    function lockType() external view returns (LockType);

    function items() external view returns (address[] memory);

    function synths() external view returns (address[] memory);

    function debt() external view returns (address[] memory);

    function rebalanceThreshold() external view returns (uint256);

    function getPercentage(address item) external view returns (int256);

    function getTradeData(address item) external view returns (TradeData memory);

    function supportsSynths() external view returns (bool);

    function supportsDebt() external view returns (bool);

    function factory() external view returns (address);

    function getAllRewardTokens() external view returns(address[] memory rewardTokens);
}
