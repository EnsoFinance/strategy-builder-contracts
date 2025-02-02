import chai from 'chai'
const { expect } = chai
import { ethers, waffle } from 'hardhat'
import { Contract } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Tokens } from '../lib/tokens'
import { getLiveContracts } from '../lib/mainnet'
import { increaseTime, resetBlockchain, impersonate } from '../lib/utils'
import { initializeTestLogging, logTestComplete } from '../lib/convincer'
import deploymentsJSON from '../deployments.json'
import deprecatedJSON from '../deprecated.json'
import { TradeData } from '../lib/encode'
import { createLink, linkBytecode } from '../lib/link'
import { MAINNET_ADDRESSES, ITEM_CATEGORY, ESTIMATOR_CATEGORY } from '../lib/constants'
import WETH9 from '@uniswap/v2-periphery/build/WETH9.json'

import StrategyClaim from '../artifacts/contracts/libraries/StrategyClaim.sol/StrategyClaim.json'
import ControllerLibrary from '../artifacts/contracts/libraries/ControllerLibrary.sol/ControllerLibrary.json'
import StrategyController from '../artifacts/contracts/StrategyController.sol/StrategyController.json'
import StrategyProxyFactory from '../artifacts/contracts/StrategyProxyFactory.sol/StrategyProxyFactory.json'
const { constants, getSigners, getContractFactory } = ethers
const { WeiPerEther } = constants

const ownerAddress = '0xca702d224D61ae6980c8c7d4D98042E22b40FFdB'

// ATTN dev: Tests contracts deployed to mainnet. Integration testing updates to contracts require a redeployment of updated contract within this test.

describe('Live Estimates', function () {
	let proofCounter: number
	let accounts: SignerWithAddress[],
		contracts: { [key: string]: string },
		deprecated: { [key: string]: string },
		owner: SignerWithAddress,
		tokens: Tokens,
		weth: Contract,
		whitelist: Contract,
		router: Contract,
		controller: Contract,
		oracle: Contract,
		eDPI: Contract,
		eYLA: Contract,
		eNFTP: Contract,
		eETH2X: Contract,
		oldAdapters: string[],
		newAdapters: string[],
		controllerLens: Contract

	async function updateAdapters(strategy: Contract, controller: Contract) {
		// Impersonate manager
		const managerAddress = await strategy.manager()
		const manager = await impersonate(managerAddress)

		// Send funds to manager
		await accounts[19].sendTransaction({ to: managerAddress, value: WeiPerEther })

		const items = await strategy.items()
		for (let i = 0; i < items.length; i++) {
			let tradeData = await strategy.getTradeData(items[i])
			let adapters = [...tradeData.adapters]
			let shouldUpdate = false
			for (let j = 0; j < adapters.length; j++) {
				for (let k = 0; k < oldAdapters.length; k++) {
					if (adapters[j].toLowerCase() == oldAdapters[k].toLowerCase()) {
						adapters[j] = newAdapters[k]
						shouldUpdate = true
					}
				}
			}
			if (shouldUpdate) {
				await controller.connect(manager).updateTradeData(strategy.address, items[i], {
					...tradeData,
					adapters: adapters,
				})
				await increaseTime(5 * 60)
				await controller.connect(manager).finalizeTradeData(strategy.address)
			}
		}
	}

	async function updateTokenRegistry(
		strategyFactory: Contract,
		oldTokenRegistry: Contract,
		strategy: Contract,
		tokens: string[]
	) {
		let itemCategory, estimatorCategory
		for (let i = 0; i < tokens.length; i++) {
			// Set token
			estimatorCategory = await oldTokenRegistry.estimatorCategories(tokens[i])
			if (estimatorCategory.gt(0)) {
				itemCategory = await oldTokenRegistry.itemCategories(tokens[i])
				await strategyFactory.connect(owner).addItemToRegistry(itemCategory, estimatorCategory, tokens[i])
			}
			// Set path
			const tradeData = await strategy.getTradeData(tokens[i])
			let path = [...tradeData.path]
			for (let j = 0; j < path.length; j++) {
				estimatorCategory = await oldTokenRegistry.estimatorCategories(path[j])
				if (estimatorCategory.gt(0)) {
					itemCategory = await oldTokenRegistry.itemCategories(path[j])
					await strategyFactory.connect(owner).addItemToRegistry(itemCategory, estimatorCategory, path[j])
				}
			}
		}
	}

	before('Setup Uniswap + Factory', async function () {
		proofCounter = initializeTestLogging(this, __dirname)

		await resetBlockchain()

		const deployments: { [key: string]: { [key: string]: string } } = deploymentsJSON
		contracts = deployments['mainnet']
		deprecated = deprecatedJSON['1.0.10']

		accounts = await getSigners()
		// Impersonate owner
		owner = await impersonate(ownerAddress)

		// Send funds to owner
		await accounts[19].sendTransaction({ to: ownerAddress, value: WeiPerEther.mul(5) })

		tokens = new Tokens()
		weth = new Contract(tokens.weth, WETH9.abi, accounts[0])

		const enso = getLiveContracts(accounts[0])

		controller = enso.platform.controller
		const strategyFactory = enso.platform.strategyFactory
		const { tokenRegistry, uniswapV3Registry, chainlinkRegistry } = enso.platform.oracles.registries

		oracle = enso.platform.oracles.ensoOracle

		// Transfer token registry
		await tokenRegistry
			.connect(await impersonate(await tokenRegistry.owner()))
			.transferOwnership(strategyFactory.address)

		router = (
			await getContractFactory('FullRouter', {
				libraries: { StrategyLibrary: enso.platform.strategyLibrary.address },
			})
		).attach(contracts['FullRouter'])
		whitelist = enso.platform.administration.whitelist
		await whitelist.connect(owner).approve(router.address)

		let { aaveV2, aaveV2Debt, uniswapV3 } = enso.adapters

		await whitelist.connect(owner).approve(uniswapV3.address)

		await whitelist.connect(owner).approve(aaveV2.address)
		await whitelist.connect(owner).approve(aaveV2Debt.address)
		// Store new adapter addresses
		const deprecatedAdaptersNames = Object.keys(deprecated).filter((name) => {
			return name.indexOf('Adapter') > -1
		})
		const newAdaptersNames = Object.keys(contracts).filter((name) => {
			return deprecatedAdaptersNames.includes(name)
		})
		newAdapters = []
		oldAdapters = []
		for (let i = 0; i < newAdaptersNames.length; ++i) {
			newAdapters.push(contracts[newAdaptersNames[i]])
			oldAdapters.push(contracts[newAdaptersNames[i]])
		}
		let toWhitelist = ['']
		toWhitelist.pop()
		newAdapters.forEach((a) => {
			toWhitelist.push(a)
		})

		for (let i = 0; i < toWhitelist.length; ++i) {
			if (!(await whitelist.callStatic.approved(toWhitelist[i])))
				await whitelist.connect(owner).approve(toWhitelist[i])
		}

		const StrategyControllerLens = await getContractFactory('StrategyControllerLens')
		controllerLens = await StrategyControllerLens.deploy(
			enso.platform.controller.address,
			weth.address,
			enso.platform.strategyFactory.address
		)
		await controllerLens.deployed()

		const strategyClaim = await waffle.deployContract(accounts[0], StrategyClaim, [])
		await strategyClaim.deployed()

		const Strategy = await getContractFactory('Strategy', {
			libraries: { StrategyClaim: strategyClaim.address },
		})
		console.log('strategy size:', Strategy.bytecode.length / 2 - 1)
		eDPI = await Strategy.attach('0x890ed1ee6d435a35d51081ded97ff7ce53be5942')
		eYLA = await Strategy.attach('0xb41a7a429c73aa68683da1389051893fe290f614')
		eNFTP = await Strategy.attach('16f7a9c3449f9c67e8c7e8f30ae1ee5d7b8ed10d')
		eETH2X = await Strategy.attach('0x81cddbf4a9d21cf52ef49bda5e5d5c4ae2e40b3e')
		const strategies = [eDPI, eYLA, eNFTP, eETH2X]

		// update to latest `Strategy`
		const newImplementation = await Strategy.deploy(
			strategyFactory.address,
			controller.address,
			MAINNET_ADDRESSES.SYNTHETIX_ADDRESS_PROVIDER,
			MAINNET_ADDRESSES.AAVE_ADDRESS_PROVIDER
		)

		const version = await strategyFactory.callStatic.version()
		await strategyFactory.connect(owner).updateImplementation(newImplementation.address, (version + 1).toString())

		const admin = await strategyFactory.admin()
		const StrategyAdmin = await getContractFactory('StrategyProxyAdmin')
		const strategyAdmin = await StrategyAdmin.attach(admin)

		const controllerLibraryLink = createLink(ControllerLibrary, enso.platform.controllerLibrary.address)

		// Controller Implementation
		const newControllerImplementation = await waffle.deployContract(
			accounts[0],
			linkBytecode(StrategyController, [controllerLibraryLink]),
			[strategyFactory.address]
		)

		await newControllerImplementation.deployed()
		const platformProxyAdmin = enso.platform.administration.platformProxyAdmin
		await platformProxyAdmin.connect(owner).upgrade(controller.address, newControllerImplementation.address)

		// Factory Implementation
		const factoryImplementation = await waffle.deployContract(owner, StrategyProxyFactory, [controller.address])
		await factoryImplementation.deployed()
		await platformProxyAdmin.connect(owner).upgrade(strategyFactory.address, factoryImplementation.address)

		// Update factory/controller addresses (NOTE: must update oracle before registry)
		await strategyFactory.connect(owner).updateOracle(oracle.address)
		await strategyFactory.connect(owner).updateRegistry(tokenRegistry.address)
		await controller.connect(owner).updateAddresses()

		if ((await chainlinkRegistry.owner()).toLowerCase() !== owner.address.toLowerCase)
			await chainlinkRegistry
				.connect(await impersonate(await chainlinkRegistry.owner()))
				.transferOwnership(owner.address)

		if ((await uniswapV3Registry.owner()).toLowerCase() !== owner.address.toLowerCase)
			await uniswapV3Registry
				.connect(await impersonate(await uniswapV3Registry.owner()))
				.transferOwnership(owner.address)

		// Update token registry
		await tokens.registerTokens(owner, strategyFactory, uniswapV3Registry)
		let tradeData: TradeData = {
			adapters: [],
			path: [],
			cache: '0x',
		}

		await strategyFactory
			.connect(owner)
			.addItemDetailedToRegistry(
				ITEM_CATEGORY.BASIC,
				ESTIMATOR_CATEGORY.AAVE_V2,
				tokens.aWETH,
				tradeData,
				aaveV2.address
			)

		for (let i = 0; i < strategies.length; i++) {
			const s = strategies[i]
			const mgr = await impersonate(await s.manager())
			await strategyAdmin.connect(mgr).upgrade(s.address)
			await updateAdapters(s, controller)
			await s.connect(accounts[3]).updateRewards() // anyone calls
			// Update token registry using old token registry
			await updateTokenRegistry(
				strategyFactory,
				enso.platform.oracles.registries.tokenRegistry,
				s,
				await s.items()
			)
			await updateTokenRegistry(
				strategyFactory,
				enso.platform.oracles.registries.tokenRegistry,
				s,
				await s.debt()
			)
		}
	})

	it('Should be initialized.', async function () {
		/*
		 * if the latest `Strategy` implementation incorrectly updates storage
		 * then the deployed instance would incorrectly (and dangerously)
		 * not be deemed initialized.
		 */

		// now call initialize
		const someMaliciousAddress = accounts[8].address
		await expect(
			eDPI.initialize('anyName', 'anySymbol', 'anyVersion', someMaliciousAddress, [])
		).to.be.revertedWith('Initializable: contract is already initialized')
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should estimate deposit eETH2X', async function () {
		const [totalBefore] = await oracle.estimateStrategy(eETH2X.address)
		const depositAmount = WeiPerEther
		const estimatedDepositValue = await controllerLens.callStatic.estimateDeposit(
			eETH2X.address,
			router.address,
			depositAmount,
			0,
			'0x'
		)
		console.log('Estimated deposit value: ', estimatedDepositValue.toString())
		await controller
			.connect(accounts[1])
			.deposit(eETH2X.address, router.address, 0, 0, '0x', { value: depositAmount })
		const [totalAfter] = await oracle.estimateStrategy(eETH2X.address)
		console.log('Actual deposit value: ', totalAfter.sub(totalBefore).toString())
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should estimate withdraw eETH2X', async function () {
		await increaseTime(1)
		const withdrawAmount = await eETH2X.balanceOf(accounts[1].address)
		const wethBefore = await weth.balanceOf(accounts[1].address)
		await eETH2X.connect(accounts[1]).approve(controllerLens.address, withdrawAmount)
		const estimatedWithdrawValue = await controllerLens
			.connect(accounts[1])
			.callStatic.estimateWithdrawWETH(eETH2X.address, router.address, withdrawAmount, 0, '0x')
		console.log('Estimated withdraw value: ', estimatedWithdrawValue.toString())
		let tx = await controller
			.connect(accounts[1])
			.withdrawWETH(eETH2X.address, router.address, withdrawAmount, 0, '0x')
		const receipt = await tx.wait()
		console.log('Withdraw Gas Used: ', receipt.gasUsed.toString())
		const wethAfter = await weth.balanceOf(accounts[1].address)
		console.log('Actual withdraw amount: ', wethAfter.sub(wethBefore).toString())
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should estimate deposit eDPI', async function () {
		const [totalBefore] = await oracle.estimateStrategy(eDPI.address)
		const depositAmount = WeiPerEther
		const estimatedDepositValue = await controllerLens.callStatic.estimateDeposit(
			eDPI.address,
			router.address,
			depositAmount,
			0,
			'0x'
		)
		console.log('Estimated deposit value: ', estimatedDepositValue.toString())
		await controller
			.connect(accounts[1])
			.deposit(eDPI.address, router.address, 0, 0, '0x', { value: depositAmount })
		const [totalAfter] = await oracle.estimateStrategy(eDPI.address)
		console.log('Actual deposit value: ', totalAfter.sub(totalBefore).toString())
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should estimate withdraw eDPI', async function () {
		await increaseTime(1)
		const withdrawAmount = await eDPI.balanceOf(accounts[1].address)
		const wethBefore = await weth.balanceOf(accounts[1].address)
		await eDPI.connect(accounts[1]).approve(controllerLens.address, withdrawAmount)
		const estimatedWithdrawValue = await controllerLens
			.connect(accounts[1])
			.callStatic.estimateWithdrawWETH(eDPI.address, router.address, withdrawAmount, 0, '0x')
		console.log('Estimated withdraw value: ', estimatedWithdrawValue.toString())
		let tx = await controller
			.connect(accounts[1])
			.withdrawWETH(eDPI.address, router.address, withdrawAmount, 0, '0x')
		const receipt = await tx.wait()
		console.log('Withdraw Gas Used: ', receipt.gasUsed.toString())
		const wethAfter = await weth.balanceOf(accounts[1].address)
		console.log('Actual withdraw amount: ', wethAfter.sub(wethBefore).toString())
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should estimate deposit eYLA', async function () {
		await increaseTime(1)
		const [totalBefore] = await oracle.estimateStrategy(eYLA.address)
		const depositAmount = WeiPerEther
		const estimatedDepositValue = await controllerLens.callStatic.estimateDeposit(
			eYLA.address,
			router.address,
			depositAmount,
			0,
			'0x'
		)
		console.log('Estimated deposit value: ', estimatedDepositValue.toString())
		await controller
			.connect(accounts[1])
			.deposit(eYLA.address, router.address, 0, 0, '0x', { value: depositAmount })
		const [totalAfter] = await oracle.estimateStrategy(eYLA.address)
		console.log('Actual deposit value: ', totalAfter.sub(totalBefore).toString())
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should estimate withdraw eYLA', async function () {
		await increaseTime(1)
		const withdrawAmount = await eYLA.balanceOf(accounts[1].address)
		const wethBefore = await weth.balanceOf(accounts[1].address)
		await eYLA.connect(accounts[1]).approve(controllerLens.address, withdrawAmount)
		const estimatedWithdrawValue = await controllerLens
			.connect(accounts[1])
			.callStatic.estimateWithdrawWETH(eYLA.address, router.address, withdrawAmount, 0, '0x')
		console.log('Estimated withdraw value: ', estimatedWithdrawValue.toString())
		let tx = await controller
			.connect(accounts[1])
			.withdrawWETH(eYLA.address, router.address, withdrawAmount, 0, '0x')
		const receipt = await tx.wait()
		console.log('Withdraw Gas Used: ', receipt.gasUsed.toString())
		const wethAfter = await weth.balanceOf(accounts[1].address)
		console.log('Actual withdraw amount: ', wethAfter.sub(wethBefore).toString())
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should estimate deposit eNFTP', async function () {
		await increaseTime(1)
		const [totalBefore] = await oracle.estimateStrategy(eNFTP.address)
		const depositAmount = WeiPerEther
		const estimatedDepositValue = await controllerLens.callStatic.estimateDeposit(
			eNFTP.address,
			router.address,
			depositAmount,
			0,
			'0x'
		)
		console.log('Estimated deposit value: ', estimatedDepositValue.toString())
		await controller
			.connect(accounts[1])
			.deposit(eNFTP.address, router.address, 0, 0, '0x', { value: depositAmount })
		const [totalAfter] = await oracle.estimateStrategy(eNFTP.address)
		console.log('Actual deposit value: ', totalAfter.sub(totalBefore).toString())
		logTestComplete(this, __dirname, proofCounter++)
	})

	it('Should estimate withdraw eNFTP', async function () {
		await increaseTime(1)
		const withdrawAmount = await eNFTP.balanceOf(accounts[1].address)
		const wethBefore = await weth.balanceOf(accounts[1].address)
		await eNFTP.connect(accounts[1]).approve(controllerLens.address, withdrawAmount)
		const estimatedWithdrawValue = await controllerLens
			.connect(accounts[1])
			.callStatic.estimateWithdrawWETH(eNFTP.address, router.address, withdrawAmount, 0, '0x')
		console.log('Estimated withdraw value: ', estimatedWithdrawValue.toString())
		let tx = await controller
			.connect(accounts[1])
			.withdrawWETH(eNFTP.address, router.address, withdrawAmount, 0, '0x')
		const receipt = await tx.wait()
		console.log('Withdraw Gas Used: ', receipt.gasUsed.toString())
		const wethAfter = await weth.balanceOf(accounts[1].address)
		console.log('Actual withdraw amount: ', wethAfter.sub(wethBefore).toString())
		logTestComplete(this, __dirname, proofCounter++)
	})
})
