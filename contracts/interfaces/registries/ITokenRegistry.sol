//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "../IEstimator.sol";
import "../../helpers/StrategyTypes.sol";

interface ITokenRegistry {

    event EstimatorAdded(address estimator, uint256 estimatorCategoryIndex);
    event ItemAdded(address token, uint256 itemCategoryIndex, uint256 estimatorCategoryIndex);

    struct ItemDetails {
        StrategyTypes.TradeData tradeData;
        address rewardsAdapter;
    }

    function itemCategories(address token) external view returns (uint256);

    function estimatorCategories(address token) external view returns (uint256);

    function estimators(uint256 categoryIndex) external view returns (IEstimator);

    function itemDetails(address item) external view returns(ItemDetails memory);

    function isClaimable(address item) external view returns(bool);

    function getEstimator(address token) external view returns (IEstimator);

    function addEstimator(uint256 estimatorCategoryIndex, address estimator) external;

    function addItem(uint256 itemCategoryIndex, uint256 estimatorCategoryIndex, address token) external;

    function addItemDetailed(
        uint256 itemCategoryIndex,
        uint256 estimatorCategoryIndex,
        address token,
        StrategyTypes.TradeData memory tradeData,
        address rewardsAdapter
    ) external;

    function addItems(
        uint256[] calldata itemCategoryIndexes,
        uint256[] calldata estimatorCategoryIndexes,
        address[] calldata tokens
    ) external;

    function addItemsDetailed(
        uint256[] calldata itemCategoryIndexes,
        uint256[] calldata estimatorCategoryIndexes,
        address[] calldata tokens,
        StrategyTypes.TradeData[] memory tradesData,
        address[] calldata rewardsAdapters
    ) external;
}
