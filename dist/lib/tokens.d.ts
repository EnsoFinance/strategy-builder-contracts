import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Contract } from 'ethers';
export declare class Tokens {
    weth: string;
    wbtc: string;
    dai: string;
    usdc: string;
    usdt: string;
    usdp: string;
    link: string;
    crv: string;
    susd: string;
    seur: string;
    slink: string;
    aWETH: string;
    aWBTC: string;
    aDAI: string;
    aUSDC: string;
    aUSDT: string;
    cDAI: string;
    crv3: string;
    crvUSDP: string;
    crvSUSD: string;
    crvAAVE: string;
    crvLINK: string;
    crv3Gauge: string;
    crvUSDPGauge: string;
    crvSUSDGauge: string;
    crvAAVEGauge: string;
    crvLINKGauge: string;
    ycrv3: string;
    ycrvUSDP: string;
    yDAI: string;
    ycrvSUSD: string;
    debtDAI: string;
    debtUSDC: string;
    debtWBTC: string;
    constructor();
    registerTokens(owner: SignerWithAddress, strategyFactory: Contract): Promise<void>;
}
