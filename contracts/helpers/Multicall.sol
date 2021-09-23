//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./RevertDebug.sol";

/// @title Multicall - Aggregate internal calls + show revert message
contract Multicall is RevertDebug {
    struct Call {
        address payable target;
        bytes callData;
    }

    /**
     * @notice Aggregate calls and return a list of the return data
     */
    function aggregate(Call[] memory calls) internal returns (bytes[] memory returnData) {
        returnData = new bytes[](calls.length);
        for (uint256 i = 0; i < calls.length; i++) {
            Call memory internalTx = calls[i];
            (bool success, bytes memory ret) =
                internalTx.target.call(internalTx.callData);
            if (!success) {
                revert(_getPrefixedRevertMsg(ret));
            }
            returnData[i] = ret;
        }
    }
}
