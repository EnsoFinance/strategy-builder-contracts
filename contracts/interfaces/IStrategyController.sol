//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./IStrategy.sol";
import "./IStrategyRouter.sol";
import "./IOracle.sol";
import "./IWhitelist.sol";
import "../helpers/StrategyTypes.sol";

interface IStrategyController is StrategyTypes {
    function setupStrategy(
        address manager_,
        address strategy_,
        StrategyState memory state_,
        address router_,
        bytes memory data_
    ) external payable;

    function rebalance(
        IStrategy strategy,
        IStrategyRouter router,
        bytes memory data
    ) external;

    function restructure(
        IStrategy strategy,
        StrategyItem[] memory strategyItems
    ) external;

    function finalizeStructure(
        IStrategy strategy,
        IStrategyRouter router,
        bytes memory data
    ) external;

    function updateValue(
        IStrategy strategy,
        TimelockCategory category,
        uint256 newValue
    ) external;

    function finalizeValue(address strategy) external;

    function withdrawPerformanceFee(IStrategy strategy) external;

    function openStrategy(IStrategy strategy, uint256 fee) external;

    function initialized(address strategy) external view returns (bool);

    function social(address strategy) external view returns (bool);

    function rebalanceThreshold(address strategy) external view returns (uint256);

    function slippage(address strategy) external view returns (uint256);

    function timelock(address strategy) external view returns (uint256);

    function performanceFee(address strategy) external view returns (uint256);

    function verifyStructure(address strategy, StrategyItem[] memory newItems)
        external
        view
        returns (bool);

    function oracle() external view returns (IOracle);

    function whitelist() external view returns (IWhitelist);
}
