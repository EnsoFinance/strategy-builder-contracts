const hre = require('hardhat')
const deployedContracts = require('../deployments.json')
const { prepareStrategy } = require('../lib/encode')
const dictionary = require('../dictionary.json')

const fs = require('fs')
const util = require('util')
const { wallets } = require('./constants/constants')
const log_file = fs.createWriteStream(__dirname + '/debug-strategies.log', { flags: 'w' })
const network = process.env.HARDHAT_NETWORK

const createStrategies = async (matrix, strategyFactory, wallet) => {
	const logObject = {
		i: 0,
		success: 0,
		fail: 0,
		errors: {},
	}
	for (const createStrategyArgs of matrix) {
		try {
			let tx = await strategyFactory.connect(wallet).createStrategy(...createStrategyArgs)
			let receipt = await tx.wait()
			logObject.success++
			console.log('Deployment Gas Used: ', receipt.gasUsed.toString())
		} catch (e) {
			const eMessage = e.message
			const errorArgs = { symbol: createStrategyArgs[1], ...createStrategyArgs[3][0] };
			const stringifiedEArgs = JSON.stringify(errorArgs, null, 2);
			console.log('ERROR: ',stringifiedEArgs)
			if (logObject.errors[eMessage]) {
				logObject.errors[eMessage].args.push(errorArgs)
				logObject.errors[eMessage].occurrences++
			} else {
				logObject.errors[eMessage] = {
					args: [errorArgs],
					occurrences: 1,
				}
			}
		}
		logObject.i++
	}

	log_file.write(util.format(JSON.stringify(logObject.errors, null, 2)) + '\n')
	console.log(`Successfully deployed ${((logObject.success * 100) / matrix.length).toFixed(2)}% of strategies.`)
}

const main = async () => {
	const uniswapAdapter = deployedContracts[network].UniswapV2Adapter
	const curveLPAdapter = deployedContracts[network].CurveLPAdapter
	const yearnAdapter = deployedContracts[network].YEarnV2Adapter
	const curveRewardsAdapter = deployedContracts[network].CurveRewardsAdapter
	const aaveV2Adapter = deployedContracts[network].AaveV2Adapter
	const compoundAdapter = deployedContracts[network].CompoundAdapter

	const DICTIONARY_ADAPTER_MAPPER = {
		'0x11b6dd97b8d2dEC7aF4E544e966c80f3B6D50E0c': uniswapAdapter,
		'0xeABF5ff735Eb522e2765f41cf213D9550093a3a3': curveLPAdapter,
		'0x69e98aA7e9EcAb7dF7d54cFf8cCAa48b2E72a5a4': yearnAdapter,
		'0xD73E8c234AAC92657d94FD1541106c2f4cb14654': curveRewardsAdapter,
		'0xec49b0Fe6941b1a3c90F75e6A43d812Cd6aDa2ff': aaveV2Adapter,
		'0x250ea055E49F890cb269e729Cf81A04D7Ccd5f3E': compoundAdapter,
	}

	const strategyFactory = await hre.ethers.getContractAt(
		'StrategyProxyFactory',
		deployedContracts[network]
			.StrategyProxyFactory
	)
	const wallet = new hre.ethers.Wallet(
		network === 'ensonet' ? wallets[0] : 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
		hre.ethers.provider
	)
	const routerAddress = deployedContracts[network].LoopRouter
	const amount = hre.ethers.BigNumber.from('1000000000000000')
	const dictionaryEntries = Object.entries(dictionary).map(([_, value]) => value)
	const derivedTokens = dictionaryEntries.reduce((m, { derivedAssets }) => [...m, ...derivedAssets], [])
	const createStrategyArgsMatrix = derivedTokens.map((derivedToken, i) => {
		const strategyName = derivedToken.symbol
		const position = derivedToken.position
		position.percentage = 1000
		position.adapters = position.adapters.map((adapter) => DICTIONARY_ADAPTER_MAPPER[adapter])
		const strategyItems = prepareStrategy([position], uniswapAdapter)
		const isSocial = Math.random() > 0.05
		let fee = isSocial ? 100 : 0
		const strategyState = {
			timelock: 60,
			rebalanceThreshold: 10,
			rebalanceSlippage: 997,
			restructureSlippage: 0,
			performanceFee: fee,
			social: isSocial,
			set: false,
		}
		return [
			wallet.address,
			strategyName,
			strategyName.substring(0, 3),
			strategyItems,
			strategyState,
			routerAddress,
			'0x',
			{ value: amount, gasLimit: 5000000 },
		]
	})

	await createStrategies(createStrategyArgsMatrix, strategyFactory, wallet)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
