import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Contract } from 'ethers';
export declare class Tokens {
    weth: string;
    wbtc: string;
    dai: string;
    usdc: string;
    usdt: string;
    usdp: string;
    tusd: string;
    usdn: string;
    link: string;
    crv: string;
    knc: string;
    renBTC: string;
    sUSD: string;
    sEUR: string;
    sLINK: string;
    sETH: string;
    sBTC: string;
    sAAVE: string;
    sDOT: string;
    sADA: string;
    aWETH: string;
    aWBTC: string;
    aDAI: string;
    aUSDC: string;
    aUSDT: string;
    aCRV: string;
    cDAI: string;
    cUSDC: string;
    crv3: string;
    crv3Crypto: string;
    crvUSDP: string;
    crvSUSD: string;
    crvAAVE: string;
    crvSAAVE: string;
    crvLINK: string;
    crvCOMP: string;
    crvY: string;
    crvUSDN: string;
    crvSETH: string;
    crvREN: string;
    crv3Gauge: string;
    crvUSDPGauge: string;
    crvSUSDGauge: string;
    crvAAVEGauge: string;
    crvSAAVEGauge: string;
    crvLINKGauge: string;
    crvCOMPGauge: string;
    crvYGauge: string;
    ycrv3: string;
    ycrv3Crypto: string;
    ycrvUSDP: string;
    yDAI: string;
    yUSDC: string;
    ycrvSUSD: string;
    debtDAI: string;
    debtUSDC: string;
    debtWBTC: string;
    debtWETH: string;
    constructor();
    registerTokens(owner: SignerWithAddress, strategyFactory: Contract, uniswapV3Registry?: Contract, chainlinkRegistry?: Contract, curveDepositZapRegistry?: Contract): Promise<void>;
}
