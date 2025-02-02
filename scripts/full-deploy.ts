// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import hre from 'hardhat'
import fs from 'fs'
import { Contract } from 'ethers'
import { waitForDeployment, waitForTransaction, TransactionArgs } from './common'
import { ESTIMATOR_CATEGORY, ITEM_CATEGORY } from '../lib/constants'

// If true it will deploy contract regardless of whether there is an address currently on the network
let overwrite = false

let network: string
if (process.env.HARDHAT_NETWORK) network = process.env.HARDHAT_NETWORK

type Addresses = {
	weth: string
	susd: string
	usdc: string
	uniswapV2Factory: string
	uniswapV3Factory: string
	uniswapV3Router: string
	kyberFactory: string
	kyberRouter: string
	sushiFactory: string
	aaveIncentivesController: string
	aaveAddressProvider: string
	curveAddressProvider: string
	synthetixAddressProvider: string
	synthRedeemer: string
	balancerRegistry: string
	compoundComptroller: string
	ensoPool: string
}

const deployedContracts: { [key: string]: Addresses } = {
	mainnet: {
		weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
		susd: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51',
		usdc: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
		uniswapV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
		uniswapV3Factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
		uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
		kyberFactory: '0x833e4083B7ae46CeA85695c4f7ed25CDAd8886dE',
		kyberRouter: '0x1c87257f5e8609940bc751a07bb085bb7f8cdbe6',
		sushiFactory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
		aaveIncentivesController: '0xd784927ff2f95ba542bfc824c8a8a98f3495f6b5',
		aaveAddressProvider: '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
		curveAddressProvider: '0x0000000022D53366457F9d5E68Ec105046FC4383',
		synthetixAddressProvider: '0x823bE81bbF96BEc0e25CA13170F5AaCb5B79ba83',
		synthRedeemer: '0xe533139Af961c9747356D947838c98451015e234',
		balancerRegistry: '0x65e67cbc342712DF67494ACEfc06fe951EE93982',
		compoundComptroller: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
		ensoPool: '0xEE0e85c384F7370FF3eb551E92A71A4AFc1B259F', // treasury multisig
	},
	localhost: {
		weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
		susd: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51',
		usdc: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
		uniswapV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
		uniswapV3Factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
		uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
		kyberFactory: '0x833e4083B7ae46CeA85695c4f7ed25CDAd8886dE',
		kyberRouter: '0x1c87257f5e8609940bc751a07bb085bb7f8cdbe6',
		sushiFactory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
		aaveIncentivesController: '0xd784927ff2f95ba542bfc824c8a8a98f3495f6b5',
		aaveAddressProvider: '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
		curveAddressProvider: '0x0000000022D53366457F9d5E68Ec105046FC4383',
		synthetixAddressProvider: '0x823bE81bbF96BEc0e25CA13170F5AaCb5B79ba83',
		synthRedeemer: '0xe533139Af961c9747356D947838c98451015e234',
		balancerRegistry: '0x65e67cbc342712DF67494ACEfc06fe951EE93982',
		compoundComptroller: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
		ensoPool: '0x0c58B57E2e0675eDcb2c7c0f713320763Fc9A77b', // template address
	},
	kovan: {
		weth: '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
		susd: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51',
		usdc: '0xe22da380ee6B445bb8273C81944ADEB6E8450422',
		uniswapV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
		uniswapV3Factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
		uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
		kyberFactory: '',
		kyberRouter: '',
		sushiFactory: '',
		aaveIncentivesController: '0xd784927ff2f95ba542bfc824c8a8a98f3495f6b5',
		aaveAddressProvider: '0x88757f2f99175387aB4C6a4b3067c77A695b0349',
		curveAddressProvider: '',
		synthetixAddressProvider: '0x84f87E3636Aa9cC1080c07E6C61aDfDCc23c0db6',
		synthRedeemer: '0xe533139Af961c9747356D947838c98451015e234',
		balancerRegistry: '',
		compoundComptroller: '',
		ensoPool: '0x0c58B57E2e0675eDcb2c7c0f713320763Fc9A77b',
	},
}

async function main() {
	// Hardhat always runs the compile task when running scripts with its command
	// line interface.
	//
	// If this script is run directly using `node` you may want to call compile
	// manually to make sure everything is compiled
	// await hre.run('compile');
	const [signer] = await hre.ethers.getSigners()
	const owner = network == 'mainnet' ? '0xca702d224D61ae6980c8c7d4D98042E22b40FFdB' : signer.address //smart contract upgrades multisig
	console.log('Owner: ', owner)

	const deployer = new Deployer(signer, network, overwrite)

	// Setup libraries
	const strategyLibraryAddress = await deployer.deployOrGetAddress('StrategyLibrary', [])
	const controllerLibraryAddress = await deployer.deployOrGetAddress('ControllerLibrary', [], {
		StrategyLibrary: strategyLibraryAddress,
	})
	const strategyClaimAddress = await deployer.deployOrGetAddress('StrategyClaim', [])

	//Setup library-dependent contract factories
	const Strategy = await hre.ethers.getContractFactory('Strategy', {
		libraries: {
			StrategyClaim: strategyClaimAddress,
		},
	})
	const StrategyController = await hre.ethers.getContractFactory('StrategyController', {
		libraries: {
			ControllerLibrary: controllerLibraryAddress,
		},
	})
	const LoopRouter = await hre.ethers.getContractFactory('LoopRouter', {
		libraries: {
			StrategyLibrary: strategyLibraryAddress,
		},
	})
	const FullRouter = await hre.ethers.getContractFactory('FullRouter', {
		libraries: {
			StrategyLibrary: strategyLibraryAddress,
		},
	})
	const BatchDepositRouter = await hre.ethers.getContractFactory('BatchDepositRouter', {
		libraries: {
			StrategyLibrary: strategyLibraryAddress,
		},
	})

	// Setup other contract factories
	const TokenRegistry = await hre.ethers.getContractFactory('TokenRegistry')
	const CurveDepositZapRegistry = await hre.ethers.getContractFactory('CurveDepositZapRegistry')
	const UniswapV3Registry = await hre.ethers.getContractFactory('UniswapV3Registry')
	const ChainlinkRegistry = await hre.ethers.getContractFactory('ChainlinkRegistry')
	const UniswapOracle = await hre.ethers.getContractFactory('UniswapV3Oracle')
	const ChainlinkOracle = await hre.ethers.getContractFactory('ChainlinkOracle')
	const EnsoOracle = await hre.ethers.getContractFactory('EnsoOracle')
	const BasicEstimator = await hre.ethers.getContractFactory('BasicEstimator')
	const AaveV2Estimator = await hre.ethers.getContractFactory('AaveV2Estimator')
	const AaveV2DebtEstimator = await hre.ethers.getContractFactory('AaveV2DebtEstimator')
	const CompoundEstimator = await hre.ethers.getContractFactory('CompoundEstimator')
	const CurveLPEstimator = await hre.ethers.getContractFactory('CurveLPEstimator')
	const CurveGaugeEstimator = await hre.ethers.getContractFactory('CurveGaugeEstimator')
	const EmergencyEstimator = await hre.ethers.getContractFactory('EmergencyEstimator')
	const StrategyEstimator = await hre.ethers.getContractFactory('StrategyEstimator')
	//const UniswapV2LPEstimator = await hre.ethers.getContractFactory('UniswapV2LPEstimator')
	const YEarnV2Estimator = await hre.ethers.getContractFactory('YEarnV2Estimator')
	const Whitelist = await hre.ethers.getContractFactory('Whitelist')
	const PlatformProxyAdmin = await hre.ethers.getContractFactory('PlatformProxyAdmin')
	const StrategyProxyFactory = await hre.ethers.getContractFactory('StrategyProxyFactory')
	const StrategyControllerPaused = await hre.ethers.getContractFactory('StrategyControllerPaused')
	const MulticallRouter = await hre.ethers.getContractFactory('MulticallRouter')
	const BalancerAdapter = await hre.ethers.getContractFactory('BalancerAdapter')
	const UniswapV2Adapter = await hre.ethers.getContractFactory('UniswapV2Adapter')
	//const UniswapV2LPAdapter = await hre.ethers.getContractFactory('UniswapV2LPAdapter')
	const UniswapV3Adapter = await hre.ethers.getContractFactory('UniswapV3Adapter')
	const MetaStrategyAdapter = await hre.ethers.getContractFactory('MetaStrategyAdapter')
	const SynthetixAdapter = await hre.ethers.getContractFactory('SynthetixAdapter')
	const SynthRedeemerAdapter = await hre.ethers.getContractFactory('SynthRedeemerAdapter')
	const CurveAdapter = await hre.ethers.getContractFactory('CurveAdapter')
	const CurveLPAdapter = await hre.ethers.getContractFactory('CurveLPAdapter')
	const CurveGaugeAdapter = await hre.ethers.getContractFactory('CurveGaugeAdapter')
	const AaveV2Adapter = await hre.ethers.getContractFactory('AaveV2Adapter')
	const AaveV2DebtAdapter = await hre.ethers.getContractFactory('AaveV2DebtAdapter')
	const CompoundAdapter = await hre.ethers.getContractFactory('CompoundAdapter')
	const YEarnV2Adapter = await hre.ethers.getContractFactory('YEarnV2Adapter')
	const KyberSwapAdapter = await hre.ethers.getContractFactory('KyberSwapAdapter')

	const platformProxyAdmin = await deployer.deployOrGetContract('PlatformProxyAdmin', [])
	// Get deterministic addresses for controller and factory
	const [controllerAddress, factoryAddress] = await Promise.all([
		platformProxyAdmin.controller(),
		platformProxyAdmin.factory(),
	])
	// Add whitelist
	const whitelist = await deployer.deployerOrGetContract('Whitelist', [])
	// Add token registry
	const tokenRegistry = await deployer.deployerOrGetContract('TokenRegistry', [])
	// Add protocol registries
	const curveDepositZapRegistryAddress = await deployer.deployOrGetAddress('CurveDepositZapRegistry', [])
	const chainlinkRegistryAddress = await deployer.deployOrGetAddress('ChainlinkRegistry', [])
	const uniswapV3RegistryAddress = await deployer.deployOrGetAddress('UniswapV3Registry', [
		deployedContracts[network].uniswapV3Factory,
		deployedContracts[network].weth,
	])
	// Add protocol oracles
	const uniswapOracleAddress = await deployer.deployOrGetAddress('UniswapV3Oracle', [
		uniswapV3RegistryAddress,
		deployedContracts[network].weth,
	])
	const chainlinkOracleAddress = await deployer.deployOrGetAddress('ChainlinkOracle', [
		chainlinkRegistryAddress,
		deployedContracts[network].weth,
	])
	// Add enso oracle
	const ensoOracleAddress = await deployer.deployOrGetAddress('EnsoOracle', [
		factoryAddress,
		deployedContracts[network].weth,
		deployedContracts[network].susd,
	])

	// Update owners for conditional add estimator
	await deployer.updateOwners()

	// Add token estimators
	await deployer.setupEstimators(uniswapOracleAddress, chainlinkOracleAddress)

	// Controller implementations
	const controllerImplementationAddress = await deployer.deployOrGetAddress(
		'StrategyControllerImplementation',
		[factoryAddress],
		{ ControllerLibrary: controllerLibraryAddress }
	)

	await deployer.deployOrGetAddress('StrategyControllerPausedImplementation', [factoryAddress])

	// Factory implementation
	const factoryImplementationAddress = await deployer.deployOrGetAddress('StrategyProxyFactoryImplementation', [
		controllerAddress,
	])

	// Strategy implementation
	const strategyImplementation = await waitForDeployment(async (txArgs: TransactionArgs) => {
		return Strategy.deploy(
			factoryAddress,
			controllerAddress,
			deployedContracts[network].synthetixAddressProvider,
			deployedContracts[network].aaveAddressProvider,
			txArgs
		)
	}, signer)
	deployer.add2Deployments('StrategyImplementation', strategyImplementation.address)

	// Initialize platform
	if (overwrite || !deployer.contracts['StrategyController'] || !deployer.contracts['StrategyProxyFactory']) {
		console.log('Initializing platform...')
		await waitForTransaction(async (txArgs: TransactionArgs) => {
			return platformProxyAdmin.initialize(
				controllerImplementationAddress,
				factoryImplementationAddress,
				strategyImplementationAddress,
				ensoOracleAddress,
				tokenRegistry.address,
				whitelist.address,
				deployedContracts[network].ensoPool,
				txArgs
			)
		}, deployer.signer)
		deployer.add2Deployments('StrategyProxyFactory', factoryAddress)
		deployer.add2Deployments('StrategyController', controllerAddress)
		/*
			NOTE: We don't want to transfer ownership of factory immediately.
			We still need to register tokens
		*/
	}

	// Transfer platform proxy admin
	if (owner != signer.address && signer.address == (await platformProxyAdmin.owner())) {
		console.log('Transfering PlatformProxyAdmin...')
		await waitForTransaction(async (txArgs: TransactionArgs) => {
			return platformProxyAdmin.transferOwnership(owner, txArgs)
		}, signer)
	}

	// Routers
	const fullRouterAddress = await deployAndWhitelist('FullRouter', [
		deployedContracts[network].aaveAddressProvider,
		controllerAddress,
	])
	await deployAndWhitelist('LoopRouter', [controllerAddress])
	await deployAndWhitelist('MulticallRouter', [controllerAddress])
	await deployAndWhitelist('BatchDepositRouter', [controllerAddress])

	// Adapters
	await deployAndWhitelist('UniswapV2Adapter', [
		deployedContracts[network].uniswapV2Factory,
		deployedContracts[network].weth,
	])
	await deployAndWhitelist('UniswapV3Adapter', [
		uniswapV3RegistryAddress,
		deployedContracts[network].uniswapV3Router,
		deployedContracts[network].weth,
	])
	await deployAndWhitelist('MetaStrategyAdapter', [
		controllerAddress,
		fullRouterAddress,
		deployedContracts[network].weth,
	])
	const synthetixAdapter = await deployAndWhitelist('SynthetixAdapter', [
		deployedContracts[network].synthetixAddressProvider,
		deployedContracts[network].weth,
	])
	const synthRedeemerAdapterAddress = await deployAndWhitelist('SynthRedeemerAdapter', [
		deployedContracts[network].synthRedeemer,
		deployedContracts[network].susd,
		deployedContracts[network].weth,
	])
	await deployAndWhitelist('BalancerAdapter', [
		deployedContracts[network].balancerRegistry,
		deployedContracts[network].weth,
	])

	// TODO !!!!!!

	if (overwrite || !contracts['CurveAdapter']) {
		const curveAdapter = await waitForDeployment(async (txArgs: TransactionArgs) => {
			return CurveAdapter.deploy(
				deployedContracts[network].curveAddressProvider,
				deployedContracts[network].weth,
				txArgs
			)
		}, signer)

		add2Deployments('CurveAdapter', curveAdapter.address)

		if (signer.address === whitelistOwner) {
			console.log('Whitelisting...')
			await waitForTransaction(async (txArgs: TransactionArgs) => {
				return whitelist.approve(curveAdapter.address, txArgs)
			}, signer)
		}
	}

	if (overwrite || !contracts['CurveLPAdapter']) {
		const curveLPAdapter = await waitForDeployment(async (txArgs: TransactionArgs) => {
			return CurveLPAdapter.deploy(
				deployedContracts[network].curveAddressProvider,
				curveDepositZapRegistryAddress,
				deployedContracts[network].weth,
				txArgs
			)
		}, signer)

		add2Deployments('CurveLPAdapter', curveLPAdapter.address)

		if (signer.address === whitelistOwner) {
			console.log('Whitelisting...')
			await waitForTransaction(async (txArgs: TransactionArgs) => {
				return whitelist.approve(curveLPAdapter.address, txArgs)
			}, signer)
		}
	}

	if (overwrite || !contracts['CurveGaugeAdapter']) {
		const curveGaugeAdapter = await waitForDeployment(async (txArgs: TransactionArgs) => {
			return CurveGaugeAdapter.deploy(
				deployedContracts[network].weth,
				tokenRegistry.address,
				ESTIMATOR_CATEGORY.CURVE_GAUGE,
				txArgs
			)
		}, signer)

		add2Deployments('CurveGaugeAdapter', curveGaugeAdapter.address)
		add2Deployments('CurveRewardsAdapter', curveGaugeAdapter.address) //Alias

		if (signer.address === whitelistOwner) {
			console.log('Whitelisting...')
			await waitForTransaction(async (txArgs: TransactionArgs) => {
				return whitelist.approve(curveGaugeAdapter.address, txArgs)
			}, signer)
		}
	}

	if (overwrite || !contracts['AaveV2Adapter']) {
		const aaveV2Adapter = await waitForDeployment(async (txArgs: TransactionArgs) => {
			return AaveV2Adapter.deploy(
				deployedContracts[network].aaveAddressProvider,
				controllerAddress,
				deployedContracts[network].aaveIncentivesController,
				deployedContracts[network].weth,
				tokenRegistry.address,
				ESTIMATOR_CATEGORY.AAVE_V2,
				txArgs
			)
		}, signer)

		add2Deployments('AaveV2Adapter', aaveV2Adapter.address)
		add2Deployments('AaveLendAdapter', aaveV2Adapter.address) //Alias

		if (signer.address === whitelistOwner) {
			console.log('Whitelisting...')
			await waitForTransaction(async (txArgs: TransactionArgs) => {
				return whitelist.approve(aaveV2Adapter.address, txArgs)
			}, signer)
		}
	}

	if (overwrite || !contracts['AaveV2DebtAdapter']) {
		const aaveV2DebtAdapter = await waitForDeployment(async (txArgs: TransactionArgs) => {
			return AaveV2DebtAdapter.deploy(
				deployedContracts[network].aaveAddressProvider,
				deployedContracts[network].aaveIncentivesController,
				deployedContracts[network].weth,
				txArgs
			)
		}, signer)

		add2Deployments('AaveV2DebtAdapter', aaveV2DebtAdapter.address)
		add2Deployments('AaveBorrowAdapter', aaveV2DebtAdapter.address) //Alias

		if (signer.address === whitelistOwner) {
			console.log('Whitelisting...')
			await waitForTransaction(async (txArgs: TransactionArgs) => {
				return whitelist.approve(aaveV2DebtAdapter.address, txArgs)
			}, signer)
		}
	}

	if (overwrite || !contracts['CompoundAdapter']) {
		const compoundAdapter = await waitForDeployment(async (txArgs: TransactionArgs) => {
			return CompoundAdapter.deploy(
				deployedContracts[network].compoundComptroller,
				deployedContracts[network].weth,
				tokenRegistry.address,
				ESTIMATOR_CATEGORY.COMPOUND,
				txArgs
			)
		}, signer)

		add2Deployments('CompoundAdapter', compoundAdapter.address)

		if (signer.address === whitelistOwner) {
			console.log('Whitelisting...')
			await waitForTransaction(async (txArgs: TransactionArgs) => {
				return whitelist.approve(compoundAdapter.address, txArgs)
			}, signer)
		}
	}

	if (overwrite || !contracts['YEarnV2Adapter']) {
		const yearnAdapter = await waitForDeployment(async (txArgs: TransactionArgs) => {
			return YEarnV2Adapter.deploy(
				deployedContracts[network].weth,
				tokenRegistry.address,
				ESTIMATOR_CATEGORY.YEARN_V2,
				txArgs
			)
		}, signer)

		add2Deployments('YEarnV2Adapter', yearnAdapter.address)

		if (signer.address === whitelistOwner) {
			console.log('Whitelisting...')
			await waitForTransaction(async (txArgs: TransactionArgs) => {
				return whitelist.approve(yearnAdapter.address, txArgs)
			}, signer)
		}
	}

	if (overwrite || !contracts['SushiSwapAdapter']) {
		const sushiSwapAdapter = await waitForDeployment(async (txArgs: TransactionArgs) => {
			return UniswapV2Adapter.deploy(
				deployedContracts[network].sushiFactory,
				deployedContracts[network].weth,
				txArgs
			)
		}, signer)

		add2Deployments('SushiSwapAdapter', sushiSwapAdapter.address)

		if (signer.address === whitelistOwner) {
			console.log('Whitelisting...')
			await waitForTransaction(async (txArgs: TransactionArgs) => {
				return whitelist.approve(sushiSwapAdapter.address, txArgs)
			}, signer)
		}
	}

	if (overwrite || !contracts['KyberSwapAdapter']) {
		const kyberSwapAdapter = await waitForDeployment(async (txArgs: TransactionArgs) => {
			return KyberSwapAdapter.deploy(
				deployedContracts[network].kyberFactory,
				deployedContracts[network].kyberRouter,
				deployedContracts[network].weth,
				txArgs
			)
		}, signer)

		add2Deployments('KyberSwapAdapter', kyberSwapAdapter.address)

		if (signer.address === whitelistOwner) {
			console.log('Whitelisting...')
			await waitForTransaction(async (txArgs: TransactionArgs) => {
				return whitelist.approve(kyberSwapAdapter.address, txArgs)
			}, signer)
		}
	}

	if (signer.address == tokenRegistryOwner) {
		console.log('Adding item...')
		await waitForTransaction(async (txArgs: TransactionArgs) => {
			return tokenRegistry.addItem(
				ITEM_CATEGORY.RESERVE,
				ESTIMATOR_CATEGORY.DEFAULT_ORACLE,
				deployedContracts[network].weth,
				txArgs
			)
		}, signer)

		console.log('Adding item...')
		await waitForTransaction(async (txArgs: TransactionArgs) => {
			return tokenRegistry.addItem(
				ITEM_CATEGORY.RESERVE,
				ESTIMATOR_CATEGORY.CHAINLINK_ORACLE,
				deployedContracts[network].susd,
				txArgs
			)
		}, signer)

		console.log('Adding item...')
		await waitForTransaction(async (txArgs: TransactionArgs) => {
			return tokenRegistry.addItemDetailed(
				ITEM_CATEGORY.RESERVE,
				ESTIMATOR_CATEGORY.BLOCKED,
				'0xffffffffffffffffffffffffffffffffffffffff', //virtual item
				{
					adapters: [synthetixAdapterAddress, synthRedeemerAdapterAddress],
					path: [],
					cache: '0x',
				},
				hre.ethers.constants.AddressZero,
				txArgs
			)
		}, signer)

		console.log('Adding item...')
		await waitForTransaction(async (txArgs: TransactionArgs) => {
			return tokenRegistry.addItem(
				ITEM_CATEGORY.BASIC,
				ESTIMATOR_CATEGORY.BLOCKED,
				'0x8dd5fbCe2F6a956C3022bA3663759011Dd51e73E', //TUSD second address
				txArgs
			)
		}, signer)

		console.log('Adding item...')
		await waitForTransaction(async (txArgs: TransactionArgs) => {
			return tokenRegistry.addItem(
				ITEM_CATEGORY.BASIC,
				ESTIMATOR_CATEGORY.BLOCKED,
				'0xcA3d75aC011BF5aD07a98d02f18225F9bD9A6BDF', //tricrypto, depreciated for tricrypto2
				txArgs
			)
		}, signer)
	}

	if (owner != signer.address && signer.address == whitelistOwner) {
		console.log('Transfering Whitelist...')
		await waitForTransaction(async (txArgs: TransactionArgs) => {
			return whitelist.transferOwnership(owner, txArgs)
		}, signer)
	}

	if (signer.address == tokenRegistryOwner) {
		console.log('Transfering TokenRegistry...')
		await waitForTransaction(async (txArgs: TransactionArgs) => {
			return tokenRegistry.transferOwnership(factoryAddress, txArgs)
		}, signer)
	}
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
