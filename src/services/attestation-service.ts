import { usePrivy, useWallets, ConnectedWallet } from "@privy-io/react-auth";
import { optimism } from "viem/chains";
import { createPublicClient, Hex, custom } from "viem";
import { importJWK, jwtVerify, JWK } from "jose";
import { ADDRESS, ABI } from "./kms-contract";

// const ADDRESS = "0xe8CDF27AcD73a434D661C84887215F7598e7d0d3";
// const ABI = [
//   {
//     inputs: [
//       { internalType: "string", name: "_lpTokenName", type: "string" },
//       { internalType: "string", name: "_lpTokenSymbol", type: "string" },
//       { internalType: "uint8", name: "_tokenDecimals", type: "uint8" },
//       { internalType: "uint8", name: "_sharedDecimals", type: "uint8" },
//       { internalType: "address", name: "_endpoint", type: "address" },
//       { internalType: "address", name: "_owner", type: "address" },
//     ],
//     stateMutability: "nonpayable",
//     type: "constructor",
//   },
//   { inputs: [], name: "InvalidLocalDecimals", type: "error" },
//   { inputs: [], name: "Path_AlreadyHasCredit", type: "error" },
//   { inputs: [], name: "Path_InsufficientCredit", type: "error" },
//   { inputs: [], name: "Path_UnlimitedCredit", type: "error" },
//   {
//     inputs: [
//       { internalType: "uint256", name: "amountLD", type: "uint256" },
//       { internalType: "uint256", name: "minAmountLD", type: "uint256" },
//     ],
//     name: "SlippageExceeded",
//     type: "error",
//   },
//   { inputs: [], name: "Stargate_InsufficientFare", type: "error" },
//   { inputs: [], name: "Stargate_InvalidAmount", type: "error" },
//   { inputs: [], name: "Stargate_InvalidPath", type: "error" },
//   { inputs: [], name: "Stargate_InvalidTokenDecimals", type: "error" },
//   { inputs: [], name: "Stargate_LzTokenUnavailable", type: "error" },
//   { inputs: [], name: "Stargate_OnlyTaxi", type: "error" },
//   { inputs: [], name: "Stargate_OutflowFailed", type: "error" },
//   { inputs: [], name: "Stargate_Paused", type: "error" },
//   { inputs: [], name: "Stargate_RecoverTokenUnsupported", type: "error" },
//   { inputs: [], name: "Stargate_ReentrantCall", type: "error" },
//   { inputs: [], name: "Stargate_SlippageTooHigh", type: "error" },
//   { inputs: [], name: "Stargate_Unauthorized", type: "error" },
//   { inputs: [], name: "Stargate_UnreceivedTokenNotFound", type: "error" },
//   { inputs: [], name: "Transfer_ApproveFailed", type: "error" },
//   { inputs: [], name: "Transfer_TransferFailed", type: "error" },
//   {
//     anonymous: false,
//     inputs: [
//       {
//         components: [
//           { internalType: "address", name: "feeLib", type: "address" },
//           { internalType: "address", name: "planner", type: "address" },
//           { internalType: "address", name: "treasurer", type: "address" },
//           { internalType: "address", name: "tokenMessaging", type: "address" },
//           { internalType: "address", name: "creditMessaging", type: "address" },
//           { internalType: "address", name: "lzToken", type: "address" },
//         ],
//         indexed: false,
//         internalType: "struct StargateBase.AddressConfig",
//         name: "config",
//         type: "tuple",
//       },
//     ],
//     name: "AddressConfigSet",
//     type: "event",
//   },
//   {
//     anonymous: false,
//     inputs: [
//       {
//         indexed: false,
//         internalType: "uint32",
//         name: "srcEid",
//         type: "uint32",
//       },
//       {
//         components: [
//           { internalType: "uint32", name: "srcEid", type: "uint32" },
//           { internalType: "uint64", name: "amount", type: "uint64" },
//         ],
//         indexed: false,
//         internalType: "struct Credit[]",
//         name: "credits",
//         type: "tuple[]",
//       },
//     ],
//     name: "CreditsReceived",
//     type: "event",
//   },
//   {
//     anonymous: false,
//     inputs: [
//       {
//         indexed: false,
//         internalType: "uint32",
//         name: "dstEid",
//         type: "uint32",
//       },
//       {
//         components: [
//           { internalType: "uint32", name: "srcEid", type: "uint32" },
//           { internalType: "uint64", name: "amount", type: "uint64" },
//         ],
//         indexed: false,
//         internalType: "struct Credit[]",
//         name: "credits",
//         type: "tuple[]",
//       },
//     ],
//     name: "CreditsSent",
//     type: "event",
//   },
//   {
//     anonymous: false,
//     inputs: [
//       {
//         indexed: true,
//         internalType: "address",
//         name: "payer",
//         type: "address",
//       },
//       {
//         indexed: true,
//         internalType: "address",
//         name: "receiver",
//         type: "address",
//       },
//       {
//         indexed: false,
//         internalType: "uint256",
//         name: "amountLD",
//         type: "uint256",
//       },
//     ],
//     name: "Deposited",
//     type: "event",
//   },
//   {
//     anonymous: false,
//     inputs: [
//       {
//         indexed: false,
//         internalType: "uint32",
//         name: "dstEid",
//         type: "uint32",
//       },
//       { indexed: false, internalType: "bool", name: "oft", type: "bool" },
//     ],
//     name: "OFTPathSet",
//     type: "event",
//   },
//   {
//     anonymous: false,
//     inputs: [
//       { indexed: true, internalType: "bytes32", name: "guid", type: "bytes32" },
//       {
//         indexed: false,
//         internalType: "uint32",
//         name: "srcEid",
//         type: "uint32",
//       },
//       {
//         indexed: true,
//         internalType: "address",
//         name: "toAddress",
//         type: "address",
//       },
//       {
//         indexed: false,
//         internalType: "uint256",
//         name: "amountReceivedLD",
//         type: "uint256",
//       },
//     ],
//     name: "OFTReceived",
//     type: "event",
//   },
//   {
//     anonymous: false,
//     inputs: [
//       { indexed: true, internalType: "bytes32", name: "guid", type: "bytes32" },
//       {
//         indexed: false,
//         internalType: "uint32",
//         name: "dstEid",
//         type: "uint32",
//       },
//       {
//         indexed: true,
//         internalType: "address",
//         name: "fromAddress",
//         type: "address",
//       },
//       {
//         indexed: false,
//         internalType: "uint256",
//         name: "amountSentLD",
//         type: "uint256",
//       },
//       {
//         indexed: false,
//         internalType: "uint256",
//         name: "amountReceivedLD",
//         type: "uint256",
//       },
//     ],
//     name: "OFTSent",
//     type: "event",
//   },
//   {
//     anonymous: false,
//     inputs: [
//       {
//         indexed: true,
//         internalType: "address",
//         name: "previousOwner",
//         type: "address",
//       },
//       {
//         indexed: true,
//         internalType: "address",
//         name: "newOwner",
//         type: "address",
//       },
//     ],
//     name: "OwnershipTransferred",
//     type: "event",
//   },
//   {
//     anonymous: false,
//     inputs: [
//       { indexed: false, internalType: "bool", name: "paused", type: "bool" },
//     ],
//     name: "PauseSet",
//     type: "event",
//   },
//   {
//     anonymous: false,
//     inputs: [
//       {
//         indexed: false,
//         internalType: "uint256",
//         name: "amount",
//         type: "uint256",
//       },
//     ],
//     name: "PlannerFeeWithdrawn",
//     type: "event",
//   },
//   {
//     anonymous: false,
//     inputs: [
//       {
//         indexed: true,
//         internalType: "address",
//         name: "payer",
//         type: "address",
//       },
//       {
//         indexed: true,
//         internalType: "address",
//         name: "receiver",
//         type: "address",
//       },
//       {
//         indexed: false,
//         internalType: "uint256",
//         name: "amountLD",
//         type: "uint256",
//       },
//     ],
//     name: "Redeemed",
//     type: "event",
//   },
//   {
//     anonymous: false,
//     inputs: [
//       {
//         indexed: false,
//         internalType: "uint64",
//         name: "amountSD",
//         type: "uint64",
//       },
//     ],
//     name: "TreasuryFeeAdded",
//     type: "event",
//   },
//   {
//     anonymous: false,
//     inputs: [
//       { indexed: false, internalType: "address", name: "to", type: "address" },
//       {
//         indexed: false,
//         internalType: "uint64",
//         name: "amountSD",
//         type: "uint64",
//       },
//     ],
//     name: "TreasuryFeeWithdrawn",
//     type: "event",
//   },
//   {
//     anonymous: false,
//     inputs: [
//       {
//         indexed: false,
//         internalType: "bytes32",
//         name: "guid",
//         type: "bytes32",
//       },
//       { indexed: false, internalType: "uint8", name: "index", type: "uint8" },
//       {
//         indexed: false,
//         internalType: "uint32",
//         name: "srcEid",
//         type: "uint32",
//       },
//       {
//         indexed: false,
//         internalType: "address",
//         name: "receiver",
//         type: "address",
//       },
//       {
//         indexed: false,
//         internalType: "uint256",
//         name: "amountLD",
//         type: "uint256",
//       },
//       {
//         indexed: false,
//         internalType: "bytes",
//         name: "composeMsg",
//         type: "bytes",
//       },
//     ],
//     name: "UnreceivedTokenCached",
//     type: "event",
//   },
//   { stateMutability: "payable", type: "fallback" },
//   {
//     inputs: [{ internalType: "uint256", name: "_amountLD", type: "uint256" }],
//     name: "addTreasuryFee",
//     outputs: [],
//     stateMutability: "payable",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "approvalRequired",
//     outputs: [{ internalType: "bool", name: "", type: "bool" }],
//     stateMutability: "pure",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "deficitOffset",
//     outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [
//       { internalType: "address", name: "_receiver", type: "address" },
//       { internalType: "uint256", name: "_amountLD", type: "uint256" },
//     ],
//     name: "deposit",
//     outputs: [{ internalType: "uint256", name: "amountLD", type: "uint256" }],
//     stateMutability: "payable",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "endpoint",
//     outputs: [
//       {
//         internalType: "contract ILayerZeroEndpointV2",
//         name: "",
//         type: "address",
//       },
//     ],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "getAddressConfig",
//     outputs: [
//       {
//         components: [
//           { internalType: "address", name: "feeLib", type: "address" },
//           { internalType: "address", name: "planner", type: "address" },
//           { internalType: "address", name: "treasurer", type: "address" },
//           { internalType: "address", name: "tokenMessaging", type: "address" },
//           { internalType: "address", name: "creditMessaging", type: "address" },
//           { internalType: "address", name: "lzToken", type: "address" },
//         ],
//         internalType: "struct StargateBase.AddressConfig",
//         name: "",
//         type: "tuple",
//       },
//     ],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "getTransferGasLimit",
//     outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "localEid",
//     outputs: [{ internalType: "uint32", name: "", type: "uint32" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "lpToken",
//     outputs: [{ internalType: "address", name: "", type: "address" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "oftVersion",
//     outputs: [
//       { internalType: "bytes4", name: "interfaceId", type: "bytes4" },
//       { internalType: "uint64", name: "version", type: "uint64" },
//     ],
//     stateMutability: "pure",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "owner",
//     outputs: [{ internalType: "address", name: "", type: "address" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [{ internalType: "uint32", name: "eid", type: "uint32" }],
//     name: "paths",
//     outputs: [{ internalType: "uint64", name: "credit", type: "uint64" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "plannerFee",
//     outputs: [{ internalType: "uint256", name: "available", type: "uint256" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "poolBalance",
//     outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [
//       {
//         components: [
//           { internalType: "uint32", name: "dstEid", type: "uint32" },
//           { internalType: "bytes32", name: "to", type: "bytes32" },
//           { internalType: "uint256", name: "amountLD", type: "uint256" },
//           { internalType: "uint256", name: "minAmountLD", type: "uint256" },
//           { internalType: "bytes", name: "extraOptions", type: "bytes" },
//           { internalType: "bytes", name: "composeMsg", type: "bytes" },
//           { internalType: "bytes", name: "oftCmd", type: "bytes" },
//         ],
//         internalType: "struct SendParam",
//         name: "_sendParam",
//         type: "tuple",
//       },
//     ],
//     name: "quoteOFT",
//     outputs: [
//       {
//         components: [
//           { internalType: "uint256", name: "minAmountLD", type: "uint256" },
//           { internalType: "uint256", name: "maxAmountLD", type: "uint256" },
//         ],
//         internalType: "struct OFTLimit",
//         name: "limit",
//         type: "tuple",
//       },
//       {
//         components: [
//           { internalType: "int256", name: "feeAmountLD", type: "int256" },
//           { internalType: "string", name: "description", type: "string" },
//         ],
//         internalType: "struct OFTFeeDetail[]",
//         name: "oftFeeDetails",
//         type: "tuple[]",
//       },
//       {
//         components: [
//           { internalType: "uint256", name: "amountSentLD", type: "uint256" },
//           {
//             internalType: "uint256",
//             name: "amountReceivedLD",
//             type: "uint256",
//           },
//         ],
//         internalType: "struct OFTReceipt",
//         name: "receipt",
//         type: "tuple",
//       },
//     ],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [
//       {
//         components: [
//           { internalType: "uint32", name: "dstEid", type: "uint32" },
//           { internalType: "bytes32", name: "to", type: "bytes32" },
//           { internalType: "uint256", name: "amountLD", type: "uint256" },
//           { internalType: "uint256", name: "minAmountLD", type: "uint256" },
//           { internalType: "bytes", name: "extraOptions", type: "bytes" },
//           { internalType: "bytes", name: "composeMsg", type: "bytes" },
//           { internalType: "bytes", name: "oftCmd", type: "bytes" },
//         ],
//         internalType: "struct SendParam",
//         name: "_sendParam",
//         type: "tuple",
//       },
//       { internalType: "bool", name: "_payInLzToken", type: "bool" },
//     ],
//     name: "quoteRedeemSend",
//     outputs: [
//       {
//         components: [
//           { internalType: "uint256", name: "nativeFee", type: "uint256" },
//           { internalType: "uint256", name: "lzTokenFee", type: "uint256" },
//         ],
//         internalType: "struct MessagingFee",
//         name: "fee",
//         type: "tuple",
//       },
//     ],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [
//       {
//         components: [
//           { internalType: "uint32", name: "dstEid", type: "uint32" },
//           { internalType: "bytes32", name: "to", type: "bytes32" },
//           { internalType: "uint256", name: "amountLD", type: "uint256" },
//           { internalType: "uint256", name: "minAmountLD", type: "uint256" },
//           { internalType: "bytes", name: "extraOptions", type: "bytes" },
//           { internalType: "bytes", name: "composeMsg", type: "bytes" },
//           { internalType: "bytes", name: "oftCmd", type: "bytes" },
//         ],
//         internalType: "struct SendParam",
//         name: "_sendParam",
//         type: "tuple",
//       },
//       { internalType: "bool", name: "_payInLzToken", type: "bool" },
//     ],
//     name: "quoteSend",
//     outputs: [
//       {
//         components: [
//           { internalType: "uint256", name: "nativeFee", type: "uint256" },
//           { internalType: "uint256", name: "lzTokenFee", type: "uint256" },
//         ],
//         internalType: "struct MessagingFee",
//         name: "fee",
//         type: "tuple",
//       },
//     ],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [
//       { internalType: "uint32", name: "_srcEid", type: "uint32" },
//       {
//         components: [
//           { internalType: "uint32", name: "srcEid", type: "uint32" },
//           { internalType: "uint64", name: "amount", type: "uint64" },
//         ],
//         internalType: "struct Credit[]",
//         name: "_credits",
//         type: "tuple[]",
//       },
//     ],
//     name: "receiveCredits",
//     outputs: [],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [
//       {
//         components: [
//           { internalType: "uint32", name: "srcEid", type: "uint32" },
//           { internalType: "bytes32", name: "sender", type: "bytes32" },
//           { internalType: "uint64", name: "nonce", type: "uint64" },
//         ],
//         internalType: "struct Origin",
//         name: "_origin",
//         type: "tuple",
//       },
//       { internalType: "bytes32", name: "_guid", type: "bytes32" },
//       { internalType: "uint8", name: "_seatNumber", type: "uint8" },
//       { internalType: "address", name: "_receiver", type: "address" },
//       { internalType: "uint64", name: "_amountSD", type: "uint64" },
//     ],
//     name: "receiveTokenBus",
//     outputs: [],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [
//       {
//         components: [
//           { internalType: "uint32", name: "srcEid", type: "uint32" },
//           { internalType: "bytes32", name: "sender", type: "bytes32" },
//           { internalType: "uint64", name: "nonce", type: "uint64" },
//         ],
//         internalType: "struct Origin",
//         name: "_origin",
//         type: "tuple",
//       },
//       { internalType: "bytes32", name: "_guid", type: "bytes32" },
//       { internalType: "address", name: "_receiver", type: "address" },
//       { internalType: "uint64", name: "_amountSD", type: "uint64" },
//       { internalType: "bytes", name: "_composeMsg", type: "bytes" },
//     ],
//     name: "receiveTokenTaxi",
//     outputs: [],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [
//       { internalType: "address", name: "_token", type: "address" },
//       { internalType: "address", name: "_to", type: "address" },
//       { internalType: "uint256", name: "_amount", type: "uint256" },
//     ],
//     name: "recoverToken",
//     outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [
//       { internalType: "uint256", name: "_amountLD", type: "uint256" },
//       { internalType: "address", name: "_receiver", type: "address" },
//     ],
//     name: "redeem",
//     outputs: [{ internalType: "uint256", name: "amountLD", type: "uint256" }],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [
//       {
//         components: [
//           { internalType: "uint32", name: "dstEid", type: "uint32" },
//           { internalType: "bytes32", name: "to", type: "bytes32" },
//           { internalType: "uint256", name: "amountLD", type: "uint256" },
//           { internalType: "uint256", name: "minAmountLD", type: "uint256" },
//           { internalType: "bytes", name: "extraOptions", type: "bytes" },
//           { internalType: "bytes", name: "composeMsg", type: "bytes" },
//           { internalType: "bytes", name: "oftCmd", type: "bytes" },
//         ],
//         internalType: "struct SendParam",
//         name: "_sendParam",
//         type: "tuple",
//       },
//       {
//         components: [
//           { internalType: "uint256", name: "nativeFee", type: "uint256" },
//           { internalType: "uint256", name: "lzTokenFee", type: "uint256" },
//         ],
//         internalType: "struct MessagingFee",
//         name: "_fee",
//         type: "tuple",
//       },
//       { internalType: "address", name: "_refundAddress", type: "address" },
//     ],
//     name: "redeemSend",
//     outputs: [
//       {
//         components: [
//           { internalType: "bytes32", name: "guid", type: "bytes32" },
//           { internalType: "uint64", name: "nonce", type: "uint64" },
//           {
//             components: [
//               { internalType: "uint256", name: "nativeFee", type: "uint256" },
//               { internalType: "uint256", name: "lzTokenFee", type: "uint256" },
//             ],
//             internalType: "struct MessagingFee",
//             name: "fee",
//             type: "tuple",
//           },
//         ],
//         internalType: "struct MessagingReceipt",
//         name: "msgReceipt",
//         type: "tuple",
//       },
//       {
//         components: [
//           { internalType: "uint256", name: "amountSentLD", type: "uint256" },
//           {
//             internalType: "uint256",
//             name: "amountReceivedLD",
//             type: "uint256",
//           },
//         ],
//         internalType: "struct OFTReceipt",
//         name: "oftReceipt",
//         type: "tuple",
//       },
//     ],
//     stateMutability: "payable",
//     type: "function",
//   },
//   {
//     inputs: [{ internalType: "address", name: "_owner", type: "address" }],
//     name: "redeemable",
//     outputs: [{ internalType: "uint256", name: "amountLD", type: "uint256" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "renounceOwnership",
//     outputs: [],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [
//       { internalType: "bytes32", name: "_guid", type: "bytes32" },
//       { internalType: "uint8", name: "_index", type: "uint8" },
//       { internalType: "uint32", name: "_srcEid", type: "uint32" },
//       { internalType: "address", name: "_receiver", type: "address" },
//       { internalType: "uint256", name: "_amountLD", type: "uint256" },
//       { internalType: "bytes", name: "_composeMsg", type: "bytes" },
//     ],
//     name: "retryReceiveToken",
//     outputs: [],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [
//       {
//         components: [
//           { internalType: "uint32", name: "dstEid", type: "uint32" },
//           { internalType: "bytes32", name: "to", type: "bytes32" },
//           { internalType: "uint256", name: "amountLD", type: "uint256" },
//           { internalType: "uint256", name: "minAmountLD", type: "uint256" },
//           { internalType: "bytes", name: "extraOptions", type: "bytes" },
//           { internalType: "bytes", name: "composeMsg", type: "bytes" },
//           { internalType: "bytes", name: "oftCmd", type: "bytes" },
//         ],
//         internalType: "struct SendParam",
//         name: "_sendParam",
//         type: "tuple",
//       },
//       {
//         components: [
//           { internalType: "uint256", name: "nativeFee", type: "uint256" },
//           { internalType: "uint256", name: "lzTokenFee", type: "uint256" },
//         ],
//         internalType: "struct MessagingFee",
//         name: "_fee",
//         type: "tuple",
//       },
//       { internalType: "address", name: "_refundAddress", type: "address" },
//     ],
//     name: "send",
//     outputs: [
//       {
//         components: [
//           { internalType: "bytes32", name: "guid", type: "bytes32" },
//           { internalType: "uint64", name: "nonce", type: "uint64" },
//           {
//             components: [
//               { internalType: "uint256", name: "nativeFee", type: "uint256" },
//               { internalType: "uint256", name: "lzTokenFee", type: "uint256" },
//             ],
//             internalType: "struct MessagingFee",
//             name: "fee",
//             type: "tuple",
//           },
//         ],
//         internalType: "struct MessagingReceipt",
//         name: "msgReceipt",
//         type: "tuple",
//       },
//       {
//         components: [
//           { internalType: "uint256", name: "amountSentLD", type: "uint256" },
//           {
//             internalType: "uint256",
//             name: "amountReceivedLD",
//             type: "uint256",
//           },
//         ],
//         internalType: "struct OFTReceipt",
//         name: "oftReceipt",
//         type: "tuple",
//       },
//     ],
//     stateMutability: "payable",
//     type: "function",
//   },
//   {
//     inputs: [
//       { internalType: "uint32", name: "_dstEid", type: "uint32" },
//       {
//         components: [
//           { internalType: "uint32", name: "srcEid", type: "uint32" },
//           { internalType: "uint64", name: "amount", type: "uint64" },
//           { internalType: "uint64", name: "minAmount", type: "uint64" },
//         ],
//         internalType: "struct TargetCredit[]",
//         name: "_credits",
//         type: "tuple[]",
//       },
//     ],
//     name: "sendCredits",
//     outputs: [
//       {
//         components: [
//           { internalType: "uint32", name: "srcEid", type: "uint32" },
//           { internalType: "uint64", name: "amount", type: "uint64" },
//         ],
//         internalType: "struct Credit[]",
//         name: "",
//         type: "tuple[]",
//       },
//     ],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [
//       {
//         components: [
//           { internalType: "uint32", name: "dstEid", type: "uint32" },
//           { internalType: "bytes32", name: "to", type: "bytes32" },
//           { internalType: "uint256", name: "amountLD", type: "uint256" },
//           { internalType: "uint256", name: "minAmountLD", type: "uint256" },
//           { internalType: "bytes", name: "extraOptions", type: "bytes" },
//           { internalType: "bytes", name: "composeMsg", type: "bytes" },
//           { internalType: "bytes", name: "oftCmd", type: "bytes" },
//         ],
//         internalType: "struct SendParam",
//         name: "_sendParam",
//         type: "tuple",
//       },
//       {
//         components: [
//           { internalType: "uint256", name: "nativeFee", type: "uint256" },
//           { internalType: "uint256", name: "lzTokenFee", type: "uint256" },
//         ],
//         internalType: "struct MessagingFee",
//         name: "_fee",
//         type: "tuple",
//       },
//       { internalType: "address", name: "_refundAddress", type: "address" },
//     ],
//     name: "sendToken",
//     outputs: [
//       {
//         components: [
//           { internalType: "bytes32", name: "guid", type: "bytes32" },
//           { internalType: "uint64", name: "nonce", type: "uint64" },
//           {
//             components: [
//               { internalType: "uint256", name: "nativeFee", type: "uint256" },
//               { internalType: "uint256", name: "lzTokenFee", type: "uint256" },
//             ],
//             internalType: "struct MessagingFee",
//             name: "fee",
//             type: "tuple",
//           },
//         ],
//         internalType: "struct MessagingReceipt",
//         name: "msgReceipt",
//         type: "tuple",
//       },
//       {
//         components: [
//           { internalType: "uint256", name: "amountSentLD", type: "uint256" },
//           {
//             internalType: "uint256",
//             name: "amountReceivedLD",
//             type: "uint256",
//           },
//         ],
//         internalType: "struct OFTReceipt",
//         name: "oftReceipt",
//         type: "tuple",
//       },
//       {
//         components: [
//           { internalType: "uint72", name: "ticketId", type: "uint72" },
//           { internalType: "bytes", name: "passengerBytes", type: "bytes" },
//         ],
//         internalType: "struct Ticket",
//         name: "ticket",
//         type: "tuple",
//       },
//     ],
//     stateMutability: "payable",
//     type: "function",
//   },
//   {
//     inputs: [
//       {
//         components: [
//           { internalType: "address", name: "feeLib", type: "address" },
//           { internalType: "address", name: "planner", type: "address" },
//           { internalType: "address", name: "treasurer", type: "address" },
//           { internalType: "address", name: "tokenMessaging", type: "address" },
//           { internalType: "address", name: "creditMessaging", type: "address" },
//           { internalType: "address", name: "lzToken", type: "address" },
//         ],
//         internalType: "struct StargateBase.AddressConfig",
//         name: "_config",
//         type: "tuple",
//       },
//     ],
//     name: "setAddressConfig",
//     outputs: [],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [
//       { internalType: "uint256", name: "_deficitOffsetLD", type: "uint256" },
//     ],
//     name: "setDeficitOffset",
//     outputs: [],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [
//       { internalType: "uint32", name: "_dstEid", type: "uint32" },
//       { internalType: "bool", name: "_oft", type: "bool" },
//     ],
//     name: "setOFTPath",
//     outputs: [],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [{ internalType: "bool", name: "_paused", type: "bool" }],
//     name: "setPause",
//     outputs: [],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [{ internalType: "uint256", name: "_gasLimit", type: "uint256" }],
//     name: "setTransferGasLimit",
//     outputs: [],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "sharedDecimals",
//     outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "stargateType",
//     outputs: [{ internalType: "enum StargateType", name: "", type: "uint8" }],
//     stateMutability: "pure",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "status",
//     outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "token",
//     outputs: [{ internalType: "address", name: "", type: "address" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
//     name: "transferOwnership",
//     outputs: [],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "treasuryFee",
//     outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "tvl",
//     outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [
//       { internalType: "bytes32", name: "guid", type: "bytes32" },
//       { internalType: "uint8", name: "index", type: "uint8" },
//     ],
//     name: "unreceivedTokens",
//     outputs: [{ internalType: "bytes32", name: "hash", type: "bytes32" }],
//     stateMutability: "view",
//     type: "function",
//   },
//   {
//     inputs: [],
//     name: "withdrawPlannerFee",
//     outputs: [],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   {
//     inputs: [
//       { internalType: "address", name: "_to", type: "address" },
//       { internalType: "uint64", name: "_amountSD", type: "uint64" },
//     ],
//     name: "withdrawTreasuryFee",
//     outputs: [],
//     stateMutability: "nonpayable",
//     type: "function",
//   },
//   { stateMutability: "payable", type: "receive" },
// ];

export const AttestationService = {
  async getAttestation(wallets: ConnectedWallet[], conversationId: string) {
    // const { authenticated } = usePrivy();
    // if (!authenticated) {
    //     throw new Error("Not authenticated");
    // }

    // const { wallets } = useWallets();
    const wallet = wallets[0];
    await wallet.switchChain(optimism.id);

    const provider = await wallet.getEthereumProvider();
    const client = createPublicClient({
      // account: wallet.address as Hex,
      chain: optimism,
      transport: custom(provider),
    });

    // const ethersProvider = new ethers.BrowserProvider(provider);
    // // const signer = ethersProvider.getSigner();
    // const contract = new ethers.Contract(ADDRESS, ABI, ethersProvider);

    // const res = await contract.myData();
    // const owner: string = await contract.owner();
    const owner = await client.readContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "owner",
    });

    console.log(owner);
    return owner;

    // const attestation = await privy.attestations.create({
    //     walletAddress: wallet.address,
    //     conversationId: conversationId,
    // });
    const response = await fetch(`/api/attestation/${conversationId}`);
    return response.json();
  },

  // async handleAttestation(publicKeys: string[], signature: string) {
  //   const attestationToken = await this.getAttestation(publicKeys, signature);
  //   // const { payload } = await jwtVerify(attestationToken, publicKeys);
  //   return payload;
  // },

  async handleAttestation(publicKeys: string[], signature: string) {
    const attestationToken = await this.getAttestation(publicKeys, signature);
    // const { payload } = await jwtVerify(attestationToken, publicKeys);
    return payload;
    // 1) Load the sample response JSON
    const respPath = path.resolve(
      __dirname,
      "get_attestation_token_response_sample.json"
    );
    const rawResp = fs.readFileSync(respPath, "utf-8");
    const response = JSON.parse(rawResp) as AttestationTokenResponse;

    // 2) Load the Trust Authority JWKs
    const jwkPath = path.resolve(__dirname, "trust-authority-certs.txt");
    const rawJwks = fs.readFileSync(jwkPath, "utf-8");
    const jwks = JSON.parse(rawJwks) as Jwks;
    const lastKey = jwks.keys[jwks.keys.length - 1];

    // 3) Import the last JWK as a public key
    const publicKey = await importJWK(lastKey, "RS256");

    // 4) Verify the JWT (ignoring expiration)
    //    In jose, pass { ignoreExp: true } in jwtVerify options
    const { payload: verifiedPayload } = await jwtVerify(
      response.token,
      publicKey,
      { algorithms: ["RS256"], ignoreExp: true }
    );
    const jwtPayload = verifiedPayload as JWTPayload & TdxPayload;

    // 5) Compare “quotehash”
    //    Compute SHA-256 over the raw quote bytes (hex → Buffer)
    const quoteBytes = Buffer.from(response.quote, "hex");
    const computedQuoteHash = createHash("sha256")
      .update(quoteBytes)
      .digest("hex");
    if (computedQuoteHash !== jwtPayload.tdx.tdx_collateral.quotehash) {
      throw new Error(
        `quotehash mismatch:\n  expected ${jwtPayload.tdx.tdx_collateral.quotehash}\n  got      ${computedQuoteHash}`
      );
    }

    // 6) Extract `user_data` from the quote:
    //    quote is a hex string; header.user_data starts at byte offset 28, length 20 bytes
    //    which corresponds to hex indices [28*2 .. 48*2).
    const userDataHex = response.quote.slice(28 * 2, 48 * 2);
    // 7) Compute device_id = SHA-256(user_data)
    const deviceId = createHash("sha256")
      .update(Buffer.from(userDataHex, "hex"))
      .digest("hex");

    // 8) Replay event_log to recompute RTMR[] values
    const eventLog: EventLogEntry[] = JSON.parse(response.event_log);
    const rtmr: string[] = Array(4).fill("0".repeat(96));

    for (const event of eventLog) {
      // previous value (hex) + event.digest (hex) → Buffer, then SHA-384
      const prevHex = rtmr[event.imr];
      const concatenated = Buffer.from(prevHex + event.digest, "hex");
      const newRtmr = createHash("sha384").update(concatenated).digest("hex");
      rtmr[event.imr] = newRtmr;
    }

    // 9) Compare each rtmr[i] against jwtPayload.tdx[`tdx_rtmr${i}`]
    for (let i = 0; i < 4; i++) {
      const claimName = `tdx_rtmr${i}` as keyof TdxPayload["tdx"];
      const expected = jwtPayload.tdx[claimName];
      if (rtmr[i] !== expected) {
        throw new Error(
          `RTMR${i} mismatch:\n  expected ${expected}\n  got      ${rtmr[i]}`
        );
      }
    }

    // 10) Parse event_log again to pick out app_id, key_provider, compose_hash
    let appId = "";
    let keyProvider = "";
    let composeHash = "";
    for (const event of eventLog) {
      if (event.event === "app-id") {
        appId = event.event_payload;
      } else if (event.event === "key-provider") {
        keyProvider = event.event_payload;
      } else if (event.event === "compose-hash") {
        composeHash = event.event_payload;
      }
    }
    if (!appId || !keyProvider || !composeHash) {
      throw new Error(
        "Missing one of app-id, key-provider, or compose-hash in event_log"
      );
    }

    // 11) Compute mr_system:
    //     mr_system = SHA-256(
    //        tdx_mrtd
    //      + tdx_rtmr0
    //      + tdx_rtmr1
    //      + tdx_rtmr2
    //      + SHA-256(key_provider)
    //     )
    const sha256OfKeyProvider = createHash("sha256")
      .update(Buffer.from(keyProvider, "hex"))
      .digest("hex");

    const mrSystemConcat =
      jwtPayload.tdx.tdx_mrtd +
      jwtPayload.tdx.tdx_rtmr0 +
      jwtPayload.tdx.tdx_rtmr1 +
      jwtPayload.tdx.tdx_rtmr2 +
      sha256OfKeyProvider;
    const mrSystem = createHash("sha256")
      .update(Buffer.from(mrSystemConcat, "hex"))
      .digest("hex");

    // 12) Compute mr_image:
    //     mr_image = SHA-256(
    //        tdx_mrtd
    //      + tdx_rtmr1
    //      + tdx_rtmr2
    //     )
    const mrImageConcat =
      jwtPayload.tdx.tdx_mrtd +
      jwtPayload.tdx.tdx_rtmr1 +
      jwtPayload.tdx.tdx_rtmr2;
    const mrImage = createHash("sha256")
      .update(Buffer.from(mrImageConcat, "hex"))
      .digest("hex");

    // 13) (Optional) Verify a hardcoded expected mr_image:
    const expectedMrImage =
      "36ac6151fcd827d0d78822c57db7c98ff0da2218c12e11f76ac15399b1c193ee";
    if (mrImage !== expectedMrImage) {
      throw new Error(
        `mr_image mismatch:\n  expected ${expectedMrImage}\n  got      ${mrImage}`
      );
    }

    // 14) Log or return the fields needed for KmsAuth.isAppAllowed():
    //     { appId, mrSystem, mrImage, composeHash, deviceId }
    console.log("appId:", appId);
    console.log("mrSystem:", mrSystem);
    console.log("mrImage:", mrImage);
    console.log("composeHash:", composeHash);
    console.log("deviceId:", deviceId);

    // If you need to return them for further processing, you could:
    return {
      appId,
      mrSystem,
      mrImage,
      composeHash,
      deviceId,
    };
  },
};

// export function ContractReader() {
//     const { ethProvider, authenticated } = usePrivy();
//     const [value, setValue] = useState<string>();

//     useEffect(() => {
//       if (!authenticated || !ethProvider) return;

//       // Wrap Privy’s provider in ethers.js
//       const provider = new ethers.providers.Web3Provider(ethProvider);
//       const contract = new ethers.Contract(ADDRESS, ABI, provider);

//       // Call a view function, e.g. `myData()`
//       contract
//         .myData()
//         .then((res: any) => setValue(res.toString()))
//         .catch(console.error);
//     }, [ethProvider, authenticated]);

//     return <div>On-chain data: {value ?? 'Loading…'}</div>;
//   }

// }
// attestation.ts

import * as fs from "fs";
import * as path from "path";
import { importJWK, jwtVerify, JWK, JWTPayload } from "jose";
import { createHash } from "crypto";

interface AttestationTokenResponse {
  token: string;
  quote: string;
  event_log: string; // JSON‐stringified array
  // …any other fields, if present
}

interface Jwks {
  keys: JWK[];
}

interface TdxPayload {
  tdx: {
    tdx_collateral: {
      quotehash: string;
    };
    tdx_rtmr0: string;
    tdx_rtmr1: string;
    tdx_rtmr2: string;
    tdx_rtmr3: string;
    tdx_mrtd: string;
    // …any other tdx fields
  };
  // …other JWT payload fields
}

interface EventLogEntry {
  imr: number;
  digest: string; // hex string
  event: string;
  event_payload: string; // hex string or ascii content, depending on event type
}

async function main() {}

main().catch((err) => {
  console.error("Error in attestation flow:", err);
  process.exit(1);
});
// ["0x88c1bedc8fae9c70c8649e4082aa4c490e6e6659",   "0x9b5041ff69e74e608cb05700b9f5400de797cd69f4c755995b9f1c4260df0f40","0x36ac6151fcd827d0d78822c57db7c98ff0da2218","0x594c9e0b01cf8d41f0d9b7bfecb338c97c30e976d1e33baa235958e29079b82d","0x249301eb6d66e53aadf3ce18717380393de31e1ff14d89492874a0b02303ea28","0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","UpToDate",["ADV-2024-001"]]