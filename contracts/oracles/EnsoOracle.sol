//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IOracle.sol";
import "../interfaces/IRewardsEstimator.sol";
import "../helpers/StrategyTypes.sol";

contract EnsoOracle is IOracle, StrategyTypes {
    using SafeMath for uint256;
    using SignedSafeMath for int256;

    address public immutable override weth;
    address public immutable override susd;
    ITokenRegistry public immutable override tokenRegistry;

    event NewPrice(address token, uint256 price);

    constructor(
        address tokenRegistry_,
        address weth_,
        address susd_
    ) public {
        tokenRegistry = ITokenRegistry(tokenRegistry_);
        weth = weth_;
        susd = susd_;
    }

    function estimateStrategy(IStrategy strategy) public view override returns (uint256[] memory, int256[] memory) {
        address[] memory strategyItems = strategy.items();
        address[] memory strategyDebt = strategy.debt();
        int256 total = int256(IERC20(weth).balanceOf(address(strategy))); //WETH is never part of items array but always included in total value
        int256[] memory estimates = new int256[](strategyItems.length + strategyDebt.length + 1); // +1 for virtual item
        for (uint256 i; i < strategyItems.length; ++i) {
            int256 estimate = estimateItem(
                address(strategy),
                strategyItems[i]
            );
            total = total.add(estimate);
            estimates[i] = estimate;
        }
        for (uint256 i; i < strategyDebt.length; ++i) {
            int256 estimate = estimateItem(
                address(strategy),
                strategyDebt[i]
            );
            total = total.add(estimate);
            estimates[i + strategyItems.length] = estimate;
        }
        address[] memory strategySynths = strategy.synths();
        if (strategySynths.length > 0) {
            // All synths rely on the chainlink oracle
            IEstimator chainlinkEstimator = tokenRegistry.estimators(uint256(EstimatorCategory.CHAINLINK_ORACLE));
            int256 estimate;
            for (uint256 i; i < strategySynths.length; ++i) {
                estimate = estimate.add(chainlinkEstimator.estimateItem(
                    address(strategy),
                    strategySynths[i]
                ));
            }
            estimate = estimate.add(chainlinkEstimator.estimateItem(
                IERC20(susd).balanceOf(address(strategy)),
                susd
            )); //SUSD is never part of synths array but always included in total value
            total = total.add(estimate);
            estimates[estimates.length - 1] = estimate; //Synths' estimates are pooled together in the virtual item address
        }
        int256 grandTotal = total.add(_estimateStrategyRewards(strategy));
        require(total >= 0 && grandTotal >= 0, "Negative total");
        uint256[] memory totals = new uint256[](2);
        totals[0] = uint256(grandTotal);
        totals[1] = uint256(total);
        return (totals, estimates);
    }

    function estimateStrategyRewards(IStrategy strategy) public view /*override*/ returns (int256) {
        return _estimateStrategyRewards(strategy);
    }

    function _estimateStrategyRewards(IStrategy strategy) private view /*override*/ returns (int256) {
        address[] memory strategyClaimables = strategy.claimables();
        Claimable memory claimableData;
        address[] memory tokens;
        address token;
        int256 total;
        address rewardsAdapter;
        for (uint256 i; i < strategyClaimables.length; ++i) { // claimed
            claimableData = strategy.claimableData(strategyClaimables[i]);
            // estimate claimed
            tokens = claimableData.rewardsTokens;
            for (uint256 j; j < tokens.length; ++j) {
                token = tokens[j];
                total = total.add(estimateItem(IERC20(token).balanceOf(address(strategy)), token)); 
            } 
            // estimate unclaimed
            tokens = claimableData.tokens;
            for (uint256 j; j < tokens.length; ++j) {
                total = total.add(estimateUnclaimedRewards(address(strategy), tokens[j]));
            } 
        }
        return total;
    }

    function estimateItem(uint256 balance, address token) public view override returns (int256) {
        return tokenRegistry.getEstimator(token).estimateItem(balance, token);
    }

    function estimateItem(address user, address token) public view override returns (int256) {
        return tokenRegistry.getEstimator(token).estimateItem(user, token);
    }

    function estimateUnclaimedRewards(address user, address token) public view override returns (int256) {
        return IRewardsEstimator(address(tokenRegistry.getEstimator(token))).estimateUnclaimedRewards(user, token);
    }

    function estimateStrategies(IStrategy[] memory strategies) external view returns (uint256[] memory, uint256[] memory) {
        uint256[] memory grandTotals = new uint256[](strategies.length);
        uint256[] memory retTotals = new uint256[](strategies.length);
        for (uint256 i; i < strategies.length; ++i) {
            (uint256[] memory totals, ) = estimateStrategy(strategies[i]);
            grandTotals[i] = totals[0];
            retTotals[i] = totals[1];
        }
        return (grandTotals, retTotals);
    }
}
