import { useApiClient } from "@/providers/api-client-provider";
import {
  TdxPayload,
  Jwks,
  EventLogEntry,
  AttestationResult,
} from "@/types/attestation";
import { useCallback, useEffect } from "react";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useChatStore } from "@/store/chat";
import { useChatActions } from "@/hooks/use-chat-actions";
import { useState } from "react";
import { jwtVerify, importSPKI, JWTPayload, importJWK, JWK } from "jose";
import { ADDRESS, ABI } from "@/services/kms-contract";
import { sepolia } from "viem/chains";
import { createPublicClient, Hex, custom } from "viem";
import { useAttestationStore } from "@/store/attestation";

export enum VerificationStatus {
    Failed = "Failed",
    Pending = "Pending",
    ContractVerified = "ContractVerified",
    AttestationVerified = "AttestationVerified",
}

export function useAttestationManager() {
  const apiClient = useApiClient();
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const {
    attestationResults,
    verificationStatuses,
    setAttestationResult,
    setVerificationStatus,
  } = useAttestationStore();

  // Cert PublicKey -> AttestationResult
  // const [attestationResults, setAttestationResults] = useState<
  //   Record<string, AttestationResult>
  // >({});

  // AppId -> VerificationStatus
  // const [verificationStatuses, setVerificationStatuses] = useState<
  //   Record<string, VerificationStatus>
  // >({});
//   const [contractResults, setContractResults] = useState<
//     Record<string, boolean>
//   >({});

  // const [attestationStatus, setAttestationStatus] = useState<AttestationStatus>('pending');
  // const [attestationError, setAttestationError] = useState<Error | null>(null);

  // return {
  //     attestationStatus,
  //     attestationError,
  // };

  const isAppAllowed = useCallback(
    async (attestationResult: AttestationResult): Promise<boolean> => {

      if (verificationStatuses.hasOwnProperty(attestationResult.appId) && verificationStatuses[attestationResult.appId] == VerificationStatus.ContractVerified) {
        console.log("Contract already verified");
        return verificationStatuses[attestationResult.appId] === VerificationStatus.ContractVerified;
      }
      if (wallets.length === 0) {
        console.log("No wallets found");
        return false;
      }

      const wallet = wallets[0];
      await wallet.switchChain(sepolia.id);

      const provider = await wallet.getEthereumProvider();
      const client = createPublicClient({
        chain: sepolia,
        transport: custom(provider),
      });

      console.log(`Reading contract isAppAllowed with wallet address: ${wallet.address} and contract address: ${ADDRESS}`);
      
      const toHex = (value: string) => (value.startsWith("0x") ? value : `0x${value}`) as Hex;

      const [isAllowed, reason] = (await client.readContract({
        account: wallet.address as Hex,
        address: ADDRESS,
        abi: ABI,
        functionName: "isAppAllowed",
        args: [{
          appId: toHex(attestationResult.appId),
          composeHash: toHex(attestationResult.composeHash),
          instanceId: toHex(attestationResult.instanceId),
          deviceId: toHex(attestationResult.deviceId),
          mrAggregated: toHex(attestationResult.mrAggregated),
          mrSystem: toHex(attestationResult.mrSystem),
          mrImage: toHex(attestationResult.mrImage),
          tcbStatus: attestationResult.tcbStatus,
          advisoryIds: attestationResult.advisoryIds
        }],
      })) as [boolean, string];
      setVerificationStatus(
        attestationResult.appId,
        isAllowed ? VerificationStatus.ContractVerified : VerificationStatus.Failed,
      );
    console.log("isAllowed:", isAllowed, "reason:", reason);
      return isAllowed as boolean;
    },
    [wallets, verificationStatuses, setVerificationStatus]
  );

  const verifyAttestation = useCallback(
    async (publicKeyHex: string): Promise<AttestationResult> => {
      if (attestationResults[publicKeyHex]) {
        isAppAllowed(attestationResults[publicKeyHex]);
        return attestationResults[publicKeyHex];
      }

      const attestationResponse =
        await apiClient.app.getAttestation(publicKeyHex);

      // Load the Trust Authority JWKs
      const jwksResponse = await fetch("/trust-authority-certs.txt");
      const rawJwks = await jwksResponse.text();
      const jwks = JSON.parse(rawJwks) as Jwks;
      const lastKey = jwks.keys[jwks.keys.length - 1];

      // 3) Import the last JWK as a public key
      const publicKey = await importJWK(lastKey, "RS256");

      // 4) Verify the JWT (ignoring expiration)
      const { payload: verifiedPayload } = await jwtVerify(
        attestationResponse.token,
        publicKey,
        { algorithms: ["RS256"], clockTolerance: "1 year" }
      );
      const jwtPayload = verifiedPayload as JWTPayload & TdxPayload;

      const bufferToHex = (buffer: ArrayBuffer) => {
        return [...new Uint8Array(buffer)]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      };

      // 5) Compare "quotehash"
      //    Compute SHA-256 over the raw quote bytes (hex → Buffer)
      const quoteBytes = Buffer.from(attestationResponse.quote, "hex");
      const computedQuoteHashBuffer = await crypto.subtle.digest(
        "SHA-256",
        quoteBytes
      );
      const computedQuoteHash = bufferToHex(computedQuoteHashBuffer);

      if (computedQuoteHash !== jwtPayload.tdx.tdx_collateral.quotehash) {
        throw new Error(
          `quotehash mismatch:\n  expected ${jwtPayload.tdx.tdx_collateral.quotehash}\n  got      ${computedQuoteHash}`
        );
      }

      // 6) Extract `user_data` from the quote:
      //    quote is a hex string; header.user_data starts at byte offset 28, length 20 bytes
      //    which corresponds to hex indices [28*2 .. 48*2).
      const userDataHex = attestationResponse.quote.slice(28 * 2, 48 * 2);

      // 7) Compute device_id = SHA-256(user_data)
      const deviceIdBuffer = await crypto.subtle.digest(
        "SHA-256",
        Buffer.from(userDataHex, "hex")
      );
      const deviceId = bufferToHex(deviceIdBuffer);

      console.log(attestationResponse);

      // 8) Replay event_log to recompute RTMR[] values
      const eventLog: EventLogEntry[] = JSON.parse(
        attestationResponse.event_log
      );
      const rtmr: string[] = Array(4).fill("0".repeat(96));

      for (const event of eventLog) {
        // previous value (hex) + event.digest (hex) → Buffer, then SHA-384
        const prevHex = rtmr[event.imr];
        const concatenated = Buffer.from(prevHex + event.digest, "hex");
        const newRtmrBuffer = await crypto.subtle.digest(
          "SHA-384",
          concatenated
        );
        const newRtmr = bufferToHex(newRtmrBuffer);
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
      let instanceId = "0x0000000000000000000000000000000000000000";
      for (const event of eventLog) {
        if (event.event === "app-id") {
          appId = event.event_payload;
        } else if (event.event === "key-provider") {
          keyProvider = event.event_payload;
        } else if (event.event === "compose-hash") {
          composeHash = event.event_payload;
        } else if (event.event === "instance-id") {
          instanceId = event.event_payload;
        }
      }
      if (!appId || !keyProvider || !composeHash) {
        throw new Error(
          "Missing one of app-id, key-provider, or compose-hash in event_log"
        );
      }

      // 10.5) Compute mr_aggregated:
      let mrAggregatedConcat =
        jwtPayload.tdx.tdx_mrtd +
        jwtPayload.tdx.tdx_rtmr0 +
        jwtPayload.tdx.tdx_rtmr1 +
        jwtPayload.tdx.tdx_rtmr2 +
        jwtPayload.tdx.tdx_rtmr3;

      const zero48bytes = "0".repeat(96);
      if (
        jwtPayload.tdx.tdx_mrconfigid !== zero48bytes ||
        jwtPayload.tdx.tdx_mrowner !== zero48bytes ||
        jwtPayload.tdx.tdx_mrownerconfig !== zero48bytes
      ) {
        mrAggregatedConcat +=
          jwtPayload.tdx.tdx_mrconfigid +
          jwtPayload.tdx.tdx_mrowner +
          jwtPayload.tdx.tdx_mrownerconfig;
      }

      const mrAggregatedBuffer = await crypto.subtle.digest(
        "SHA-256",
        Buffer.from(mrAggregatedConcat, "hex")
      );
      const mrAggregated = bufferToHex(mrAggregatedBuffer);

      // 11) Compute mr_system:
      //     mr_system = SHA-256(
      //        tdx_mrtd
      //      + tdx_rtmr0
      //      + tdx_rtmr1
      //      + tdx_rtmr2
      //      + SHA-256(key_provider)
      //     )
      const sha256OfKeyProviderBuffer = await crypto.subtle.digest(
        "SHA-256",
        Buffer.from(keyProvider, "hex")
      );
      const sha256OfKeyProvider = bufferToHex(sha256OfKeyProviderBuffer);

      const mrSystemConcat =
        jwtPayload.tdx.tdx_mrtd +
        jwtPayload.tdx.tdx_rtmr0 +
        jwtPayload.tdx.tdx_rtmr1 +
        jwtPayload.tdx.tdx_rtmr2 +
        sha256OfKeyProvider;

      const mrSystemBuffer = await crypto.subtle.digest(
        "SHA-256",
        Buffer.from(mrSystemConcat, "hex")
      );
      const mrSystem = bufferToHex(mrSystemBuffer);

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
      const mrImageBuffer = await crypto.subtle.digest(
        "SHA-256",
        Buffer.from(mrImageConcat, "hex")
      );
      const mrImage = bufferToHex(mrImageBuffer);

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
      console.log("composeHash:", composeHash);
      console.log("instanceId:", instanceId);
      console.log("deviceId:", deviceId);
      //mraggre
      console.log("mrAggregated:", mrAggregated);
      console.log("mrSystem:", mrSystem);
      console.log("mrImage:", mrImage);

      // If you need to return them for further processing, you could:
      const attestationResult: AttestationResult = {
        appId,
        mrSystem,
        mrImage,
        composeHash,
        deviceId,
        instanceId,
        mrAggregated,
        tcbStatus: "",
        advisoryIds: [],
      };

      setAttestationResult(publicKeyHex, attestationResult);

      setVerificationStatus(appId, VerificationStatus.AttestationVerified);

      isAppAllowed(attestationResult);
      
      return attestationResult;
      // const { payload } = await jwtVerify(attestationToken.token, keyForVerification, {
      //   algorithms: ["RS256"],
      // });
      // return attestationToken;
    },
    [apiClient, attestationResults, isAppAllowed, setAttestationResult, setVerificationStatus]
  );

  return {
    verifyAttestation,
    isAppAllowed,
    attestationResults,
    verificationStatuses,
  };
}
