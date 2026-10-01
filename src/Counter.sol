// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
import {IExerciseSolution} from "../lib/forge-std/src/interfaces/IExerciseSolution.sol";

contract Counter is IExerciseSolution {
    address public constant EVALUATOR = 0xB91F87D09a6582b25B20149C60Ad40f23F99d8Dc;

    bytes32 private constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant GREETING_TYPEHASH = keccak256(
        "Greeting(address who,string content,uint256 nonce,uint256 deadline)"
    );
    // N / 2 de secp256k1
    uint256 private constant HALF_N =
        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    function recoverGreeting(
        address who,
        string calldata content,
        uint256 nonce,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external view returns (address signer) {
        require(deadline >= block.timestamp, "expired");
        require(uint256(s) <= HALF_N, "malleable");
        require(v == 27 || v == 28, "bad v");

        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("Permit101Evaluator")),
                keccak256(bytes("1")),
                block.chainid,
                EVALUATOR
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(
                GREETING_TYPEHASH,
                who,
                keccak256(bytes(content)),
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "invalid sig");
    }

    function getPermitToken() external view returns (address) {
        return address(0); // à remplacer à la partie 6
    }

    function getSmartWallet() external view returns (address) {
        return address(0); // à remplacer à la partie 9 (bonus)
    }
}