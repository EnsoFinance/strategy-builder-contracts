//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.12;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/UniswapV2Library.sol";
import "../BaseAdapter.sol";

contract UniswapV2Adapter is BaseAdapter {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public immutable factory;

    constructor(address factory_, address weth_) public BaseAdapter(weth_) {
        factory = factory_;
    }

    function spotPrice(
        uint256 amount,
        address tokenIn,
        address tokenOut
    ) external view override returns (uint256) {
        (uint256 reserveA, uint256 reserveB) =
            UniswapV2Library.getReserves(factory, tokenIn, tokenOut);
        return UniswapV2Library.quote(amount, reserveA, reserveB);
    }

    /*
     * WARNING: This function can be called by anyone! Never approve this contract
     * to transfer your tokens. It should only ever be called by a contract which
     * approves an exact token amount and immediately swaps the tokens OR is used
     * in a delegate call where this contract NEVER gets approved to transfer tokens.
     */
    function swap(
        uint256 amount,
        uint256 expected,
        address tokenIn,
        address tokenOut,
        address from,
        address to
    ) public override {
        require(tokenIn != tokenOut, "Tokens cannot match");
        {
            address pair = UniswapV2Library.pairFor(factory, tokenIn, tokenOut);
            uint256 beforeBalance = IERC20(tokenIn).balanceOf(pair);
            if (from != address(this)) {
                IERC20(tokenIn).safeTransferFrom(from, pair, amount);
            } else {
                IERC20(tokenIn).safeTransfer(pair, amount);
            }
            uint256 afterBalance = IERC20(tokenIn).balanceOf(pair);
            amount = afterBalance.sub(beforeBalance); //In case of transfer fees reducing amount
        }

        (uint256 reserveIn, uint256 reserveOut) = UniswapV2Library.getReserves(factory, tokenIn, tokenOut);
        uint256 received = UniswapV2Library.getAmountOut(amount, reserveIn, reserveOut);
        require(received >= expected, "Insufficient tokenOut amount");
        _pairSwap(0, received, tokenIn, tokenOut, to);
    }

    function _pairSwap(
        uint256 tokenAOut,
        uint256 tokenBOut,
        address tokenA,
        address tokenB,
        address to
    ) internal {
        (address token0, ) = UniswapV2Library.sortTokens(tokenA, tokenB);
        (uint256 amount0Out, uint256 amount1Out) =
            tokenA == token0 ? (tokenAOut, tokenBOut) : (tokenBOut, tokenAOut);
        IUniswapV2Pair(UniswapV2Library.pairFor(factory, tokenA, tokenB)).swap(
            amount0Out,
            amount1Out,
            to,
            new bytes(0)
        );
    }
}