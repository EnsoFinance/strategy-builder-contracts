"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Estimator = void 0;
var hardhat_1 = __importDefault(require("hardhat"));
var ethers_1 = require("ethers");
var utils_1 = require("./utils");
var IBaseAdapter_json_1 = __importDefault(require("../artifacts/contracts/interfaces/IBaseAdapter.sol/IBaseAdapter.json"));
var ICToken_json_1 = __importDefault(require("../artifacts/contracts/interfaces/compound/ICToken.sol/ICToken.json"));
var ISynth_json_1 = __importDefault(require("../artifacts/contracts/interfaces/synthetix/ISynth.sol/ISynth.json"));
var ISynthetix_json_1 = __importDefault(require("../artifacts/contracts/interfaces/synthetix/ISynthetix.sol/ISynthetix.json"));
var IExchanger_json_1 = __importDefault(require("../artifacts/contracts/interfaces/synthetix/IExchanger.sol/IExchanger.json"));
var ICurveRegistry_json_1 = __importDefault(require("../artifacts/contracts/interfaces/curve/ICurveRegistry.sol/ICurveRegistry.json"));
var ICurveStableSwap_json_1 = __importDefault(require("../artifacts/contracts/interfaces/curve/ICurveStableSwap.sol/ICurveStableSwap.json"));
var UniswapV2Router01_json_1 = __importDefault(require("@uniswap/v2-periphery/build/UniswapV2Router01.json"));
var Quoter_json_1 = __importDefault(require("@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json"));
var ERC20_json_1 = __importDefault(require("@uniswap/v2-periphery/build/ERC20.json"));
var AddressZero = hardhat_1.default.ethers.constants.AddressZero;
var defaultAbiCoder = hardhat_1.default.ethers.utils.defaultAbiCoder;
var SYNTHETIX = '0xDC01020857afbaE65224CfCeDb265d1216064c59';
var SYNTHETIX_EXCHANGER = '0x3e343E89F4fF8057806F54F2208940B1Cd5C40ca';
var CURVE_REGISTRY = '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5';
var UNISWAP_V2_ROUTER = '0xf164fC0Ec4E93095b804a4795bBe1e041497b92a';
var UNISWAP_V3_QUOTER = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';
var WETH = utils_1.MAINNET_ADDRESSES.WETH;
var SUSD = utils_1.MAINNET_ADDRESSES.SUSD;
var VIRTUAL_ITEM = '0xffffffffffffffffffffffffffffffffffffffff';
var NULL_TRADE_DATA = {
    adapters: [],
    path: [],
    cache: '0x'
};
var Estimator = /** @class */ (function () {
    function Estimator(signer, oracle, tokenRegistry, uniswapV3Registry, aaveV2AdapterAddress, compoundAdapterAddress, curveAdapterAddress, curveLPAdapterAddress, curveRewardsAdapterAddress, synthetixAdapterAddress, uniswapV2AdapterAddress, uniswapV3AdapterAddress, yearnV2AdapterAddress) {
        this.signer = signer;
        this.curveRegistry = new ethers_1.Contract(CURVE_REGISTRY, ICurveRegistry_json_1.default.abi, signer);
        this.synthetix = new ethers_1.Contract(SYNTHETIX, ISynthetix_json_1.default.abi, signer);
        this.synthetixExchanger = new ethers_1.Contract(SYNTHETIX_EXCHANGER, IExchanger_json_1.default.abi, signer);
        this.uniswapV2Router = new ethers_1.Contract(UNISWAP_V2_ROUTER, UniswapV2Router01_json_1.default.abi, signer);
        this.uniswapV3Quoter = new ethers_1.Contract(UNISWAP_V3_QUOTER, Quoter_json_1.default.abi, signer);
        this.oracle = oracle;
        this.tokenRegistry = tokenRegistry;
        this.uniswapV3Registry = uniswapV3Registry;
        this.aaveV2AdapterAddress = aaveV2AdapterAddress;
        this.aaveDebtAdapterAddress = AddressZero;
        this.balancerAdapterAddress = AddressZero;
        this.compoundAdapterAddress = compoundAdapterAddress;
        this.curveAdapterAddress = curveAdapterAddress;
        this.curveLPAdapterAddress = curveLPAdapterAddress;
        this.curveRewardsAdapterAddress = curveRewardsAdapterAddress;
        this.synthetixAdapterAddress = synthetixAdapterAddress;
        this.uniswapV2AdapterAddress = uniswapV2AdapterAddress;
        this.uniswapV2LPAdapterAddress = AddressZero;
        this.uniswapV3AdapterAddress = uniswapV3AdapterAddress;
        this.yearnV2AdapterAddress = yearnV2AdapterAddress;
    }
    Estimator.prototype.create = function (strategyItems, rebalanceThreshold, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var virtPercentage, itemsData, items, synths, categories, i;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        virtPercentage = ethers_1.BigNumber.from('0');
                        itemsData = {};
                        items = [];
                        synths = [];
                        return [4 /*yield*/, Promise.all(strategyItems.map(function (strategyItem) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, this.tokenRegistry.itemCategories(strategyItem.item)];
                                });
                            }); }))
                            // Sort by category
                        ];
                    case 1:
                        categories = _a.sent();
                        // Sort by category
                        for (i = 0; i < strategyItems.length; i++) {
                            if (categories[i].eq(utils_1.ITEM_CATEGORY.BASIC)) {
                                items.push(strategyItems[i].item);
                            }
                            if (categories[i].eq(utils_1.ITEM_CATEGORY.SYNTH)) {
                                synths.push(strategyItems[i].item);
                                virtPercentage = virtPercentage.add(strategyItems[i].percentage);
                            }
                            itemsData[strategyItems[i].item] = strategyItems[i];
                        }
                        if (synths.length > 0) {
                            // Synths found, check for sUSD and add it to virtual percentage
                            if (itemsData[SUSD])
                                virtPercentage = virtPercentage.add(itemsData[SUSD].percentage);
                            itemsData[VIRTUAL_ITEM] = {
                                item: VIRTUAL_ITEM,
                                percentage: virtPercentage,
                                data: NULL_TRADE_DATA
                            };
                        }
                        else {
                            // No synths, check for sUSD and add it to basic tokens
                            if (itemsData[SUSD])
                                items.push(SUSD);
                        }
                        // If weth isn't set, add null data
                        if (!itemsData[WETH])
                            itemsData[WETH] = {
                                item: WETH,
                                percentage: ethers_1.BigNumber.from('0'),
                                data: NULL_TRADE_DATA
                            };
                        return [2 /*return*/, this.estimateBatchBuy(items, synths, itemsData, rebalanceThreshold, amount, new Array(items.length + 1).fill(ethers_1.BigNumber.from('0')))];
                }
            });
        });
    };
    Estimator.prototype.deposit = function (strategy, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, items, synths, rebalanceThreshold, itemsData, _b, _c, _d, _e, _f, _g;
            var _this = this;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            strategy.items(),
                            strategy.synths(),
                            strategy.rebalanceThreshold()
                        ])];
                    case 1:
                        _a = _h.sent(), items = _a[0], synths = _a[1], rebalanceThreshold = _a[2];
                        itemsData = {};
                        return [4 /*yield*/, Promise.all(items.map(function (item) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _a = itemsData;
                                            _b = item;
                                            return [4 /*yield*/, this.getStrategyItem(strategy, item)];
                                        case 1:
                                            _a[_b] = _c.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 2:
                        _h.sent();
                        return [4 /*yield*/, Promise.all(synths.map(function (item) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _a = itemsData;
                                            _b = item;
                                            return [4 /*yield*/, this.getStrategyItem(strategy, item)];
                                        case 1:
                                            _a[_b] = _c.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 3:
                        _h.sent();
                        _b = itemsData;
                        _c = WETH;
                        return [4 /*yield*/, this.getStrategyItem(strategy, WETH)];
                    case 4:
                        _b[_c] = _h.sent();
                        _d = itemsData;
                        _e = SUSD;
                        return [4 /*yield*/, this.getStrategyItem(strategy, SUSD)];
                    case 5:
                        _d[_e] = _h.sent();
                        _f = itemsData;
                        _g = VIRTUAL_ITEM;
                        return [4 /*yield*/, this.getStrategyItem(strategy, VIRTUAL_ITEM)];
                    case 6:
                        _f[_g] = _h.sent();
                        return [2 /*return*/, this.estimateBatchBuy(items, synths, itemsData, rebalanceThreshold, amount, new Array(items.length + 1).fill(ethers_1.BigNumber.from('0')))];
                }
            });
        });
    };
    Estimator.prototype.withdraw = function (strategy, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, items, totalSupply, strategyEstimate, totalBefore, estimates, expectedWeth, totalAfter, amounts, percentage, wethBalance, expectedValue;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            strategy.items(),
                            strategy.totalSupply(),
                            this.oracle.estimateStrategy(strategy.address)
                        ])];
                    case 1:
                        _a = _b.sent(), items = _a[0], totalSupply = _a[1], strategyEstimate = _a[2];
                        totalBefore = strategyEstimate[0], estimates = strategyEstimate[1];
                        expectedWeth = totalBefore.mul(amount).div(totalSupply);
                        totalAfter = totalBefore.sub(expectedWeth);
                        return [4 /*yield*/, Promise.all(items.map(function (item, index) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, percentage, data, estimatedValue, expectedValue, _b, _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0: return [4 /*yield*/, Promise.all([
                                                strategy.getPercentage(item),
                                                strategy.getTradeData(item)
                                            ])];
                                        case 1:
                                            _a = _d.sent(), percentage = _a[0], data = _a[1];
                                            estimatedValue = estimates[index];
                                            expectedValue = percentage.eq('0') ? ethers_1.BigNumber.from('0') : totalAfter.mul(percentage).div(utils_1.DIVISOR);
                                            if (!estimatedValue.gt(expectedValue)) return [3 /*break*/, 3];
                                            _b = this.estimateSellPath;
                                            _c = [data];
                                            return [4 /*yield*/, this.getPathPrice(data, estimatedValue.sub(expectedValue), item)];
                                        case 2: return [2 /*return*/, _b.apply(this, _c.concat([_d.sent(), item]))];
                                        case 3: return [2 /*return*/, ethers_1.BigNumber.from('0')];
                                    }
                                });
                            }); }))];
                    case 2:
                        amounts = _b.sent();
                        return [4 /*yield*/, strategy.getPercentage(WETH)];
                    case 3:
                        percentage = _b.sent();
                        if (!percentage.gt('0')) return [3 /*break*/, 5];
                        return [4 /*yield*/, (new ethers_1.Contract(WETH, ERC20_json_1.default.abi, this.signer)).balanceOf(strategy.address)];
                    case 4:
                        wethBalance = _b.sent();
                        expectedValue = totalAfter.mul(percentage).div(utils_1.DIVISOR);
                        if (expectedValue.lt(wethBalance))
                            amounts.push(wethBalance.sub(expectedValue));
                        _b.label = 5;
                    case 5: return [2 /*return*/, amounts.reduce(function (a, b) { return a.add(b); })];
                }
            });
        });
    };
    Estimator.prototype.estimateBatchBuy = function (items, synths, itemsData, rebalanceThreshold, total, estimates) {
        return __awaiter(this, void 0, void 0, function () {
            var amounts, percentage_1, data, expectedValue, rebalanceRange, susdAmount, _a, _b, percentage;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, Promise.all(items.map(function (item, index) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, percentage, data, expectedValue, rebalanceRange, amount;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _a = itemsData[item], percentage = _a.percentage, data = _a.data;
                                        expectedValue = percentage.eq('0') ? ethers_1.BigNumber.from('0') : total.mul(percentage).div(utils_1.DIVISOR);
                                        rebalanceRange = rebalanceThreshold.eq('0') ? ethers_1.BigNumber.from('0') : expectedValue.mul(rebalanceThreshold).div(utils_1.DIVISOR);
                                        return [4 /*yield*/, this.estimateBuyItem(item, estimates[index], expectedValue, rebalanceRange, data)];
                                    case 1:
                                        amount = _b.sent();
                                        return [2 /*return*/, this.oracle.estimateItem(amount, item)];
                                }
                            });
                        }); }))];
                    case 1:
                        amounts = _c.sent();
                        if (!(synths.length > 0)) return [3 /*break*/, 4];
                        percentage_1 = itemsData[VIRTUAL_ITEM].percentage;
                        data = itemsData[SUSD].data;
                        expectedValue = percentage_1.eq('0') ? ethers_1.BigNumber.from('0') : total.mul(percentage_1).div(utils_1.DIVISOR);
                        rebalanceRange = rebalanceThreshold.eq('0') ? ethers_1.BigNumber.from('0') : expectedValue.mul(rebalanceThreshold).div(utils_1.DIVISOR);
                        return [4 /*yield*/, this.estimateBuyItem(SUSD, estimates[estimates.length - 1], expectedValue, rebalanceRange, data)];
                    case 2:
                        susdAmount = _c.sent();
                        _b = (_a = amounts).push;
                        return [4 /*yield*/, this.estimateBuySynths(itemsData, synths, percentage_1, susdAmount)];
                    case 3:
                        _b.apply(_a, [_c.sent()]);
                        _c.label = 4;
                    case 4:
                        percentage = itemsData[WETH].percentage;
                        if (percentage.gt('0')) {
                            amounts.push(total.mul(percentage).div(utils_1.DIVISOR));
                        }
                        return [2 /*return*/, amounts.reduce(function (a, b) { return a.add(b); })];
                }
            });
        });
    };
    Estimator.prototype.estimateBuySynths = function (itemsData, synths, synthPercentage, susdAmount) {
        return __awaiter(this, void 0, void 0, function () {
            var totalValue, susdRemaining, i, _a, percentage, data, amount, balance, value, value;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        totalValue = ethers_1.BigNumber.from('0');
                        susdRemaining = susdAmount;
                        i = 0;
                        _b.label = 1;
                    case 1:
                        if (!(i < synths.length)) return [3 /*break*/, 5];
                        _a = itemsData[synths[i]], percentage = _a.percentage, data = _a.data;
                        if (!!percentage.eq('0')) return [3 /*break*/, 4];
                        amount = susdAmount.mul(percentage).div(synthPercentage);
                        if (!amount.gt('0')) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.estimateSwap(data.adapters[0], amount, SUSD, synths[i])];
                    case 2:
                        balance = _b.sent();
                        return [4 /*yield*/, this.oracle.estimateItem(balance, synths[i])];
                    case 3:
                        value = _b.sent();
                        totalValue = totalValue.add(value);
                        susdRemaining = susdRemaining.sub(amount);
                        _b.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 1];
                    case 5:
                        if (!susdRemaining.gt('0')) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.oracle.estimateItem(susdRemaining, SUSD)];
                    case 6:
                        value = _b.sent();
                        totalValue = totalValue.add(value);
                        _b.label = 7;
                    case 7: return [2 /*return*/, totalValue];
                }
            });
        });
    };
    Estimator.prototype.estimateBuyItem = function (token, estimatedValue, expectedValue, rebalanceRange, data) {
        return __awaiter(this, void 0, void 0, function () {
            var amount, multiplier;
            return __generator(this, function (_a) {
                amount = ethers_1.BigNumber.from('0');
                if (estimatedValue.eq('0')) {
                    amount = expectedValue;
                }
                else if (estimatedValue.gt(expectedValue.sub(rebalanceRange))) {
                    amount = expectedValue.sub(estimatedValue);
                }
                if (amount.gt('0')) {
                    if (data.cache != '0x') {
                        multiplier = defaultAbiCoder.decode(['uint16'], data.cache)[0];
                        amount = amount.mul(multiplier).div(utils_1.DIVISOR);
                    }
                    return [2 /*return*/, this.estimateBuyPath(data, amount, token)];
                }
                return [2 /*return*/, ethers_1.BigNumber.from('0')];
            });
        });
    };
    Estimator.prototype.estimateBuyPath = function (data, amount, token) {
        return __awaiter(this, void 0, void 0, function () {
            var balance, i, _tokenIn, _tokenOut;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!amount.gt('0')) return [3 /*break*/, 5];
                        balance = amount;
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < data.adapters.length)) return [3 /*break*/, 4];
                        _tokenIn = (i === 0) ? WETH : data.path[i - 1];
                        _tokenOut = (i === data.adapters.length - 1) ? token : data.path[i];
                        return [4 /*yield*/, this.estimateSwap(data.adapters[i], balance, _tokenIn, _tokenOut)];
                    case 2:
                        balance = _a.sent();
                        _a.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, balance];
                    case 5: return [2 /*return*/, ethers_1.BigNumber.from('0')];
                }
            });
        });
    };
    Estimator.prototype.estimateSellPath = function (data, amount, token) {
        return __awaiter(this, void 0, void 0, function () {
            var balance, i, _tokenIn, _tokenOut;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!amount.gt('0')) return [3 /*break*/, 5];
                        balance = amount;
                        i = data.adapters.length - 1;
                        _a.label = 1;
                    case 1:
                        if (!(i >= 0)) return [3 /*break*/, 4];
                        _tokenIn = (i === data.adapters.length - 1) ? token : data.path[i];
                        _tokenOut = (i === 0) ? WETH : data.path[i - 1];
                        return [4 /*yield*/, this.estimateSwap(data.adapters[i], balance, _tokenIn, _tokenOut)];
                    case 2:
                        balance = _a.sent();
                        _a.label = 3;
                    case 3:
                        i--;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, balance];
                    case 5: return [2 /*return*/, ethers_1.BigNumber.from('0')];
                }
            });
        });
    };
    Estimator.prototype.estimateSwap = function (adapter, amount, tokenIn, tokenOut) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (adapter.toLowerCase()) {
                    case this.aaveV2AdapterAddress.toLowerCase():
                        return [2 /*return*/, this.estimateAaveV2(amount, tokenIn, tokenOut)];
                    case this.aaveDebtAdapterAddress.toLowerCase():
                        return [2 /*return*/, ethers_1.BigNumber.from('0')]; //this.estimateAaveDebt(amount, tokenIn, tokenOut)
                    case this.balancerAdapterAddress.toLowerCase():
                        return [2 /*return*/, ethers_1.BigNumber.from('0')]; //this.estimateBalancer(amount, tokenIn, tokenOut)
                    case this.compoundAdapterAddress.toLowerCase():
                        return [2 /*return*/, this.estimateCompound(amount, tokenIn, tokenOut)];
                    case this.curveAdapterAddress.toLowerCase():
                        return [2 /*return*/, this.estimateCurve(amount, tokenIn, tokenOut)];
                    case this.curveLPAdapterAddress.toLowerCase():
                        return [2 /*return*/, this.estimateCurveLP(amount, tokenIn, tokenOut)];
                    case this.curveRewardsAdapterAddress.toLowerCase():
                        return [2 /*return*/, this.estimateCurveGauge(amount, tokenIn, tokenOut)];
                    case this.synthetixAdapterAddress.toLowerCase():
                        return [2 /*return*/, this.estimateSynthetix(amount, tokenIn, tokenOut)];
                    case this.uniswapV2AdapterAddress.toLowerCase():
                        return [2 /*return*/, this.estimateUniswapV2(amount, tokenIn, tokenOut)];
                    case this.uniswapV3AdapterAddress.toLowerCase():
                        return [2 /*return*/, this.estimateUniswapV3(amount, tokenIn, tokenOut)];
                    case this.yearnV2AdapterAddress.toLowerCase():
                        return [2 /*return*/, this.estimateYearnV2(amount, tokenIn, tokenOut)];
                    default:
                        return [2 /*return*/, ethers_1.BigNumber.from('0')];
                }
                return [2 /*return*/];
            });
        });
    };
    Estimator.prototype.estimateAaveV2 = function (amount, tokenIn, tokenOut) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Assumes correct tokenIn/tokenOut pairing
                if (tokenIn === tokenOut)
                    return [2 /*return*/, ethers_1.BigNumber.from('0')];
                return [2 /*return*/, amount];
            });
        });
    };
    Estimator.prototype.estimateCompound = function (amount, tokenIn, tokenOut) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, tokenInIsCToken, tokenOutIsCToken, exchangeRate, exchangeRate;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([tokenIn, tokenOut].map(function (token) { return __awaiter(_this, void 0, void 0, function () {
                            var isCToken, e_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, (new ethers_1.Contract(token, ICToken_json_1.default.abi, this.signer)).isCToken()];
                                    case 1:
                                        isCToken = _a.sent();
                                        return [2 /*return*/, isCToken];
                                    case 2:
                                        e_1 = _a.sent();
                                        return [2 /*return*/, false];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }))];
                    case 1:
                        _a = _b.sent(), tokenInIsCToken = _a[0], tokenOutIsCToken = _a[1];
                        if (!(tokenInIsCToken && !tokenOutIsCToken)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (new ethers_1.Contract(tokenIn, ICToken_json_1.default.abi, this.signer)).callStatic.exchangeRateCurrent()];
                    case 2:
                        exchangeRate = _b.sent();
                        return [2 /*return*/, amount.mul(exchangeRate).div(String(Math.pow(10, 18)))];
                    case 3:
                        if (!(!tokenInIsCToken && tokenOutIsCToken)) return [3 /*break*/, 5];
                        return [4 /*yield*/, (new ethers_1.Contract(tokenOut, ICToken_json_1.default.abi, this.signer)).callStatic.exchangeRateCurrent()];
                    case 4:
                        exchangeRate = _b.sent();
                        return [2 /*return*/, amount.mul(String(Math.pow(10, 18))).div(exchangeRate)];
                    case 5: return [2 /*return*/, ethers_1.BigNumber.from('0')];
                }
            });
        });
    };
    Estimator.prototype.estimateCurve = function (amount, tokenIn, tokenOut) {
        return __awaiter(this, void 0, void 0, function () {
            var pool, _a, indexIn, indexOut;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.curveRegistry.find_pool_for_coins(tokenIn, tokenOut, 0)];
                    case 1:
                        pool = _b.sent();
                        if (!(pool != AddressZero)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.curveRegistry.get_coin_indices(pool, tokenIn, tokenOut)];
                    case 2:
                        _a = _b.sent(), indexIn = _a[0], indexOut = _a[1];
                        return [2 /*return*/, (new ethers_1.Contract(pool, ICurveStableSwap_json_1.default.abi, this.signer)).get_dy(indexIn, indexOut, amount)];
                    case 3: return [2 /*return*/, ethers_1.BigNumber.from('0')];
                }
            });
        });
    };
    Estimator.prototype.estimateCurveLP = function (amount, tokenIn, tokenOut) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Adapter's spot price is fine since there are no fees/slippage for liquidity providers
                return [2 /*return*/, (new ethers_1.Contract(this.curveLPAdapterAddress, IBaseAdapter_json_1.default.abi, this.signer)).spotPrice(amount, tokenIn, tokenOut)];
            });
        });
    };
    Estimator.prototype.estimateCurveGauge = function (amount, tokenIn, tokenOut) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Assumes correct tokenIn/tokenOut pairing
                if (tokenIn === tokenOut)
                    return [2 /*return*/, ethers_1.BigNumber.from('0')];
                return [2 /*return*/, amount];
            });
        });
    };
    Estimator.prototype.estimateSynthetix = function (amount, tokenIn, tokenOut) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, targetIn, targetOut, _b, tokenInKey, tokenOutKey, _c, amountReceived;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            (new ethers_1.Contract(tokenIn, ISynth_json_1.default.abi, this.signer)).target(),
                            (new ethers_1.Contract(tokenOut, ISynth_json_1.default.abi, this.signer)).target()
                        ])];
                    case 1:
                        _a = _d.sent(), targetIn = _a[0], targetOut = _a[1];
                        return [4 /*yield*/, Promise.all([
                                this.synthetix.synthsByAddress(targetIn),
                                this.synthetix.synthsByAddress(targetOut)
                            ])];
                    case 2:
                        _b = _d.sent(), tokenInKey = _b[0], tokenOutKey = _b[1];
                        return [4 /*yield*/, this.synthetixExchanger.getAmountsForExchange(amount, tokenInKey, tokenOutKey)];
                    case 3:
                        _c = _d.sent(), amountReceived = _c[0];
                        return [2 /*return*/, amountReceived];
                }
            });
        });
    };
    Estimator.prototype.estimateUniswapV2 = function (amount, tokenIn, tokenOut) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.uniswapV2Router.getAmountsOut(amount, [tokenIn, tokenOut])];
                    case 1: return [2 /*return*/, (_a.sent())[1]];
                }
            });
        });
    };
    Estimator.prototype.estimateUniswapV3 = function (amount, tokenIn, tokenOut) {
        return __awaiter(this, void 0, void 0, function () {
            var fee;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.uniswapV3Registry.getFee(tokenIn, tokenOut)];
                    case 1:
                        fee = _a.sent();
                        return [2 /*return*/, this.uniswapV3Quoter.callStatic.quoteExactInputSingle(tokenIn, tokenOut, fee, amount, 0)];
                }
            });
        });
    };
    Estimator.prototype.estimateYearnV2 = function (amount, tokenIn, tokenOut) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Adapter's spot price is fine since there are no fees/slippage for liquidity providers
                return [2 /*return*/, (new ethers_1.Contract(this.yearnV2AdapterAddress, IBaseAdapter_json_1.default.abi, this.signer)).spotPrice(amount, tokenIn, tokenOut)];
            });
        });
    };
    Estimator.prototype.getPathPrice = function (data, amount, token) {
        return __awaiter(this, void 0, void 0, function () {
            var balance, i, _tokenIn, _tokenOut;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        balance = amount;
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < data.adapters.length)) return [3 /*break*/, 4];
                        _tokenIn = (i === 0) ? WETH : data.path[i - 1];
                        _tokenOut = (i === data.adapters.length - 1) ? token : data.path[i];
                        return [4 /*yield*/, (new ethers_1.Contract(data.adapters[i], IBaseAdapter_json_1.default.abi, this.signer)).spotPrice(balance, _tokenIn, _tokenOut)];
                    case 2:
                        balance = _a.sent();
                        _a.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, balance];
                }
            });
        });
    };
    Estimator.prototype.getStrategyItem = function (strategy, item) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, percentage, data;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            strategy.getPercentage(item),
                            strategy.getTradeData(item)
                        ])];
                    case 1:
                        _a = _b.sent(), percentage = _a[0], data = _a[1];
                        return [2 /*return*/, {
                                item: item,
                                percentage: percentage,
                                data: data
                            }];
                }
            });
        });
    };
    return Estimator;
}());
exports.Estimator = Estimator;
