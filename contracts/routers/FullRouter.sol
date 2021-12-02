//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "../interfaces/IBaseAdapter.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/aave/ILendingPool.sol";
import "../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../libraries/StrategyLibrary.sol";
import "./StrategyRouter.sol";

contract FullRouter is StrategyTypes, StrategyRouter {
    using SafeMath for uint256;
    using SignedSafeMath for int256;

    uint256 internal constant LTV_DIVISOR = 10000;

    ILendingPoolAddressesProvider public addressesProvider;
    address public susd;
    mapping(address => mapping(address => int256)) private _tempEstimate;

    constructor(address addressesProvider_, address controller_) public StrategyRouter(RouterCategory.LOOP, controller_) {
        addressesProvider = ILendingPoolAddressesProvider(addressesProvider_);
        susd = controller.oracle().susd();
    }

    function deposit(address strategy, bytes calldata data)
        external
        override
        onlyController
    {
        (address depositor, uint256 amount) =
            abi.decode(data, (address, uint256));
        address[] memory strategyItems = IStrategy(strategy).items();
        address[] memory strategyDebt = IStrategy(strategy).debt();
        int256[] memory estimates = new int256[](strategyItems.length + strategyDebt.length + 1);
        _batchBuy(
          strategy,
          depositor,
          amount,
          estimates,
          strategyItems,
          strategyDebt
        );
    }

    function withdraw(address strategy, bytes calldata data)
        external
        override
        onlyController
    {
        (uint256 percentage, uint256 total, int256[] memory estimates) =
            abi.decode(data, (uint256, uint256, int256[]));

        uint256 expectedWeth = total.mul(percentage).div(10**18);
        total = total.sub(expectedWeth);

        address[] memory strategyItems = IStrategy(strategy).items();
        {
            address[] memory strategyDebt = IStrategy(strategy).debt();
            // Deleverage debt
            for (uint256 i = 0; i < strategyDebt.length; i++) {
                int256 estimatedValue = estimates[strategyItems.length + i];
                int256 expectedValue = StrategyLibrary.getExpectedTokenValue(total, strategy, strategyDebt[i]);
                if (estimatedValue < expectedValue) {
                    _repayPath(
                        IStrategy(strategy).getTradeData(strategyDebt[i]),
                        uint256(-estimatedValue.sub(expectedValue)),
                        total,
                        strategy
                    );
                }
            }
        }
        // Sell loop
        for (uint256 i = 0; i < strategyItems.length; i++) {
            int256 estimatedValue = estimates[i];
            if (_tempEstimate[strategy][strategyItems[i]] > 0) {
                estimatedValue = _tempEstimate[strategy][strategyItems[i]];
                delete _tempEstimate[strategy][strategyItems[i]];
            }
            int256 expectedValue = StrategyLibrary.getExpectedTokenValue(total, strategy, strategyItems[i]);
            if (estimatedValue > expectedValue) {
                TradeData memory tradeData = IStrategy(strategy).getTradeData(strategyItems[i]);
                _sellPath(
                    tradeData,
                    _pathPrice(tradeData, uint256(estimatedValue.sub(expectedValue)), strategyItems[i]),
                    strategyItems[i],
                    strategy
                );
            }
        }
    }

    function rebalance(address strategy, bytes calldata data) external override onlyController {
        (uint256 total, int256[] memory estimates) = abi.decode(data, (uint256, int256[]));
        address[] memory strategyItems = IStrategy(strategy).items();
        address[] memory strategyDebt = IStrategy(strategy).debt();
        // Deleverage debt
        for (uint256 i = 0; i < strategyDebt.length; i++) {
            _repayToken(
                strategy,
                strategyDebt[i],
                total,
                estimates[strategyItems.length + i]
            );
        }
        // Sell loop
        uint256[] memory buy = new uint256[](strategyItems.length);
        for (uint256 i = 0; i < strategyItems.length; i++) {
            address strategyItem = strategyItems[i];
            int256 estimate = estimates[i];
            if (_tempEstimate[strategy][strategyItem] > 0) {
                estimate = _tempEstimate[strategy][strategyItem];
                delete _tempEstimate[strategy][strategyItem];
            }
            int256 expected = StrategyLibrary.getExpectedTokenValue(total, strategy, strategyItem);
            if (!_sellToken(
                    strategy,
                    strategyItem,
                    estimate,
                    expected
                )
            ) buy[i] = 1;
        }
        // Buy loop
        for (uint256 i = 0; i < strategyItems.length; i++) {
            if (buy[i] == 1) {
                address strategyItem = strategyItems[i];
                int256 expected = StrategyLibrary.getExpectedTokenValue(total, strategy, strategyItem);
                _buyToken(
                    strategy,
                    strategy,
                    strategyItem,
                    estimates[i],
                    expected
                );
            }
        }
        if (IStrategy(strategy).supportsSynths()) _batchBuySynths(strategy, total);
        // Leverage debt
        for (uint256 i = 0; i < strategyDebt.length; i++) {
            _borrowToken(
                strategy,
                strategyDebt[i],
                total,
                estimates[strategyItems.length + i]
            );
        }
    }

    function restructure(address strategy, bytes calldata data)
        external
        override
        onlyController
    {
        (
          uint256 currentTotal,
          int256[] memory currentEstimates,
          address[] memory currentItems,
          address[] memory currentDebt
        ) = abi.decode(data, (uint256, int256[], address[], address[]));

        _batchSell(strategy, currentTotal, currentEstimates, currentItems, currentDebt);
        (uint256 newTotal, int256[] memory newEstimates) = IOracle(IStrategy(strategy).oracle()).estimateStrategy(IStrategy(strategy));
        address[] memory newItems = IStrategy(strategy).items();
        address[] memory newDebt = IStrategy(strategy).debt();
        _batchBuy(strategy, strategy, newTotal, newEstimates, newItems, newDebt);
    }

    function _batchSell(
        address strategy,
        uint256 total,
        int256[] memory estimates,
        address[] memory strategyItems,
        address[] memory strategyDebt
    ) internal {
        for (uint256 i = 0; i < strategyDebt.length; i++) {
            int256 estimate = estimates[strategyItems.length + i];
            //Repay all debt that has 0 percentage
            if (IStrategy(strategy).getPercentage(strategyDebt[i]) == 0) {
                _repayPath(
                    IStrategy(strategy).getTradeData(strategyDebt[i]),
                    uint256(-estimate),
                    total,
                    strategy
                );
            } else {
                //Only repay if above rebalance threshold
                _repayToken(
                    strategy,
                    strategyDebt[i],
                    total,
                    estimate
                );
            }
        }
        for (uint256 i = 0; i < strategyItems.length; i++) {
            // Convert funds into Ether
            address strategyItem = strategyItems[i];
            int256 estimate = estimates[i];
            if (_tempEstimate[strategy][strategyItem] > 0) {
                estimate = _tempEstimate[strategy][strategyItem];
                delete _tempEstimate[strategy][strategyItem];
            }
            if (IStrategy(strategy).getPercentage(strategyItem) == 0) {
                //Sell all tokens that have 0 percentage
                _sellPath(
                    IStrategy(strategy).getTradeData(strategyItem),
                    IERC20(strategyItem).balanceOf(strategy),
                    strategyItem,
                    strategy
                );
            } else {
                //Only sell if above rebalance threshold
                _sellToken(
                    strategy,
                    strategyItem,
                    estimate,
                    StrategyLibrary.getExpectedTokenValue(total, strategy, strategyItem)
                );
            }
        }
        if (IStrategy(strategy).supportsSynths()) {
            // Sell SUSD
            _sellToken(
                strategy,
                susd,
                estimates[estimates.length - 1], // Virtual item always at end of estimates
                StrategyLibrary.getExpectedTokenValue(total, strategy, address(-1))
            );
        }
    }

    function _batchBuy(
        address strategy,
        address from,
        uint256 total,
        int256[] memory estimates,
        address[] memory strategyItems,
        address[] memory strategyDebt
    ) internal {
        for (uint256 i = 0; i < strategyItems.length; i++) {
            address strategyItem = strategyItems[i];
            _buyToken(
                strategy,
                from,
                strategyItem,
                estimates[i],
                StrategyLibrary.getExpectedTokenValue(total, strategy, strategyItem)
            );
        }
        if (IStrategy(strategy).supportsSynths()) {
            // Purchase SUSD
            _buyToken(
                strategy,
                from,
                susd,
                estimates[estimates.length - 1],
                StrategyLibrary.getExpectedTokenValue(total, strategy, address(-1))
            );
            _batchBuySynths(strategy, total);
        }
        for (uint256 i = 0; i < strategyDebt.length; i++) {
            _borrowToken(
                strategy,
                strategyDebt[i],
                total,
                estimates[strategyItems.length + i]
            );
        }
        int256 percentage = IStrategy(strategy).getPercentage(weth);
        if (percentage > 0 && from != strategy) {
            if (from == address(this)) {
              // Send all WETH
              IERC20(weth).safeTransfer(strategy, IERC20(weth).balanceOf(from));
            } else {
              // Calculate remaining WETH
              // Since from is not address(this), we know this is a deposit, so estimated value not relevant
              uint256 amount =
                  total.mul(uint256(percentage))
                       .div(DIVISOR);
              IERC20(weth).safeTransferFrom(
                  from,
                  strategy,
                  amount
              );
            }
        }
    }

    function _batchBuySynths(address strategy, uint256 total) internal {
        // Use SUSD to purchase other synths
        uint256 susdWethPrice = uint256(controller.oracle().estimateItem(10**18, susd));
        address[] memory synths = IStrategy(strategy).synths();
        for (uint256 i = 0; i < synths.length; i++) {
            uint256 amount =
                uint256(StrategyLibrary.getExpectedTokenValue(total, strategy, synths[i]))
                               .mul(10**18)
                               .div(susdWethPrice);
            require(
                _delegateSwap(
                    IStrategy(strategy).getTradeData(synths[i]).adapters[0], // Assuming that synth only stores single SythetixAdapter
                    amount,
                    1,
                    susd,
                    synths[i],
                    strategy,
                    strategy
                ),
                "Swap failed"
            );
        }
    }

    function _sellToken(
        address strategy,
        address token,
        int256 estimatedValue,
        int256 expectedValue
    ) internal returns (bool) {
        int256 rebalanceRange =
            StrategyLibrary.getRange(
                expectedValue,
                controller.strategyState(strategy).rebalanceThreshold
            );
        if (estimatedValue > expectedValue.add(rebalanceRange)) {
            TradeData memory tradeData = IStrategy(strategy).getTradeData(token);
            _sellPath(
                tradeData,
                _pathPrice(tradeData, uint256(estimatedValue.sub(expectedValue)), token),
                token,
                strategy
            );
            return true;
        }
        return false;
    }

    function _buyToken(
        address strategy,
        address from,
        address token,
        int256 estimatedValue,
        int256 expectedValue
    ) internal {
        int256 amount;
        if (estimatedValue == 0) {
            amount = expectedValue;
        } else {
            int256 rebalanceRange =
                StrategyLibrary.getRange(
                    expectedValue,
                    controller.strategyState(strategy).rebalanceThreshold
                );
            if (estimatedValue < expectedValue.sub(rebalanceRange)) {
                amount = expectedValue.sub(estimatedValue);
            }
        }
        if (amount > 0) {
            TradeData memory tradeData = IStrategy(strategy).getTradeData(token);
            if (tradeData.cache.length > 0) {
                //Apply multiplier
                uint16 multiplier = abi.decode(tradeData.cache, (uint16));
                amount = amount.mul(int256(multiplier)).div(int256(DIVISOR));
            }
            uint256 balance = IERC20(weth).balanceOf(from);
            _buyPath(
                tradeData,
                uint256(amount) > balance ? balance : uint256(amount),
                token,
                strategy,
                from
            );
        }
    }

    function _repayToken(
        address strategy,
        address token,
        uint256 total,
        int256 estimatedValue
    ) internal {
        int256 expectedValue = StrategyLibrary.getExpectedTokenValue(total, strategy, token);
        int256 rebalanceRange =
            StrategyLibrary.getRange(
                expectedValue,
                controller.strategyState(strategy).rebalanceThreshold
            );
        TradeData memory tradeData = IStrategy(strategy).getTradeData(token);
        // We still call _repayPath even if amountInWeth == 0 because we need to check if leveraged tokens need to be deleveraged
        uint256 amountInWeth = estimatedValue < expectedValue.add(rebalanceRange) ? uint256(-estimatedValue.sub(expectedValue)) : 0;
        _repayPath(
            tradeData,
            amountInWeth,
            total,
            strategy
        );
    }

    function _borrowToken(
        address strategy,
        address token,
        uint256 total,
        int256 estimatedValue
    ) internal {
        int256 expectedValue = StrategyLibrary.getExpectedTokenValue(total, strategy, token);
        int256 amountInWeth;
        if (estimatedValue == 0) {
            amountInWeth = expectedValue;
        } else {
            int256 rebalanceRange =
                StrategyLibrary.getRange(
                    expectedValue,
                    controller.strategyState(strategy).rebalanceThreshold
                );
            if (estimatedValue > expectedValue.sub(rebalanceRange)) {
                amountInWeth = expectedValue.sub(estimatedValue);
            }
        }
        if (amountInWeth < 0) {
            TradeData memory tradeData = IStrategy(strategy).getTradeData(token);
            _borrowPath(
                tradeData,
                uint256(-amountInWeth),
                total,
                strategy
            );
        }
    }

    function _repayPath(
        TradeData memory data,
        uint256 amount, // weth
        uint256 total,
        address strategy
    ) internal {
        if (amount == 0 && (data.path[data.path.length-1] != weth || data.cache.length == 0)) return; // Debt doesn't need to change and no leverage tokens to deleverage so return
        // Debt trade paths should have path.length == adapters.length,
        // since final token can differ from the debt token defined in the strategy
        require(data.adapters.length == data.path.length, "Incorrect trade data");
        ILendingPool lendingPool = ILendingPool(addressesProvider.getLendingPool());
        IOracle oracle = controller.oracle();
        address[] memory leverageItems;
        uint256[] memory leverageLiquidity;
        if (data.path[data.path.length-1] != weth) {
            // Convert amount into the first token's currency
            amount = amount.mul(10**18).div(uint256(oracle.estimateItem(10**18, data.path[data.path.length-1])));
        } else if (data.cache.length > 0) {
            // Deleverage tokens
            leverageItems = abi.decode(data.cache, (address[]));
            leverageLiquidity = new uint256[](leverageItems.length);
            if (amount == 0) {
                // Special case where debt doesn't need to change but the relative amounts of leverage tokens do. We must first deleverage our debt
                for (uint256 i = 0; i < leverageItems.length; i++) {
                    leverageLiquidity[i] = _getLeverageRemaining(strategy, leverageItems[i], total, false);
                    amount = amount.add(leverageLiquidity[i]);
                }
            } else {
                uint256 leverageAmount = amount; // amount is denominated in weth here
                for (uint256 i = 0; i < leverageItems.length; i++) {
                    if (leverageItems.length > 1) { //If multiple leveraged items, some may have less liquidity than the total amount we need to sell
                        uint256 liquidity = _getLeverageRemaining(strategy, leverageItems[i], total, false);
                        leverageLiquidity[i] = leverageAmount > liquidity ? liquidity : leverageAmount;
                    } else {
                        leverageLiquidity[i] = leverageAmount;
                    }
                    leverageAmount = leverageAmount.sub(leverageLiquidity[i]);
                }
                assert(leverageAmount == 0);
            }
        }

        while (amount > 0) {
            if (leverageItems.length > 0) {
                // Leverage tokens: cache can contain an array of tokens that can be purchased with the WETH received from selling debt
                ( , , uint256 availableBorrowsETH, , , ) = lendingPool.getUserAccountData(strategy);
                bool isLiquidityRemaining = false;
                for (uint256 i = 0; i < leverageItems.length; i++) {
                    if (leverageLiquidity[i] > 0 && availableBorrowsETH > 0) {
                        // Only deleverage token when there is a disparity between the expected value and the estimated value
                        uint256 leverageAmount = _deleverage(strategy, leverageItems[i], leverageLiquidity[i], availableBorrowsETH);
                        leverageLiquidity[i] = leverageLiquidity[i].sub(leverageAmount);
                        availableBorrowsETH = availableBorrowsETH.sub(leverageAmount);
                        if (leverageLiquidity[i] > 0) isLiquidityRemaining = true; // Liquidity still remaining
                    }
                }
                if (!isLiquidityRemaining) {
                  // In case of deleveraging slippage, once we've fully deleveraged we just want use the weth the we've received even if its less than original amount
                  uint256 balance = IERC20(weth).balanceOf(strategy);
                  if (amount > balance) amount = balance;
                }
            }
            for (int256 i = int256(data.adapters.length-1); i >= 0; i--) { //this doesn't work with uint256?? wtf solidity
                uint256 _amount;
                address _tokenIn = data.path[uint256(i)];
                address _tokenOut;
                address _from;
                address _to;

                if (uint256(i) == data.adapters.length-1) {
                    uint256 balance = IERC20(_tokenIn).balanceOf(strategy);
                    _amount = balance > amount ? amount : balance;
                    _from = strategy;
                    //Update amounts
                    amount = amount.sub(_amount);
                } else {
                    _from = address(this);
                    _amount = IERC20(_tokenIn).balanceOf(_from);
                }
                if (_amount > 0) {
                    if (uint256(i) == 0) {
                        _tokenOut = address(0); //Since we're repaying to the lending pool we'll set tokenOut to zero, however amount is valued in weth
                        _to = strategy;
                    } else {
                        _tokenOut = data.path[uint256(i-1)];
                        _to = address(this);
                    }
                    require(
                        _delegateSwap(
                            data.adapters[uint256(i)],
                            _amount,
                            1,
                            _tokenIn,
                            _tokenOut,
                            _from,
                            _to
                        ),
                        "Swap failed"
                    );
                }
            }
        }
        for (uint256 i = 0; i < leverageItems.length; i++) {
            _tempEstimate[strategy][leverageItems[i]] = oracle.estimateItem(IERC20(leverageItems[i]).balanceOf(strategy), leverageItems[i]);
        }

    }

    function _borrowPath(
        TradeData memory data,
        uint256 amount, // weth
        uint256 total,
        address strategy
    ) internal {
        // Debt trade paths should have path.length == adapters.length,
        // since final token can differ from the debt token defined in the strategy
        require(data.adapters.length == data.path.length, "Incorrect trade data");
        ILendingPool lendingPool = ILendingPool(addressesProvider.getLendingPool());
        address[] memory leverageItems;
        uint256[] memory leverageLiquidity;

        if (data.path[data.path.length-1] == weth && data.cache.length > 0) {
          leverageItems = abi.decode(data.cache, (address[]));
          leverageLiquidity = new uint256[](leverageItems.length);
          for (uint256 i = 0; i < leverageItems.length; i++) {
              leverageLiquidity[i] = _getLeverageRemaining(strategy, leverageItems[i], total, true);
          }
        }

        while (amount > 0) { //First loop must either borrow the entire amount or add more tokens as collateral in order to borrow more on following loops
            ( , , uint256 availableBorrowsETH, , , ) = lendingPool.getUserAccountData(strategy);
            for (uint256 i = 0; i < data.adapters.length; i++) {
                uint256 _amount;
                address _tokenIn;
                address _tokenOut = data.path[i];
                address _from;
                address _to;
                if (i == 0) {
                    _tokenIn = address(0); //Since we are withdrawing from lendingPool's collateral reserves, we can set tokenIn to zero. However, amount will be valued in weth
                    _amount = availableBorrowsETH > amount ? amount : availableBorrowsETH;
                    _from = strategy;
                    //Update amount
                    amount = amount.sub(_amount);
                } else {
                    _tokenIn = data.path[i-1];
                    _from = address(this);
                    _amount = IERC20(_tokenIn).balanceOf(_from);
                }
                if (_amount > 0) {
                    if (i == data.adapters.length-1 && leverageItems.length == 0) {
                        _to = strategy;
                    } else {
                        _to = address(this);
                    }
                    require(
                        _delegateSwap(
                            data.adapters[i],
                            _amount,
                            1,
                            _tokenIn,
                            _tokenOut,
                            _from,
                            _to
                        ),
                        "Swap failed"
                    );
                }
            }
            if (leverageItems.length > 0) {
                // Leverage tokens: cache can contain an array of tokens that can be purchased with the WETH received from selling debt
                // Only purchase token when there is a disparity between the expected value and the estimated value
                for (uint256 i = 0; i < leverageItems.length; i++) {
                    if (leverageLiquidity[i] > 0) {
                        uint256 leverageAmount = _leverage(strategy, leverageItems[i], leverageLiquidity[i]);
                        leverageLiquidity[i] = leverageLiquidity[i].sub(leverageAmount);
                    }
                }
            }
        }
    }

    function _getLeverageRemaining(address strategy, address leverageItem, uint256 total, bool isLeveraging) internal view returns (uint256) {
        uint256 estimate = uint256(controller.oracle().estimateItem(
          IERC20(leverageItem).balanceOf(strategy),
          leverageItem
        ));
        uint256 expected = uint256(StrategyLibrary.getExpectedTokenValue(total, strategy, leverageItem));
        if (isLeveraging) {
            if (expected > estimate) return expected.sub(estimate);
        } else {
            if (estimate > expected) return estimate.sub(expected);
        }
        return 0;
    }

    function _leverage(address strategy, address leverageItem, uint256 leverageLiquidity) internal returns (uint256) {
        uint256 wethBalance = IERC20(weth).balanceOf(address(this));
        if (wethBalance > 0) {
            uint256 leverageAmount = leverageLiquidity > wethBalance ? wethBalance : leverageLiquidity;
            _buyPath(
                IStrategy(strategy).getTradeData(leverageItem),
                leverageAmount,
                leverageItem,
                strategy,
                address(this)
            );
            return leverageAmount;
        }
    }

    function _deleverage(address strategy, address leverageItem, uint256 leverageLiquidity, uint256 available) internal returns (uint256) {
        uint256 leverageAmount = leverageLiquidity > available ? available : leverageLiquidity;
        TradeData memory tradeData = IStrategy(strategy).getTradeData(leverageItem);
        uint256 amount = _pathPrice(tradeData, leverageAmount, leverageItem);
        uint256 balance = IERC20(leverageItem).balanceOf(strategy);
        _sellPath(
            tradeData,
            amount > balance ? balance : amount,
            leverageItem,
            strategy
        );
        return leverageAmount;
    }
}
