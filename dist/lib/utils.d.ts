import { BigNumber } from 'ethers';
export declare const FEE = 997;
export declare const DIVISOR = 1000;
export declare const UNI_V3_FEE = 3000;
export declare const ORACLE_TIME_WINDOW = 1;
export declare const DEFAULT_DEPOSIT_SLIPPAGE = 995;
export declare const MAINNET_ADDRESSES: {
    WETH: string;
    SUSD: string;
    USDC: string;
    UNISWAP: string;
    BALANCER_REGISTRY: string;
    BALANCER_FACTORY: string;
    AAVE_ADDRESS_PROVIDER: string;
    CURVE_ADDRESS_PROVIDER: string;
    SYNTHETIX_ADDRESS_PROVIDER: string;
    COMPOUND_COMPTROLLER: string;
};
export declare enum TIMELOCK_CATEGORY {
    RESTRUCTURE = 0,
    THRESHOLD = 1,
    REBALANCE_SLIPPAGE = 2,
    RESTRUCTURE_SLIPPAGE = 3,
    TIMELOCK = 4,
    PERFORMANCE = 5
}
export declare enum ITEM_CATEGORY {
    BASIC = 0,
    SYNTH = 1,
    DEBT = 2,
    RESERVE = 3
}
export declare enum ESTIMATOR_CATEGORY {
    DEFAULT_ORACLE = 0,
    CHAINLINK_ORACLE = 1,
    UNISWAP_TWAP_ORACLE = 2,
    SUSHI_TWAP_ORACLE = 3,
    STRATEGY = 4,
    BLOCKED = 5,
    AAVE_V1 = 6,
    AAVE_V2 = 7,
    AAVE_DEBT = 8,
    BALANCER = 9,
    COMPOUND = 10,
    CURVE = 11,
    CURVE_GAUGE = 12,
    SUSHI_LP = 13,
    SUSHI_FARM = 14,
    UNISWAP_V2_LP = 15,
    UNISWAP_V3_LP = 16,
    YEARN_V1 = 17,
    YEARN_V2 = 18
}
export declare function increaseTime(seconds: number): Promise<any>;
export declare function encodePriceSqrt(reserve1: number, reserve0: number): BigNumber;
export declare function getMinTick(tickSpacing: number): number;
export declare function getMaxTick(tickSpacing: number): number;
export declare function getDeadline(secondsInFuture: number): Promise<BigNumber>;