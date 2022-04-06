//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@uniswap/v3-core/contracts/libraries/FixedPoint96.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "../../interfaces/registries/IUniswapV3Registry.sol";


contract UniswapV3Registry is IUniswapV3Registry, Ownable {
    using SafeMath for uint256;

    IUniswapV3Factory public immutable override factory;

    address public immutable override weth;

    uint32 public override timeWindow;

    mapping(address =>  bytes32) internal _pairId;

    mapping(bytes32 => FeeData) internal _fees;


    constructor(uint32 timeWindow_, address factory_, address weth_) public {
        factory = IUniswapV3Factory(factory_);
        weth = weth_;
        timeWindow = timeWindow_;
    }

    function batchAddPools(
        address[] memory tokens,
        address[] memory pairs,
        uint24[] memory fees
    ) external override onlyOwner {
        uint length = tokens.length;
        require(length == pairs.length, "Array mismatch");
        require(length == fees.length, "Array mismatch");
        for (uint256 i = 0; i < length; i++) {
            _addPool(tokens[i], pairs[i], fees[i]);
        }
    }

    function addPool(address token, address pair, uint24 fee) public override onlyOwner {
        _addPool(token, pair, fee);
    }
    function removePool(address token) external override onlyOwner {
        bytes32 id = _pairId[token];
        address pair = _fees[id].pair;
        require(pair != address(0), "Pool doesnt exist");
        delete _fees[id];
        delete _pairId[token];
    }

    function getPoolData(address token) external view override returns (PoolData memory) {
        FeeData memory fees = _fees[_pairId[token]];
        address pool = factory.getPool(token, fees.pair, fees.fee);
        return PoolData(pool, fees.pair);
    }

    function getFee(address token, address pair) external view override returns (uint24) {
        return _fees[_pairHash(token, pair)].fee;
    }

    function updateTimeWindow(uint32 newTimeWindow) external onlyOwner {
        require(timeWindow != newTimeWindow, "Wrong time window");
        require(newTimeWindow != 0, "Wrong time window");
        timeWindow = newTimeWindow;
    }

    function _addPool(address token, address pair, uint24 fee) internal {
        bytes32 pairId = _pairHash(token, pair);
        _fees[pairId] = FeeData(fee, pair);
        _pairId[token] = pairId;
        address pool = factory.getPool(token, pair, fee); 
        require(pool != address(0), "Not valid pool");
        (, , , , uint16 observationCardinalityNext, , ) = IUniswapV3Pool(pool).slot0();
        if (observationCardinalityNext < 2) IUniswapV3Pool(pool).increaseObservationCardinalityNext(2);
    }

    function _pairHash(address a, address b) internal pure returns (bytes32) {
        if (a < b) {
            return keccak256(abi.encodePacked(a, b));
        } else {
            return keccak256(abi.encodePacked(b, a));
        }
    }


}
