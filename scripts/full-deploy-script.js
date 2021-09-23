// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat')
const { ESTIMATOR_CATEGORY, ITEM_CATEGORY } = require('../lib/utils')

const deployedContracts = {
  mainnet: {
    weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    susd: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51',
    uniswapFactory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    aaveAddressProvider: '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
    aaveLendingPool: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
    synthetixAddressResolver: '0x823bE81bbF96BEc0e25CA13170F5AaCb5B79ba83',
    ensoPool: ''
  },
  kovan: {
    weth: '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
    susd: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51',
    uniswapFactory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    aaveAddressProvider: '0x88757f2f99175387aB4C6a4b3067c77A695b0349',
    aaveLendingPool: '0xE0fBa4Fc209b4948668006B2bE61711b7f465bAe',
    synthetixAddressResolver: '0x84f87E3636Aa9cC1080c07E6C61aDfDCc23c0db6',
    ensoPool: '0x0c58B57E2e0675eDcb2c7c0f713320763Fc9A77b'
  },
}

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');
  const TokenRegistry = await hre.ethers.getContractFactory('TokenRegistry')
  const tokenRegistry = await TokenRegistry.deploy()
	await tokenRegistry.deployed()

  console.log('TokenRegistry: ', tokenRegistry.address)

  const CurvePoolRegistry = await hre.ethers.getContractFactory('CurvePoolRegistry')
	const curvePoolRegistry = await CurvePoolRegistry.deploy()
	await curvePoolRegistry.deployed()

  console.log('CurvePoolRegistry: ', curvePoolRegistry.address)

  // Add token estimators
  const BasicEstimator = await hre.ethers.getContractFactory('BasicEstimator')
  const basicEstimator = await BasicEstimator.deploy()
  await basicEstimator.deployed()
	let tx = await tokenRegistry.addEstimator(ESTIMATOR_CATEGORY.BASIC, basicEstimator.address)
  await tx.wait()

  console.log('BasicEstimator: ', basicEstimator.address)

  const AaveEstimator = await hre.ethers.getContractFactory('AaveEstimator')
	const aaveEstimator = await AaveEstimator.deploy()
  await aaveEstimator.deployed()
	tx = await tokenRegistry.addEstimator(ESTIMATOR_CATEGORY.AAVE, aaveEstimator.address)
  await tx.wait()

  console.log('AaveEstimator: ', aaveEstimator.address)

  const AaveDebtEstimator = await hre.ethers.getContractFactory('AaveDebtEstimator')
	const aaveDebtEstimator = await AaveDebtEstimator.deploy()
  await aaveDebtEstimator.deployed()
	tx = await tokenRegistry.addEstimator(ESTIMATOR_CATEGORY.AAVE_DEBT, aaveDebtEstimator.address)
  await tx.wait()

  console.log('AaveDebtEstimator: ', aaveDebtEstimator.address)

  const CompoundEstimator = await hre.ethers.getContractFactory('CompoundEstimator')
	const compoundEstimator = await CompoundEstimator.deploy()
  await compoundEstimator.deployed()
	tx = await tokenRegistry.addEstimator(ESTIMATOR_CATEGORY.COMPOUND, compoundEstimator.address)
  await tx.wait()

  console.log('CompoundEstimator: ', compoundEstimator.address)

  const CurveEstimator = await hre.ethers.getContractFactory('CurveEstimator')
	const curveEstimator = await CurveEstimator.deploy(curvePoolRegistry.address)
  await curveEstimator.deployed()
	tx = await tokenRegistry.addEstimator(ESTIMATOR_CATEGORY.CURVE, curveEstimator.address)
  await tx.wait()

  console.log('CurveEstimator: ', curveEstimator.address)

  const CurveGaugeEstimator = await hre.ethers.getContractFactory('CurveGaugeEstimator')
	const curveGaugeEstimator = await CurveGaugeEstimator.deploy()
  await curveGaugeEstimator.deployed()
	tx = await tokenRegistry.addEstimator(ESTIMATOR_CATEGORY.CURVE_GAUGE, curveGaugeEstimator.address)
  await tx.wait()

  console.log('CurveGaugeEstimator: ', curveGaugeEstimator.address)

  const EmergencyEstimator = await hre.ethers.getContractFactory('EmergencyEstimator')
	const emergencyEstimator = await EmergencyEstimator.deploy()
  await emergencyEstimator.deployed()
	tx = await tokenRegistry.addEstimator(ESTIMATOR_CATEGORY.BLOCKED, emergencyEstimator.address)
  await tx.wait()

  console.log('EmergencyEstimator: ', emergencyEstimator.address)

  const SynthEstimator = await hre.ethers.getContractFactory('SynthEstimator')
	const synthEstimator = await SynthEstimator.deploy()
  await synthEstimator.deployed()
	tx = await tokenRegistry.addEstimator(ESTIMATOR_CATEGORY.SYNTH, synthEstimator.address)
  await tx.wait()

  console.log('SynthEstimator: ', synthEstimator.address)

  const StrategyEstimator = await hre.ethers.getContractFactory('StrategyEstimator')
	const strategyEstimator = await StrategyEstimator.deploy()
  await strategyEstimator.deployed()
	tx = await tokenRegistry.addEstimator(ESTIMATOR_CATEGORY.STRATEGY, strategyEstimator.address)
  await tx.wait()

  console.log('StrategyEstimator: ', strategyEstimator.address)

  const UniswapV2Estimator = await hre.ethers.getContractFactory('UniswapV2Estimator')
	const uniswapV2Estimator = await UniswapV2Estimator.deploy()
  await uniswapV2Estimator.deployed()
	tx = await tokenRegistry.addEstimator(ESTIMATOR_CATEGORY.UNISWAP_V2, uniswapV2Estimator.address)
  await tx.wait()

  console.log('UniswapV2Estimator: ', uniswapV2Estimator.address)

  const YEarnV2Estimator = await hre.ethers.getContractFactory('YEarnV2Estimator')
	const yearnV2Estimator = await YEarnV2Estimator.deploy()
  await yearnV2Estimator.deployed()
	tx = await tokenRegistry.addEstimator(ESTIMATOR_CATEGORY.YEARN_V2, yearnV2Estimator.address)
  await tx.wait()

  console.log('YEarnV2Estimator: ', yearnV2Estimator.address)

	tx = await tokenRegistry.addItem(ITEM_CATEGORY.RESERVE, ESTIMATOR_CATEGORY.BASIC, deployedContracts[process.env.HARDHAT_NETWORK].weth)
  await tx.wait()
  tx = await tokenRegistry.addItem(ITEM_CATEGORY.RESERVE, ESTIMATOR_CATEGORY.SYNTH, deployedContracts[process.env.HARDHAT_NETWORK].susd)
  await tx.wait()

  // Add oracles
  const UniswapOracle = await hre.ethers.getContractFactory('UniswapNaiveOracle')
  const uniswapOracle = await UniswapOracle.deploy(
    deployedContracts[process.env.HARDHAT_NETWORK].uniswapFactory,
    deployedContracts[process.env.HARDHAT_NETWORK].weth
  )
  await uniswapOracle.deployed()

  console.log('UniswapOracle: ', uniswapOracle.address)

  const ChainlinkOracle = await hre.ethers.getContractFactory('ChainlinkOracle')
  const chainlinkOracle = await ChainlinkOracle.deploy(deployedContracts[process.env.HARDHAT_NETWORK].weth)
  await chainlinkOracle.deployed()

  console.log('ChainlinkOracle: ', chainlinkOracle.address)

  const EnsoOracle = await hre.ethers.getContractFactory('EnsoOracle')
  const ensoOracle = await EnsoOracle.deploy(
      tokenRegistry.address,
      uniswapOracle.address,
      chainlinkOracle.address,
      deployedContracts[process.env.HARDHAT_NETWORK].weth,
      deployedContracts[process.env.HARDHAT_NETWORK].susd
  )
  await ensoOracle.deployed()

  console.log('EnsoOracle: ', ensoOracle.address)

  const Whitelist = await hre.ethers.getContractFactory('Whitelist')
  const whitelist = await Whitelist.deploy()
  await whitelist.deployed()

  console.log('Whitelist: ', whitelist.address)

  const Strategy = await hre.ethers.getContractFactory('Strategy')
  const strategyImplementation = await Strategy.deploy()
  await strategyImplementation.deployed()

  const StrategyProxyFactoryAdmin = await hre.ethers.getContractFactory('StrategyProxyFactoryAdmin')
  const factoryAdmin = await StrategyProxyFactoryAdmin.deploy(
    strategyImplementation.address,
    ensoOracle.address,
    tokenRegistry.address,
    whitelist.address,
    deployedContracts[process.env.HARDHAT_NETWORK].ensoPool
  )
  await factoryAdmin.deployed()

  console.log('StrategyProxyFactoryAdmin:', factoryAdmin.address)

  const factoryAddress = await factoryAdmin.factory()

  console.log('StrategyProxyFactory:', factoryAddress)

  const StrategyControllerAdmin = await hre.ethers.getContractFactory('StrategyControllerAdmin')
  const controllerAdmin = await StrategyControllerAdmin.deploy(factoryAddress)
  await controllerAdmin.deployed()

  console.log('StrategyControllerAdmin: ', controllerAdmin.address)

  const controllerAddress = await controllerAdmin.controller()

  console.log('StrategyController: ', controllerAddress)

  const StrategyProxyFactory = await hre.ethers.getContractFactory('StrategyProxyFactory')
  const strategyFactory = await StrategyProxyFactory.attach(factoryAddress)

  tx = await strategyFactory.setController(controllerAddress)
  await tx.wait()
  tx = await tokenRegistry.transferOwnership(factoryAddress)
  await tx.wait()

  const LoopRouter = await hre.ethers.getContractFactory('LoopRouter')
  const loopRouter = await LoopRouter.deploy(
    controllerAddress
  )
  await loopRouter.deployed()

  console.log('LoopRouter: ', loopRouter.address)

  tx = await whitelist.approve(loopRouter.address)
  await tx.wait()

  const FullRouter = await hre.ethers.getContractFactory('FullRouter')
  const fullRouter = await FullRouter.deploy(
    controllerAddress
  )
  await fullRouter.deployed()

  console.log('FullRouter: ', fullRouter.address)

  tx = await whitelist.approve(fullRouter.address)
  await tx.wait()

  const GenericRouter = await hre.ethers.getContractFactory('GenericRouter')
  const genericRouter = await GenericRouter.deploy(
    controllerAddress
  )
  await genericRouter.deployed()

  console.log('GenericRouter: ', genericRouter.address)

  tx = await whitelist.approve(genericRouter.address)
  await tx.wait()


  const BatchDepositRouter = await hre.ethers.getContractFactory('BatchDepositRouter')
  const batchDepositRouter = await BatchDepositRouter.deploy(
    controllerAddress
  )
  await batchDepositRouter.deployed()

  console.log('BatchDepositRouter: ', batchDepositRouter.address)

  tx = await whitelist.approve(batchDepositRouter.address)
  await tx.wait()

  const UniswapV2Adapter = await hre.ethers.getContractFactory('UniswapV2Adapter')
  const uniswapV2Adapter = await UniswapV2Adapter.deploy(
    deployedContracts[process.env.HARDHAT_NETWORK].uniswapFactory,
    deployedContracts[process.env.HARDHAT_NETWORK].weth
  )
  await uniswapV2Adapter.deployed()

  console.log('UniswapV2Adapter: ', uniswapV2Adapter.address)

  tx = await whitelist.approve(uniswapV2Adapter.address)
  await tx.wait()

  const MetaStrategyAdapter = await hre.ethers.getContractFactory('MetaStrategyAdapter')
  const metaStrategyAdapter = await MetaStrategyAdapter.deploy(
    controllerAddress,
    fullRouter.address,
    deployedContracts[process.env.HARDHAT_NETWORK].weth
  )
  await metaStrategyAdapter.deployed()

  console.log('MetaStrategyAdapter: ', metaStrategyAdapter.address)

  tx = await whitelist.approve(metaStrategyAdapter.address)
  await tx.wait()

  const SynthetixAdapter = await hre.ethers.getContractFactory('SynthetixAdapter')
  const synthetixAdapter = await SynthetixAdapter.deploy(
    deployedContracts[process.env.HARDHAT_NETWORK].synthetixAddressResolver,
    deployedContracts[process.env.HARDHAT_NETWORK].weth
  )
  await synthetixAdapter.deployed()

  console.log('SynthetixAdapter: ', synthetixAdapter.address)

  tx = await whitelist.approve(synthetixAdapter.address)
  await tx.wait()

  const CurveAdapter = await hre.ethers.getContractFactory('CurveAdapter')
  const curveAdapter = await CurveAdapter.deploy(
    curvePoolRegistry.address,
    deployedContracts[process.env.HARDHAT_NETWORK].weth
  )
  await curveAdapter.deployed()

  console.log('CurveAdapter: ', curveAdapter.address)

  tx = await whitelist.approve(curveAdapter.address)
  await tx.wait()

  const AaveLendAdapter = await hre.ethers.getContractFactory('AaveLendAdapter')
  const aaveLendAdapter = await AaveLendAdapter.deploy(
    deployedContracts[process.env.HARDHAT_NETWORK].aaveLendingPool,
    controllerAddress,
    deployedContracts[process.env.HARDHAT_NETWORK].weth
  )
  await aaveLendAdapter.deployed()

  console.log('AaveLendAdapter: ', aaveLendAdapter.address)

  tx = await whitelist.approve(aaveLendAdapter.address)
  await tx.wait()

  const AaveBorrowAdapter = await hre.ethers.getContractFactory('AaveBorrowAdapter')
  const aaveBorrowAdapter = await AaveBorrowAdapter.deploy(
    deployedContracts[process.env.HARDHAT_NETWORK].aaveAddressProvider,
    deployedContracts[process.env.HARDHAT_NETWORK].weth
  )
  await aaveBorrowAdapter.deployed()

  console.log('AaveBorrowAdapter: ', aaveBorrowAdapter.address)

  tx = await whitelist.approve(aaveBorrowAdapter.address)
  await tx.wait()
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
