// import { useApiClient } from "@/providers/api-client-provider";
import {
  TdxPayload,
  Jwks,
  EventLogEntry,
  AttestationResult,
} from "@/types/attestation";

export enum VerificationStatus {
  Failed = "Failed",
  Pending = "Pending",
  ContractVerified = "ContractVerified",
  AttestationVerified = "AttestationVerified",
}
export interface VerificationResult {
  status: VerificationStatus;
  attestationResult?: AttestationResult;
  publicKey: string;
}

// export function useAttestationManager() {
//   const apiClient = useApiClient();
//   const { ready, wallets } = useWallets();
//   const client = createPublicClient({
//     chain: optimism,
//     transport: http("https://mainnet.optimism.io"),
//   });

//   const {
//     attestationResults,
//     verificationResults,
//     setAttestationResult,
//     setVerificationResult,
//   } = useAttestationStore();

//   const verifyContract = useCallback(
//     async (
//       publicKeyHex: string,
//       attestationResult: AttestationResult
//     ): Promise<VerificationResult> => {
//       if (verificationResults.hasOwnProperty(attestationResult.appId)) {
//         if (
//           verificationResults[attestationResult.appId].status ===
//           VerificationStatus.ContractVerified
//         ) {
//           console.log("Contract already verified, returning true");
//           return verificationResults[attestationResult.appId];
//         } else if (
//           verificationResults[attestationResult.appId].status ===
//           VerificationStatus.Pending
//         ) {
//           console.log("Contract already pending");
//           return verificationResults[attestationResult.appId];
//         }
//       }

//       setVerificationResult(attestationResult.appId, {
//         status: VerificationStatus.Pending,
//         attestationResult,
//         publicKey: publicKeyHex,
//       });

//       const toHex = (value: string) =>
//         (value.startsWith("0x") ? value : `0x${value}`) as Hex;

//       const [isAllowed, reason] = (await client.readContract({
//         // account: wallet.address as Hex,
//         address:
//           (process.env.NEXT_PUBLIC_KMS_CONTRACT_ADDRESS as `0x${string}`) ||
//           "0x3366E906D7C2362cE4C336f43933Cccf76509B23",
//         abi: ABI,
//         functionName: "isAppAllowed",
//         args: [
//           {
//             appId: toHex(attestationResult.appId),
//             composeHash: toHex(attestationResult.composeHash),
//             instanceId: toHex(attestationResult.instanceId),
//             deviceId: toHex(attestationResult.deviceId),
//             mrAggregated: toHex(attestationResult.mrAggregated),
//             mrSystem: toHex(attestationResult.mrSystem),
//             osImageHash: toHex(attestationResult.osImageHash),
//             tcbStatus: attestationResult.tcbStatus,
//             advisoryIds: attestationResult.advisoryIds,
//           },
//         ],
//       })) as [boolean, string];

//       const verificationResult = {
//         status: isAllowed
//           ? VerificationStatus.ContractVerified
//           : VerificationStatus.Failed,
//         attestationResult,
//         publicKey: publicKeyHex,
//       };
//       setVerificationResult(attestationResult.appId, verificationResult);
//       console.log("isAllowed:", isAllowed, "reason:", reason);
//       return verificationResult;
//     },
//     [wallets, verificationResults, setVerificationResult, ready]
//   );

// //   const verifyAttestation = useCallback(
// //     async (publicKeyHex: string): Promise<AttestationResult> => {
// //       console.log("verifying attestation for publicKeyHex:", publicKeyHex);
// //       if (attestationResults[publicKeyHex]) {
// //         console.log("attestation already verified, returning true");
// //         verifyContract(publicKeyHex, attestationResults[publicKeyHex]);
// //         return attestationResults[publicKeyHex];
// //       }

//       async function verifyOnchain(attestationResponse: AttestationResponse) {
//         if (!attestationResponse.tx_hash) {
//           throw new Error("tx_hash is required for v1 attestation");
//         }

//         const txHash = `0x${attestationResponse.tx_hash}` as `0x${string}`;

//         const [tx, receipt] = await Promise.all([
//           client.getTransaction({ hash: txHash }),
//           client.getTransactionReceipt({ hash: txHash }),
//         ]);

//         const calldataBytes = attestationUtils.hexToBuf(
//           tx.input as `0x${string}`
//         );
//         const quoteBytes = calldataBytes.slice(68, calldataBytes.length - 18);
//         const quoteHex = attestationUtils.bufToHex(quoteBytes);

//         if (quoteHex !== `0x${attestationResponse.quote}`) {
//           throw new Error("quote in tx input ≠ quote in REST payload");
//         }

//         const logData = attestationUtils.hexToBuf(
//           receipt.logs[0].data as `0x${string}`
//         );
//         const successWord = attestationUtils.bufToHex(logData.slice(0, 32));
//         if (successWord !== "0x" + "1".padStart(64, "0"))
//           throw new Error("attestation contract emitted success = 0");

//         const output = logData.slice(128); // skip 4 × 32-byte words
//         const rawQuote = output.slice(13, 13 + 584); // SGX quote body

//         const reportData = rawQuote.slice(-64, -32); // last 32 bytes of REPORTDATA
//         const pubKeyHash = await sha256Hex(publicKeyHex); // util helper

//         if (bufToHex(reportData) !== pubKeyHash)
//           throw new Error("public-key hash mismatch");

//         const deviceId = await attestationUtils.deviceIdFromQuote(quoteHex);

//         const eventLog: EventLogEntry[] = JSON.parse(attestationResponse.event_log);

//         const replayedRtmr: string[] = await attestationUtils.replayRtmr(eventLog);
//         const rtmrOnChain = [...Array(4)].map((_, i) =>
//           bufToHex(
//             rawQuote.slice(328 + i * 48, 328 + (i + 1) * 48),
//           ),
//         );
        
//         rtmrOnChain.forEach((rtmr, i) => {
//           if (rtmr !== replayedRtmr[i])
//             throw new Error(`RTMR${i} mismatch (on-chain vs replay)`);
//         });
        

//         const bootInfo = attestationUtils.extractBootInfo(eventLog);
//         const { appId, keyProvider, composeHash, instanceId, osImageHash } =
//           bootInfo;
        
//           if (!appId || !keyProvider || !composeHash || !osImageHash || !instanceId) {
//           throw new Error(
//             "Missing one of app-id, key-provider, or compose-hash, or os-image-hash, or instance-id in event_log"
//           );
//         }

//         const attestationResult: AttestationResult = {
//           appId,
//           mrSystem: "0".repeat(64),
//           osImageHash,
//           composeHash,
//           deviceId,
//           instanceId,
//           mrAggregated: "0".repeat(64),
//           tcbStatus: "0".repeat(64),
//           advisoryIds: [],
//         };
//         return attestationResult;
//       }

//       async function verifyLocalCert(
//         attestationResponse: AttestationResponse
//       ): Promise<AttestationResult> {
//         const jwksResponse = await fetch("/trust-authority-certs.txt");
//         const rawJwks = await jwksResponse.text();
//         const jwks = JSON.parse(rawJwks) as Jwks;
//         const lastKey = jwks.keys[jwks.keys.length - 1];

//         const publicKey = await importJWK(lastKey, "RS256");

//         const { payload: verifiedPayload } = await jwtVerify(
//           attestationResponse.token,
//           publicKey,
//           { algorithms: ["RS256"], clockTolerance: "1 year" }
//         );
//         const jwtPayload = verifiedPayload as JWTPayload & TdxPayload;

//         const computedQuoteHash = await attestationUtils.sha256Hex(
//           attestationResponse.quote
//         );
//         const expectedQuoteHash = `0x${jwtPayload.tdx.tdx_collateral.quotehash}`;
//         if (computedQuoteHash !== expectedQuoteHash) {
//           throw new Error(
//             `quotehash mismatch:\n  expected ${expectedQuoteHash}\n  got      ${computedQuoteHash}`
//           );
//         }

//         const deviceId = await attestationUtils.deviceIdFromQuote(
//           attestationResponse.quote
//         );

//         const eventLog: EventLogEntry[] = JSON.parse(
//           attestationResponse.event_log
//         );

//         const rtmr: string[] = await attestationUtils.replayRtmr(eventLog);
//         for (let i = 0; i < 4; i++) {
//           const claimName = `tdx_rtmr${i}` as keyof TdxPayload["tdx"];
//           const expected = `0x${jwtPayload.tdx[claimName]}`;
//           if (rtmr[i] !== expected) {
//             throw new Error(
//               `RTMR${i} mismatch:\n  expected ${expected}\n  got      ${rtmr[i]}`
//             );
//           }
//         }

//         // 10) Parse event_log again to pick out app_id, key_provider, compose_hash
//         const bootInfo = attestationUtils.extractBootInfo(eventLog);
//         const { appId, keyProvider, composeHash, instanceId, osImageHash } =
//           bootInfo;

//         if (!appId || !keyProvider || !composeHash || !osImageHash) {
//           throw new Error(
//             "Missing one of app-id, key-provider, or compose-hash, or os-image-hash in event_log"
//           );
//         }

//         const { mrAggregated, mrSystem } = await attestationUtils.buildMrHashes(
//           jwtPayload.tdx,
//           keyProvider
//         );

//         const attestationResult: AttestationResult = {
//           appId,
//           mrSystem,
//           osImageHash,
//           composeHash,
//           deviceId,
//           instanceId,
//           mrAggregated,
//           tcbStatus: "",
//           advisoryIds: [],
//         };
//         return attestationResult;
//       }

//       const attestationResponse =
//         await apiClient.app.getAttestation(publicKeyHex);

//       let attestationResult: AttestationResult;
//       if (attestationResponse.version === "v1") {
//         console.log("verifying onchain attestation");
//         attestationResult = await verifyOnchain(attestationResponse);
//       } else {
//         console.log("verifying local cert attestation");
//         attestationResult = await verifyLocalCert(attestationResponse);
//       }

//       setAttestationResult(publicKeyHex, attestationResult);

//       setVerificationResult(attestationResult.appId, {
//         status: VerificationStatus.AttestationVerified,
//         attestationResult,
//         publicKey: publicKeyHex,
//       });

//       verifyContract(publicKeyHex, attestationResult);

//       return attestationResult;
//     },
//     [
//       apiClient,
//       attestationResults,
//       verifyContract,
//       setAttestationResult,
//       setVerificationResult,
//     ]
//   );

//   return {
//     verifyAttestation,
//     verifyContract,
//     attestationResults,
//     verificationResults,
//   };
// }
