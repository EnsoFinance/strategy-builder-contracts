import chai from 'chai'
const { expect } = chai
import { ethers /*, network*/ } from 'hardhat'
const { constants, getContractFactory, getSigners } = ethers
const { WeiPerEther, AddressZero } = constants
import { solidity } from 'ethereum-waffle'
import { BigNumber, Contract, Event } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { prepareStrategy, StrategyItem, InitialState } from '../lib/encode'
import { Tokens } from '../lib/tokens'
import {
	Platform,
	deploySynthetixAdapter,
	deployCurveAdapter,
	deployUniswapV2Adapter,
	deployMetaStrategyAdapter,
	deployCompoundAdapter,
	deployPlatform,
	deployFullRouter,
} from '../lib/deploy'
import { isRevertedWith } from '../lib/errors'
import { increaseTime } from '../lib/utils'
import { initializeTestLogging, logTestComplete } from '../lib/convincer'
import { MAINNET_ADDRESSES, ESTIMATOR_CATEGORY, VIRTUAL_ITEM } from '../lib/constants'
//import { displayBalances } from '../lib/logging'
import IAddressResolver from '../artifacts/contracts/interfaces/synthetix/IAddressResolver.sol/IAddressResolver.json'
import ERC20 from '@uniswap/v2-periphery/build/ERC20.json'
import WETH9 from '@uniswap/v2-periphery/build/WETH9.json'
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json'

chai.use(solidity)

describe('SynthetixAdapter', function () {
	let proofCounter: number
	let platform: Platform,
		weth: Contract,
		crv: Contract,
		susd: Contract,
		seur: Contract,
		accounts: SignerWithAddress[],
		uniswapFactory: Contract,
		router: Contract,
		strategyFactory: Contract,
		controller: Contract,
		oracle: Contract,
		controllerLibrary: Contract,
		uniswapAdapter: Contract,
		compoundAdapter: Contract,
		curveAdapter: Contract,
		synthetixAdapter: Contract,
		metaStrategyAdapter: Contract,
		strategy: Contract,
		strategyItems: StrategyItem[],
		wrapper: Contract,
		tokens: Tokens

	const strategyState: InitialState = {
		timelock: BigNumber.from(60),
		rebalanceThreshold: BigNumber.from(10),
		rebalanceSlippage: BigNumber.from(997),
		restructureSlippage: BigNumber.from(990),
		managementFee: BigNumber.from(0),
		social: true,
		set: false,
	}

	before('Setup Synthetix, Uniswap, Curve, Enso', async function () {
		proofCounter = initializeTestLogging(this, __dirname)
		accounts = await getSigners()
		tokens = new Tokens()
		weth = new Contract(tokens.weth, WETH9.abi, accounts[0])
		crv = new Contract(tokens.crv, ERC20.abi, accounts[0])
		susd = new Contract(tokens.sUSD, ERC20.abi, accounts[0])
		seur = new Contract(tokens.sEUR, ERC20.abi, accounts[0])
		uniswapFactory = new Contract(MAINNET_ADDRESSES.UNISWAP_V2_FACTORY, UniswapV2Factory.abi, accounts[0])
		platform = await deployPlatform(
			accounts[10],
			uniswapFactory,
			new Contract(AddressZero, [], accounts[10]),
			weth,
			susd
		)
		strategyFactory = platform.strategyFactory
		controller = platform.controller
		oracle = platform.oracles.ensoOracle
		controllerLibrary = platform.controllerLibrary

		const synthetixResolver = new Contract(
			'0x823bE81bbF96BEc0e25CA13170F5AaCb5B79ba83',
			IAddressResolver.abi,
			accounts[0]
		)
		const curveAddressProvider = new Contract(MAINNET_ADDRESSES.CURVE_ADDRESS_PROVIDER, [], accounts[0])

		const whitelist = platform.administration.whitelist
		router = await deployFullRouter(
			accounts[10],
			new Contract(AddressZero, [], accounts[0]),
			controller,
			platform.strategyLibrary
		)
		await whitelist.connect(accounts[10]).approve(router.address)
		uniswapAdapter = await deployUniswapV2Adapter(accounts[10], uniswapFactory, weth)
		await whitelist.connect(accounts[10]).approve(uniswapAdapter.address)
		curveAdapter = await deployCurveAdapter(accounts[10], curveAddressProvider, weth)
		await whitelist.connect(accounts[10]).approve(curveAdapter.address)
		synthetixAdapter = await deploySynthetixAdapter(accounts[10], synthetixResolver, weth)
		await whitelist.connect(accounts[10]).approve(synthetixAdapter.address)
		metaStrategyAdapter = await deployMetaStrategyAdapter(accounts[10], controller, router, weth)
		await whitelist.connect(accounts[10]).approve(metaStrategyAdapter.address)
		compoundAdapter = await deployCompoundAdapter(
			accounts[10],
			new Contract(MAINNET_ADDRESSES.COMPOUND_COMPTROLLER, [], accounts[0]),
			weth,
			platform.oracles.registries.tokenRegistry,
			ESTIMATOR_CATEGORY.COMPOUND
		)
		await whitelist.connect(accounts[10]).approve(compoundAdapter.address)

		const { curveDepositZapRegistry, chainlinkRegistry } = platform.oracles.registries
		await tokens.registerTokens(
			accounts[10],
			strategyFactory,
			undefined,
			chainlinkRegistry,
			curveDepositZapRegistry,
			[synthetixAdapter.address]
		)
	})

	it('Should fail to deploy strategy: virtual item', async function () {
		const name = 'Fail Strategy'
		const symbol = 'FAIL'
		const positions = [{ token: VIRTUAL_ITEM, percentage: BigNumber.from(1000) }]
		strategyItems = prepareStrategy(positions, uniswapAdapter.address)

		expect(
			await isRevertedWith(
				strategyFactory
					.connect(accounts[1])
					.createStrategy(name, symbol, strategyItems, strategyState, router.address, '0x', {
						value: ethers.BigNumber.from('20000000000000000'),
					}),
				'Invalid item addr',
				'StrategyController.sol'
			)
		).to.be.true
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to deploy strategy: blocked token', async function () {
		const name = 'Fail Strategy'
		const symbol = 'FAIL'
		const positions = [
			{ token: '0x8dd5fbCe2F6a956C3022bA3663759011Dd51e73E', percentage: BigNumber.from(400) }, // TUSD blocked
			{
				token: tokens.sUSD,
				percentage: BigNumber.from(400),
				adapters: [uniswapAdapter.address, curveAdapter.address],
				path: [tokens.usdc],
			},
			{ token: tokens.sEUR, percentage: BigNumber.from(200), adapters: [synthetixAdapter.address], path: [] },
		]
		strategyItems = prepareStrategy(positions, uniswapAdapter.address)

		expect(
			await isRevertedWith(
				strategyFactory
					.connect(accounts[1])
					.createStrategy(name, symbol, strategyItems, strategyState, router.address, '0x', {
						value: ethers.BigNumber.from('20000000000000000'),
					}),
				'Token blocked',
				'StrategyController.sol'
			)
		).to.be.true
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should deploy strategy', async function () {
		const name = 'Test Strategy'
		const symbol = 'TEST'
		const positions = [
			{ token: crv.address, percentage: BigNumber.from(250) },
			{
				token: tokens.sUSD,
				percentage: BigNumber.from(0),
				adapters: [uniswapAdapter.address, curveAdapter.address],
				path: [tokens.usdc],
			},
			{ token: tokens.sBTC, percentage: BigNumber.from(250), adapters: [synthetixAdapter.address], path: [] },
			{ token: tokens.sEUR, percentage: BigNumber.from(250), adapters: [synthetixAdapter.address], path: [] },
			{
				token: tokens.cUSDT,
				percentage: BigNumber.from(250),
				adapters: [uniswapAdapter.address, compoundAdapter.address],
				path: [tokens.usdt],
			},
		]
		strategyItems = prepareStrategy(positions, uniswapAdapter.address)

		const tx = await strategyFactory
			.connect(accounts[1])
			.createStrategy(name, symbol, strategyItems, strategyState, router.address, '0x', {
				value: ethers.BigNumber.from('10000000000000000'),
			})

		const receipt = await tx.wait()
		console.log('Deployment Gas Used: ', receipt.gasUsed.toString())

		const strategyAddress = receipt.events.find((ev: Event) => ev.event === 'NewStrategy').args.strategy
		const Strategy = await platform.getStrategyContractFactory()
		strategy = await Strategy.attach(strategyAddress)

		expect(await controller.initialized(strategyAddress)).to.equal(true)

		const LibraryWrapper = await getContractFactory('LibraryWrapper', {
			libraries: {
				StrategyLibrary: platform.strategyLibrary.address,
				ControllerLibrary: controllerLibrary.address,
			},
		})
		wrapper = await LibraryWrapper.deploy(oracle.address, strategyAddress, controller.address)
		await wrapper.deployed()

		//await displayBalances(wrapper, strategyItems.map((item) => item.item), weth)
		expect(await wrapper.isBalanced()).to.equal(true)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to deploy strategy: meta cannot support synths', async function () {
		const name = 'Fail Strategy'
		const symbol = 'FAIL'
		const positions = [
			{
				token: strategy.address,
				percentage: BigNumber.from(1000),
				adapters: [metaStrategyAdapter.address],
				path: [],
			},
		]
		strategyItems = prepareStrategy(positions, uniswapAdapter.address)

		expect(
			await isRevertedWith(
				strategyFactory
					.connect(accounts[1])
					.createStrategy(name, symbol, strategyItems, strategyState, router.address, '0x', {
						value: ethers.BigNumber.from('20000000000000000'),
					}),
				'Synths not supported',
				'StrategyController.sol'
			)
		).to.be.true
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should withdrawAll on a portion of tokens', async function () {
		await increaseTime(600)
		const amount = (await strategy.balanceOf(accounts[1].address)).div(2)
		const tokenBalanceBefore = await seur.balanceOf(strategy.address)
		const tx = await strategy.connect(accounts[1]).withdrawAll(amount)
		const receipt = await tx.wait()
		console.log('Gas Used: ', receipt.gasUsed.toString())
		const tokenBalanceAfter = await seur.balanceOf(strategy.address)
		expect(tokenBalanceBefore.gt(tokenBalanceAfter)).to.equal(true)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should purchase a token, requiring a rebalance of strategy', async function () {
		// Approve the user to use the adapter
		const value = WeiPerEther.mul(100)
		await weth.connect(accounts[19]).deposit({ value: value })
		await weth.connect(accounts[19]).approve(uniswapAdapter.address, value)
		await uniswapAdapter
			.connect(accounts[19])
			.swap(value, 0, weth.address, crv.address, accounts[19].address, accounts[19].address)

		//await displayBalances(wrapper, strategyItems.map((item) => item.item), weth)
		expect(await wrapper.isBalanced()).to.equal(false)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should withdraw synths into reserve', async function () {
		await increaseTime(600)
		await controller.connect(accounts[1]).repositionSynths(strategy.address, susd.address)
		//await displayBalances(wrapper, strategyItems.map((item) => item.item), weth)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should rebalance strategy', async function () {
		await increaseTime(360)
		const tx = await controller.connect(accounts[1]).rebalance(strategy.address, router.address, '0x')
		const receipt = await tx.wait()
		console.log('Gas Used: ', receipt.gasUsed.toString())
		//await displayBalances(wrapper, strategyItems.map((item) => item.item), weth)
		expect(await wrapper.isBalanced()).to.equal(true)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should update SUSD trade data', async function () {
		const [adaptersBefore] = await strategy.getTradeData(tokens.sUSD)
		expect(adaptersBefore.length).to.be.equal(2)
		await controller.connect(accounts[1]).updateTradeData(strategy.address, tokens.sUSD, {
			adapters: [uniswapAdapter.address],
			path: [],
			cache: '0x',
		})
		// sanity check
		expect(
			await isRevertedWith(
				controller.connect(accounts[1]).finalizeTradeData(strategy.address),
				'Timelock active',
				'StrategyController.sol'
			)
		).to.be.true
		await increaseTime(60)
		await controller.connect(accounts[1]).finalizeTradeData(strategy.address)

		let [adaptersAfter] = await strategy.getTradeData(tokens.sUSD)
		expect(adaptersAfter.length).to.be.equal(1)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should purchase a token, requiring a rebalance of strategy', async function () {
		// Approve the user to use the adapter
		const value = await crv.balanceOf(accounts[19].address)
		await crv.connect(accounts[19]).approve(uniswapAdapter.address, value)
		await uniswapAdapter
			.connect(accounts[19])
			.swap(value, 0, crv.address, weth.address, accounts[19].address, accounts[19].address)

		//await displayBalances(wrapper, strategyItems.map((item) => item.item), weth)
		expect(await wrapper.isBalanced()).to.equal(false)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should withdraw synths into reserve', async function () {
		await increaseTime(600)
		await controller.connect(accounts[1]).repositionSynths(strategy.address, susd.address)
		//await displayBalances(wrapper, strategyItems.map((item) => item.item), weth)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should rebalance strategy', async function () {
		await increaseTime(360)
		const tx = await controller.connect(accounts[1]).rebalance(strategy.address, router.address, '0x')
		const receipt = await tx.wait()
		console.log('Gas Used: ', receipt.gasUsed.toString())
		//await displayBalances(wrapper, strategyItems.map((item) => item.item), weth)
		expect(await wrapper.isBalanced()).to.equal(true)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should restructure', async function () {
		const positions = [
			{ token: weth.address, percentage: BigNumber.from(200) },
			{ token: crv.address, percentage: BigNumber.from(400) },
			{
				token: tokens.sUSD,
				percentage: BigNumber.from(0),
				adapters: [uniswapAdapter.address, curveAdapter.address],
				path: [tokens.usdc],
			},
			{ token: tokens.sEUR, percentage: BigNumber.from(400), adapters: [synthetixAdapter.address], path: [] },
		]
		strategyItems = prepareStrategy(positions, uniswapAdapter.address)
		await controller.connect(accounts[1]).restructure(strategy.address, strategyItems)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should finalize structure', async function () {
		await increaseTime(600)
		await controller.connect(accounts[1]).repositionSynths(strategy.address, susd.address)
		await increaseTime(600)
		await controller.connect(accounts[1]).finalizeStructure(strategy.address, router.address, '0x')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to reposition synths into susd: within waiting period', async function () {
		await expect(
			controller.connect(accounts[1]).repositionSynths(strategy.address, susd.address)
		).to.be.revertedWith('Cannot settle during waiting period')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to reposition sEUR to sUSD: no redeemer adapter', async function () {
		await increaseTime(600)
		await expect(
			controller.connect(accounts[1]).repositionSynths(strategy.address, tokens.sEUR)
		).to.be.revertedWith('Invalid adapter index')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should reposition synths into susd and back', async function () {
		await increaseTime(600)
		await controller.connect(accounts[1]).repositionSynths(strategy.address, susd.address)

		expect(await seur.balanceOf(strategy.address)).to.be.eq(0)
		await increaseTime(600)

		await controller.connect(accounts[1]).repositionSynths(strategy.address, VIRTUAL_ITEM)

		expect(await susd.balanceOf(strategy.address)).to.be.equal(0)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should restructure', async function () {
		const positions = [
			{ token: weth.address, percentage: BigNumber.from(500) },
			{
				token: tokens.sUSD,
				percentage: BigNumber.from(500),
				adapters: [uniswapAdapter.address, curveAdapter.address],
				path: [tokens.usdc],
			},
		]
		strategyItems = prepareStrategy(positions, uniswapAdapter.address)
		await controller.connect(accounts[1]).restructure(strategy.address, strategyItems)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should finalize structure', async function () {
		await increaseTime(600)
		await controller.connect(accounts[1]).repositionSynths(strategy.address, susd.address)
		await increaseTime(600)
		await controller.connect(accounts[1]).finalizeStructure(strategy.address, router.address, '0x')
		expect((await strategy.synths()).length).to.be.equal(0)
		logTestComplete(this, __dirname, proofCounter++)
	})
})
