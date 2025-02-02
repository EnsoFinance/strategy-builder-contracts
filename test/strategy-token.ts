const hre = require('hardhat')
const { ethers } = hre
const chai = require('chai')
const { constants, getSigners } = ethers
const { AddressZero, WeiPerEther } = constants
const BigNumJs = require('bignumber.js')
import { solidity } from 'ethereum-waffle'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber, Contract, Event } from 'ethers'
import { preparePermit, prepareStrategy, Position, StrategyItem, InitialState } from '../lib/encode'
import {
	Platform,
	deployTokens,
	deployUniswapV2,
	deployUniswapV2Adapter,
	deployPlatform,
	deployLoopRouter,
} from '../lib/deploy'
import { isRevertedWith } from '../lib/errors'
import { initializeTestLogging, logTestComplete } from '../lib/convincer'

const NUM_TOKENS = 15

chai.use(solidity)
describe('StrategyToken', function () {
	let proofCounter: number
	let platform: Platform,
		tokens: Contract[],
		weth: Contract,
		accounts: SignerWithAddress[],
		uniswapFactory: Contract,
		strategyFactory: Contract,
		controller: Contract,
		whitelist: Contract,
		router: Contract,
		oracle: Contract,
		adapter: Contract,
		strategy: Contract,
		strategyItems: StrategyItem[],
		amount: BigNumber,
		total: BigNumber

	before('Setup Uniswap + Factory', async function () {
		proofCounter = initializeTestLogging(this, __dirname)
		accounts = await getSigners()
		tokens = await deployTokens(accounts[10], NUM_TOKENS, WeiPerEther.mul(100 * (NUM_TOKENS - 1)))
		weth = tokens[0]
		uniswapFactory = await deployUniswapV2(accounts[10], tokens)
		platform = await deployPlatform(accounts[10], uniswapFactory, new Contract(AddressZero, [], accounts[10]), weth)
		controller = platform.controller
		strategyFactory = platform.strategyFactory
		oracle = platform.oracles.ensoOracle
		whitelist = platform.administration.whitelist
		adapter = await deployUniswapV2Adapter(accounts[10], uniswapFactory, weth)
		await whitelist.connect(accounts[10]).approve(adapter.address)
		router = await deployLoopRouter(accounts[10], controller, platform.strategyLibrary)
		await whitelist.connect(accounts[10]).approve(router.address)
		const Strategy = await platform.getStrategyContractFactory()
		const strategyImplementation = await Strategy.connect(accounts[10]).deploy(
			strategyFactory.address,
			controller.address,
			AddressZero,
			AddressZero
		)
		await strategyImplementation.deployed()
		await strategyFactory.connect(accounts[10]).updateImplementation(strategyImplementation.address, '2')
	})

	it('Should deploy strategy', async function () {
		const positions: Position[] = [
			{ token: tokens[1].address, percentage: BigNumber.from(200) },
			{ token: tokens[2].address, percentage: BigNumber.from(200) },
			{ token: tokens[3].address, percentage: BigNumber.from(50) },
			{ token: tokens[4].address, percentage: BigNumber.from(50) },
			{ token: tokens[5].address, percentage: BigNumber.from(50) },
			{ token: tokens[6].address, percentage: BigNumber.from(50) },
			{ token: tokens[7].address, percentage: BigNumber.from(50) },
			{ token: tokens[8].address, percentage: BigNumber.from(50) },
			{ token: tokens[9].address, percentage: BigNumber.from(50) },
			{ token: tokens[10].address, percentage: BigNumber.from(50) },
			{ token: tokens[11].address, percentage: BigNumber.from(50) },
			{ token: tokens[12].address, percentage: BigNumber.from(50) },
			{ token: tokens[13].address, percentage: BigNumber.from(50) },
			{ token: tokens[14].address, percentage: BigNumber.from(50) },
		]
		strategyItems = prepareStrategy(positions, adapter.address)
		const strategyState: InitialState = {
			timelock: BigNumber.from(60),
			rebalanceThreshold: BigNumber.from(10),
			rebalanceSlippage: BigNumber.from(997),
			restructureSlippage: BigNumber.from(995),
			managementFee: BigNumber.from(0),
			social: false,
			set: true,
		}

		amount = BigNumber.from('10000000000000000')
		let tx = await strategyFactory
			.connect(accounts[1])
			.createStrategy('Test Strategy', 'TEST', strategyItems, strategyState, router.address, '0x', {
				value: amount,
			})
		let receipt = await tx.wait()
		console.log('Deployment Gas Used: ', receipt.gasUsed.toString())

		const strategyAddress = receipt.events.find((ev: Event) => ev.event === 'NewStrategy').args.strategy
		const Strategy = await platform.getStrategyContractFactory()
		strategy = Strategy.attach(strategyAddress)
		;[total] = await oracle.estimateStrategy(strategy.address)
		expect(BigNumber.from(await strategy.totalSupply()).eq(total)).to.equal(true)
		expect(BigNumber.from(await strategy.balanceOf(accounts[1].address)).eq(total)).to.equal(true)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should get name', async function () {
		expect(await strategy.name()).to.equal('Test Strategy')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should get symbol', async function () {
		expect(await strategy.symbol()).to.equal('TEST')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should get decimals', async function () {
		expect(BigNumber.from(await strategy.decimals()).toString()).to.equal('18')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to transfer tokens: insufficient funds', async function () {
		const tooMuch = total.mul(2)
		await expect(strategy.connect(accounts[1]).transfer(accounts[2].address, tooMuch)).to.be.revertedWith('')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to transfer tokens: zero recipient', async function () {
		await expect(strategy.connect(accounts[1]).transfer(AddressZero, amount)).to.be.revertedWith('')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should transfer tokens', async function () {
		amount = total.div(2)
		await strategy.connect(accounts[1]).transfer(accounts[2].address, amount)
		expect(BigNumber.from(await strategy.balanceOf(accounts[2].address)).eq(amount)).to.equal(true)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to approve tokens: zero spender', async function () {
		await expect(strategy.connect(accounts[1]).approve(AddressZero, amount)).to.be.revertedWith('')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should approve tokens', async function () {
		await strategy.connect(accounts[1]).approve(accounts[2].address, amount)
		expect(BigNumber.from(await strategy.allowance(accounts[1].address, accounts[2].address)).eq(amount)).to.equal(
			true
		)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to transferFrom tokens: zero spender', async function () {
		await expect(
			strategy.connect(accounts[2]).transferFrom(AddressZero, accounts[2].address, amount)
		).to.be.revertedWith('')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to transferFrom tokens: zero recipient', async function () {
		await expect(
			strategy.connect(accounts[2]).transferFrom(accounts[1].address, AddressZero, amount)
		).to.be.revertedWith('')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should transferFrom tokens', async function () {
		expect(await strategy.balanceOf(accounts[1].address)).to.eq(amount)
		expect(await strategy.allowance(accounts[1].address, accounts[2].address)).to.eq(amount)
		const tx = await strategy.connect(accounts[2]).transferFrom(accounts[1].address, accounts[2].address, amount)
		const receipt = await tx.wait()
		console.log('Gas usage', receipt.gasUsed.toString())
		expect(BigNumber.from(await strategy.balanceOf(accounts[2].address)).eq(amount.mul(2))).to.equal(true)
		expect(BigNumber.from(await strategy.balanceOf(accounts[1].address)).eq(0)).to.equal(true)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to update manager: not manager', async function () {
		await expect(strategy.connect(accounts[2]).updateManager(accounts[2].address)).to.be.revertedWith('')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should update manager', async function () {
		await strategy.connect(accounts[1]).updateManager(accounts[2].address)
		expect(await strategy.manager()).to.equal(accounts[2].address)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to permit: signer not owner', async function () {
		const owner = accounts[2]
		const spender = accounts[1]
		const deadline = constants.MaxUint256

		const [name, chainId, nonce] = await Promise.all([
			strategy.name(),
			strategy.chainId(),
			strategy.nonces(owner.address),
		])
		const typedData = {
			types: {
				EIP712Domain: [
					{ name: 'name', type: 'string' },
					{ name: 'version', type: 'uint256' },
					{ name: 'chainId', type: 'uint256' },
					{ name: 'verifyingContract', type: 'address' },
				],
				Permit: [
					{ name: 'owner', type: 'address' },
					{ name: 'spender', type: 'address' },
					{ name: 'value', type: 'uint256' },
					{ name: 'nonce', type: 'uint256' },
					{ name: 'deadline', type: 'uint256' },
				],
			},
			primaryType: 'Permit',
			domain: {
				name: name,
				version: 1,
				chainId: chainId.toString(),
				verifyingContract: strategy.address,
			},
			message: {
				owner: owner.address,
				spender: spender.address,
				value: 1,
				nonce: nonce.toString(),
				deadline: deadline.toString(),
			},
		}
		//Spender tries to sign transaction instead of owner
		const { v, r, s } = ethers.utils.splitSignature(
			await ethers.provider.send('eth_signTypedData_v4', [spender.address, typedData])
		)

		await expect(
			strategy.connect(spender).permit(owner.address, spender.address, 1, deadline, v, r, s)
		).to.be.revertedWith('Invalid signature')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to permit: past deadline', async function () {
		const owner = accounts[2]
		const spender = accounts[1]
		const { v, r, s } = await preparePermit(strategy, owner, spender, BigNumber.from(1), BigNumber.from(0))
		await expect(strategy.connect(owner).permit(owner.address, spender.address, 1, 0, v, r, s)).to.be.revertedWith(
			'Expired deadline'
		)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should permit', async function () {
		amount = BigNumber.from(await strategy.balanceOf(accounts[2].address))
		const owner = accounts[2]
		const spender = accounts[1]
		const deadline = BigNumber.from(constants.MaxUint256)
		expect(await strategy.balanceOf(owner.address)).to.be.gte(amount)
		const { v, r, s } = await preparePermit(strategy, owner, spender, amount, deadline)
		await strategy.connect(owner).permit(owner.address, spender.address, amount, deadline, v, r, s)
		expect(amount.eq(await strategy.allowance(owner.address, spender.address))).to.equal(true)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should transferFrom tokens', async function () {
		strategy.connect(accounts[1]).transferFrom(accounts[2].address, accounts[1].address, amount)
		expect(BigNumber.from(await strategy.balanceOf(accounts[1].address)).eq(amount)).to.equal(true)
		expect(BigNumber.from(await strategy.balanceOf(accounts[2].address)).eq(0)).to.equal(true)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to withdraw: no strategy tokens', async function () {
		await expect(strategy.connect(accounts[0]).withdrawAll(1)).to.be.revertedWith('Amount exceeds balance')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to withdraw: no amount passed', async function () {
		expect(await isRevertedWith(strategy.connect(accounts[1]).withdrawAll(0), '0 amount', 'Strategy.sol')).to.be
			.true
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should withdraw', async function () {
		amount = BigNumber.from('10000000000000')
		const tokenBalanceBefore = BigNumJs((await tokens[1].balanceOf(strategy.address)).toString())
		const tx = await strategy.connect(accounts[1]).withdrawAll(amount)
		const receipt = await tx.wait()
		console.log('Gas Used: ', receipt.gasUsed.toString())
		const tokenBalanceAfter = BigNumJs((await tokens[1].balanceOf(strategy.address)).toString())
		expect(tokenBalanceBefore.gt(tokenBalanceAfter)).to.equal(true)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should fail to decrease allowance: more than allowed', async function () {
		await expect(strategy.connect(accounts[1]).decreaseAllowance(accounts[2].address, 1)).to.be.revertedWith(
			'ERC20: decreased allowance < 0'
		)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should increase allowance', async function () {
		await strategy.connect(accounts[1]).increaseAllowance(accounts[2].address, 1)
		expect((await strategy.allowance(accounts[1].address, accounts[2].address)).eq(1)).to.equal(true)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should decrease allowance', async function () {
		await strategy.connect(accounts[1]).decreaseAllowance(accounts[2].address, 1)
		expect((await strategy.allowance(accounts[1].address, accounts[2].address)).eq(0)).to.equal(true)
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should deploy strategy for', async function () {
		const positions: Position[] = [
			{ token: tokens[1].address, percentage: BigNumber.from(200) },
			{ token: tokens[2].address, percentage: BigNumber.from(200) },
			{ token: tokens[3].address, percentage: BigNumber.from(50) },
			{ token: tokens[4].address, percentage: BigNumber.from(50) },
			{ token: tokens[5].address, percentage: BigNumber.from(50) },
			{ token: tokens[6].address, percentage: BigNumber.from(50) },
			{ token: tokens[7].address, percentage: BigNumber.from(50) },
			{ token: tokens[8].address, percentage: BigNumber.from(50) },
			{ token: tokens[9].address, percentage: BigNumber.from(50) },
			{ token: tokens[10].address, percentage: BigNumber.from(50) },
			{ token: tokens[11].address, percentage: BigNumber.from(50) },
			{ token: tokens[12].address, percentage: BigNumber.from(50) },
			{ token: tokens[13].address, percentage: BigNumber.from(50) },
			{ token: tokens[14].address, percentage: BigNumber.from(50) },
		]
		strategyItems = prepareStrategy(positions, adapter.address)
		const strategyState: InitialState = {
			timelock: BigNumber.from(60),
			rebalanceThreshold: BigNumber.from(10),
			rebalanceSlippage: BigNumber.from(997),
			restructureSlippage: BigNumber.from(995),
			managementFee: BigNumber.from(0),
			social: false,
			set: true,
		}

		const forManager = accounts[7]
		const domain = {
			name: 'StrategyProxyFactory',
			version: '1',
			chainId: await forManager.getChainId(),
			verifyingContract: strategyFactory.address,
		}
		const types = {
			Create: [
				{ name: 'name', type: 'string' },
				{ name: 'symbol', type: 'string' },
			],
		}

		const value = {
			name: 'Test Strategy',
			symbol: 'TEST',
		}
		const signature = await forManager._signTypedData(domain, types, value)

		amount = BigNumber.from('10000000000000000')
		let tx = await strategyFactory
			.connect(accounts[1])
			.createStrategyFor(
				forManager.address,
				value.name,
				value.symbol,
				strategyItems,
				strategyState,
				router.address,
				'0x',
				signature,
				{ value: amount }
			)
		let receipt = await tx.wait()
		console.log('Deployment Gas Used: ', receipt.gasUsed.toString())

		const strategyAddress = receipt.events.find((ev: Event) => ev.event === 'NewStrategy').args.strategy
		const Strategy = await platform.getStrategyContractFactory()
		const strategyFor = Strategy.attach(strategyAddress)

		expect((await strategyFor.manager()).toLowerCase()).to.be.deep.equal(forManager.address.toLowerCase())
		;[total] = await oracle.estimateStrategy(strategyFor.address)
		expect(BigNumber.from(await strategyFor.totalSupply()).eq(total)).to.equal(true)
		expect(BigNumber.from(await strategyFor.balanceOf(forManager.address)).eq(total)).to.equal(true)
		logTestComplete(this, __dirname, proofCounter++)
	})
})
