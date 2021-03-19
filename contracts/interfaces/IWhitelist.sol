//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.12;

interface IWhitelist {
    function approve(address account) external;

    function revoke(address account) external;

    function approved(address account) external view returns (bool);
}
