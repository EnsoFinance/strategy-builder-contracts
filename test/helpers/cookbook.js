const { encodeTransferFrom } = require('./encode.js')

async function prepareFlashLoan(
	strategy,
	arbitrager,
	sellAdapter,
	buyAdapter,
	loanAmount,
	loanToken,
	pairToken
) {
	const calls = []
	// Withdraw flash loan
	calls.push(
		await encodeTransferFrom(
			loanToken,
			strategy.address,
			arbitrager.address,
			loanAmount
		)
	)
	// Arbitrage and return flash loan
	calls.push(
		await encodeArbitrageLoan(
			arbitrager,
			strategy.address,
			loanAmount,
			loanToken.address,
			pairToken.address,
			sellAdapter.address,
			buyAdapter.address
		)
	)
	return calls
}

async function encodeArbitrageLoan(arbitrager, lender, amount, loanToken, pairToken, sellAdapter, buyAdapter) {
	const arbitrageLoanEncoded = await arbitrager.interface.encodeFunctionData('arbitrageLoan', [
		lender,
		amount,
		loanToken,
		pairToken,
		sellAdapter,
		buyAdapter,
	])
	return { target: arbitrager.address, callData: arbitrageLoanEncoded, value: 0 }
}

module.exports = {
	prepareFlashLoan,
}
