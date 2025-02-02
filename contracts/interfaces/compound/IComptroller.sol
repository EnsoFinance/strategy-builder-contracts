//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0 <0.9.0;

interface IComptroller {
    function claimComp(address holder, address[] memory cTokens) external;

    function getCompAddress() external view returns(address);
}
