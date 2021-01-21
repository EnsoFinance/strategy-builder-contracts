const { expect } = require('chai')
const { ethers } = require('hardhat')
const { constants } = ethers
const { AddressZero, WeiPerEther } = constants

const DIVISOR = 1000;

async function encodeTransferFrom(token, from, to, amount) {
  const transferFromEncoded = await token.interface.encodeFunctionData("transferFrom", [from, to, amount])
  return { target: token.address, callData: transferFromEncoded, value: 0 }
}
async function encodeTransfer(token, to, amount) {
  const transferToEncoded = await token.interface.encodeFunctionData("transfer", [to, amount])
  return { target: token.address, callData: transferToEncoded, value: 0 }
}

async function encodeUniswapSwap(router, amountTokens, minTokens, tokenIn, tokenOut, accountFrom, accountTo) {
  const swapEncoded = await router.interface.encodeFunctionData("swap", [amountTokens, minTokens, tokenIn, tokenOut, accountFrom, accountTo, '0x', '0x'])
  const msgValue = tokenIn == AddressZero ? amountTokens : 0
  return { target: router.address, callData: swapEncoded, value: msgValue}
}

async function uniswapTokensForEther(portfolio, multicall, router, _oracle, tokens, receiver) {
  let calls = []
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const swapAmount = await tok.balanceOf(multicall.address)
    expect(swapAmount != 0)
    const ethAmount = await _oracle.consult(swapAmount.div(WeiPerEther), tok.address)
    expect(ethAmount != 0)
    // console.log('Swapping token', i, 'tokens: ', ethers.utils.formatEther(swapAmount), '\n - for eth: ', ethers.utils.formatEther(ethAmount))
    // get expected amount of tokens from uniswap. ETH is from multicall , tokens are transferred to receiver
    calls.push(await encodeUniswapSwap(router, swapAmount, 0, tok.address, AddressZero, multicall.address, receiver))
    // should fail to deposit only some of the tokens
    // if (i < tokens.length - 1 && receiver == portfolio.address) {
    //   await expect(multicall.initiateRebalance(portfolio.address, [], [], calls)).to.be.reverted
    // }
  }
  return calls
}

async function getPortfolioTokensUniswap(portfolio, multicall, router, _oracle, ethAmount, receiver) {
  const calls = []
  const percentages = await portfolio.getTokenPercentages()
  const tokens = await portfolio.portfolioTokens()
  for (let i = 0; i < tokens.length; i++) {
    const swapAmount = ethAmount.mul(percentages[i]).div(DIVISOR)
    const expectedAmount = await _oracle.consult(swapAmount, tokens[i])
    // TODO: calculate price properly
    expect(swapAmount == expectedAmount)
    // console.log('Swapping ', ethers.utils.formatEther(swapAmount), ' ETH for ', ethers.utils.formatEther(expectedAmount), 'token ', i)
    // get expected amount of tokens from uniswap. ETH is from multicall , tokens are transferred to receiver
    calls.push(await encodeUniswapSwap(router, swapAmount, 0, AddressZero, tokens[i], multicall.address, receiver))
    // should fail to deposit only some of the tokens
    if (i < tokens.length - 1 && receiver == portfolio.address) {
      await expect(multicall.initiateRebalance(portfolio.address, [], [], calls, { value: ethAmount.mul(2) })).to.be.reverted
    }
  }
  return calls
}

// modules.exports.DIVISOR = _DIVISOR;
module.exports =  {encodeUniswapSwap, getPortfolioTokensUniswap, uniswapTokensForEther, encodeTransferFrom, encodeTransfer, DIVISOR}
