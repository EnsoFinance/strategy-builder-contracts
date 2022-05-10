import { ethers, network } from 'hardhat'
import { Contract } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Estimator } from '../lib/estimator'
import { Tokens } from '../lib/tokens'
import { getLiveContracts } from '../lib/mainnet'
import { increaseTime } from '../lib/utils'
import { deployLoopRouter } from '../lib/deploy'
import { DIVISOR } from '../lib/constants'
import WETH9 from '@uniswap/v2-periphery/build/WETH9.json'

const { constants, getSigners, getContractFactory } = ethers
const { WeiPerEther } = constants

const ownerAddress = '0xca702d224D61ae6980c8c7d4D98042E22b40FFdB'

const runAll = true 

describe('Live Estimates', function () {
	let	accounts: SignerWithAddress[],
		estimator: Estimator,
		tokens: Tokens,
		weth: Contract,
		router: Contract,
		controller: Contract,
		oracle: Contract,
		eDPI: Contract,
		eYETI: Contract,
		eYLA: Contract,
		eNFTP: Contract

	before('Setup Uniswap + Factory', async function () {
		accounts = await getSigners()
		tokens = new Tokens()
    weth = new Contract(tokens.weth, WETH9.abi, accounts[0])

		const enso = getLiveContracts(accounts[0])
		controller = enso.platform.controller
		oracle = enso.platform.oracles.ensoOracle

		const {
			tokenRegistry,
			uniswapV3Registry,
			curveDepositZapRegistry
		} = enso.platform.oracles.registries

		const {
			aaveV2,
			compound,
			curve,
			curveLP,
			curveGauge,
			kyberSwap,
			metastrategy,
			sushiSwap,
			synthetix,
			uniswapV2,
			uniswapV3,
			yearnV2
		} = enso.adapters

		estimator = new Estimator(
			accounts[0],
			oracle,
			tokenRegistry,
			uniswapV3Registry,
			curveDepositZapRegistry,
			aaveV2.address,
			compound.address,
			curve.address,
			curveLP.address,
			curveGauge.address,
			kyberSwap.address,
			metastrategy.address,
			sushiSwap.address,
			synthetix.address,
			uniswapV2.address,
			uniswapV3.address,
			yearnV2.address
		)

		const Strategy = await getContractFactory('Strategy')
		eDPI = await Strategy.attach('0x890ed1ee6d435a35d51081ded97ff7ce53be5942')
		eYETI = await Strategy.attach('0xA6A6550CbAf8CCd944f3Dd41F2527d441999238c')
		eYLA = await Strategy.attach('0xb41a7a429c73aa68683da1389051893fe290f614')
		eNFTP = await Strategy.attach('16f7a9c3449f9c67e8c7e8f30ae1ee5d7b8ed10d')

		// Impersonate owner
		await network.provider.request({
			method: 'hardhat_impersonateAccount',
			params: [ownerAddress],
		});
		const owner = await ethers.getSigner(ownerAddress);
		// Deploy new router
		router = await deployLoopRouter(accounts[0], controller, enso.platform.library)
		// Whitelist
		await enso.platform.administration.whitelist.connect(owner).approve(router.address)
	})

	it('Should estimate deposit eDPI', async function() {
		const [ totalBefore, ] = await oracle['estimateStrategy(address)'](eDPI.address)
		const depositAmount = WeiPerEther
		const estimatedDepositValue = await estimator.deposit(eDPI, depositAmount)
		console.log('Estimated deposit value: ', estimatedDepositValue.toString())
		await controller.connect(accounts[1]).deposit(eDPI.address, router.address, 0, 0, '0x', { value: depositAmount })
		const [ totalAfter ] = await oracle['estimateStrategy(address)'](eDPI.address)
		console.log('Actual deposit value: ', totalAfter.sub(totalBefore).toString())
	})

	it('Should estimate withdraw eDPI', async function() {
		await increaseTime(1)
    console.log("debug before")
		const [ totalBefore, ] = await oracle['estimateStrategy(address)'](eDPI.address)
    console.log("debug after")
		const withdrawAmount = await eDPI.balanceOf(accounts[1].address)
		const withdrawAmountAfterFee = withdrawAmount.sub(withdrawAmount.mul(2).div(DIVISOR)) // 0.2% withdrawal fee
		const totalSupply = await eDPI.totalSupply()
		const wethBefore = await weth.balanceOf(accounts[1].address)
		const expectedWithdrawValue = totalBefore.mul(withdrawAmountAfterFee).div(totalSupply)
		console.log('Expected withdraw value: ', expectedWithdrawValue.toString())
		const estimatedWithdrawValue = await estimator.withdraw(eDPI, withdrawAmountAfterFee)
		console.log('Estimated withdraw value: ', estimatedWithdrawValue.toString())
		let tx = await controller.connect(accounts[1]).withdrawWETH(eDPI.address, router.address, withdrawAmount, 0, '0x')
		const receipt = await tx.wait()
		console.log('Withdraw Gas Used: ', receipt.gasUsed.toString())
		const wethAfter = await weth.balanceOf(accounts[1].address)
		console.log('Actual withdraw amount: ', wethAfter.sub(wethBefore).toString())
	})

  if (runAll) {

	it('Should estimate deposit eYETI', async function() {
		await increaseTime(1)
		const [ totalBefore, ] = await oracle['estimateStrategy(address)'](eYETI.address)
		const depositAmount = WeiPerEther
		const estimatedDepositValue = await estimator.deposit(eYETI, depositAmount)
		console.log('Estimated deposit value: ', estimatedDepositValue.toString())
		await controller.connect(accounts[1]).deposit(eYETI.address, router.address, 0, 0, '0x', { value: depositAmount })
		const [ totalAfter ] = await oracle['estimateStrategy(address)'](eYETI.address)
		console.log('Actual deposit value: ', totalAfter.sub(totalBefore).toString())
	})

	it('Should estimate withdraw eYETI', async function() {
		await increaseTime(1)
		const [ totalBefore, ] = await oracle['estimateStrategy(address)'](eYETI.address)
		const withdrawAmount = await eYETI.balanceOf(accounts[1].address)
		const withdrawAmountAfterFee = withdrawAmount.sub(withdrawAmount.mul(2).div(DIVISOR)) // 0.2% withdrawal fee
		const totalSupply = await eYETI.totalSupply()
		const wethBefore = await weth.balanceOf(accounts[1].address)
		const expectedWithdrawValue = totalBefore.mul(withdrawAmountAfterFee).div(totalSupply)
		console.log('Expected withdraw value: ', expectedWithdrawValue.toString())
		const estimatedWithdrawValue = await estimator.withdraw(eYETI, withdrawAmountAfterFee)
		console.log('Estimated withdraw value: ', estimatedWithdrawValue.toString())
		let tx = await controller.connect(accounts[1]).withdrawWETH(eYETI.address, router.address, withdrawAmount, 0, '0x')
		const receipt = await tx.wait()
		console.log('Withdraw Gas Used: ', receipt.gasUsed.toString())
		const wethAfter = await weth.balanceOf(accounts[1].address)
		console.log('Actual withdraw amount: ', wethAfter.sub(wethBefore).toString())
	})

	it('Should estimate deposit eYLA', async function() {
		await increaseTime(1)
		const [ totalBefore, ] = await oracle['estimateStrategy(address)'](eYLA.address)
		const depositAmount = WeiPerEther
		const estimatedDepositValue = await estimator.deposit(eYLA, depositAmount)
		console.log('Estimated deposit value: ', estimatedDepositValue.toString())
		await controller.connect(accounts[1]).deposit(eYLA.address, router.address, 0, 0, '0x', { value: depositAmount })
		const [ totalAfter ] = await oracle['estimateStrategy(address)'](eYLA.address)
		console.log('Actual deposit value: ', totalAfter.sub(totalBefore).toString())
	})

	it('Should estimate withdraw eYLA', async function() {
		await increaseTime(1)
		const [ totalBefore, ] = await oracle['estimateStrategy(address)'](eYLA.address)
		const withdrawAmount = await eYLA.balanceOf(accounts[1].address)
		const withdrawAmountAfterFee = withdrawAmount.sub(withdrawAmount.mul(2).div(DIVISOR)) // 0.2% withdrawal fee
		const totalSupply = await eYLA.totalSupply()
		const wethBefore = await weth.balanceOf(accounts[1].address)
		const expectedWithdrawValue = totalBefore.mul(withdrawAmountAfterFee).div(totalSupply)
		console.log('Expected withdraw value: ', expectedWithdrawValue.toString())
		const estimatedWithdrawValue = await estimator.withdraw(eYLA, withdrawAmountAfterFee)
		console.log('Estimated withdraw value: ', estimatedWithdrawValue.toString())
		let tx = await controller.connect(accounts[1]).withdrawWETH(eYLA.address, router.address, withdrawAmount, 0, '0x')
		const receipt = await tx.wait()
		console.log('Withdraw Gas Used: ', receipt.gasUsed.toString())
		const wethAfter = await weth.balanceOf(accounts[1].address)
		console.log('Actual withdraw amount: ', wethAfter.sub(wethBefore).toString())
	})

	it('Should estimate deposit eNFTP', async function() {
		await increaseTime(1)
		const [ totalBefore, ] = await oracle['estimateStrategy(address)'](eNFTP.address)
		const depositAmount = WeiPerEther
		const estimatedDepositValue = await estimator.deposit(eNFTP, depositAmount)
		console.log('Estimated deposit value: ', estimatedDepositValue.toString())
		await controller.connect(accounts[1]).deposit(eNFTP.address, router.address, 0, 0, '0x', { value: depositAmount })
		const [ totalAfter ] = await oracle['estimateStrategy(address)'](eNFTP.address)
		console.log('Actual deposit value: ', totalAfter.sub(totalBefore).toString())
	})

	it('Should estimate withdraw eNFTP', async function() {
		await increaseTime(1)
		const [ totalBefore, ] = await oracle['estimateStrategy(address)'](eNFTP.address)
		const withdrawAmount = await eNFTP.balanceOf(accounts[1].address)
		const withdrawAmountAfterFee = withdrawAmount.sub(withdrawAmount.mul(2).div(DIVISOR)) // 0.2% withdrawal fee
		const totalSupply = await eNFTP.totalSupply()
		const wethBefore = await weth.balanceOf(accounts[1].address)
		const expectedWithdrawValue = totalBefore.mul(withdrawAmountAfterFee).div(totalSupply)
		console.log('Expected withdraw value: ', expectedWithdrawValue.toString())
		const estimatedWithdrawValue = await estimator.withdraw(eNFTP, withdrawAmountAfterFee)
		console.log('Estimated withdraw value: ', estimatedWithdrawValue.toString())
		let tx = await controller.connect(accounts[1]).withdrawWETH(eNFTP.address, router.address, withdrawAmount, 0, '0x')
		const receipt = await tx.wait()
		console.log('Withdraw Gas Used: ', receipt.gasUsed.toString())
		const wethAfter = await weth.balanceOf(accounts[1].address)
		console.log('Actual withdraw amount: ', wethAfter.sub(wethBefore).toString())
	})
  }
})