import { ApiService } from "./api";
import { optimism } from "viem/chains";
import { createPublicClient, http, Hex, PublicClient } from "viem";
import { ABI } from "@/services/kms-contract";
import {
  TdxPayload,
  Jwks,
  EventLogEntry,
  AttestationResult,
} from "@/types/attestation";
import { jwtVerify,  JWTPayload, importJWK, JWK } from "jose";
import { VerificationResult, VerificationStatus } from "@/hooks/use-attestation-manager";

export class AttestationManager {
  private api: ApiService;
  private client = createPublicClient({
    chain: optimism,
    transport: http('https://mainnet.optimism.io'),
  });

  private attestationResults: Record<string, AttestationResult> = {};
  private verificationResults: Record<string, VerificationResult> = {};

  constructor(api: ApiService) {
    this.api = api;
    console.log("AttestationManager initialized");
  }

  public async verifyContract(
    publicKeyHex: string,
    attestationResult: AttestationResult
  ): Promise<VerificationResult> {
    if (this.verificationResults.hasOwnProperty(attestationResult.appId)) {
      if (
        this.verificationResults[attestationResult.appId].status ===
        VerificationStatus.ContractVerified
      ) {
        console.log("Contract already verified, returning true");
        return this.verificationResults[attestationResult.appId];
      } else if (
        this.verificationResults[attestationResult.appId].status ===
        VerificationStatus.Pending
      ) {
        console.log("Contract already pending");
        return this.verificationResults[attestationResult.appId];
      }
    }

    this.verificationResults[attestationResult.appId] = {
      status: VerificationStatus.Pending,
      attestationResult,
      publicKey: publicKeyHex,
    };

    // if (!ready) {
    //   console.log("Privy not ready, cannot verify contract");
    // }
    // if (wallets.length === 0) {
    //   console.log("No wallets found, cannot verify contract");
    //   const verificationResult: VerificationResult = {
    //     status: VerificationStatus.Failed,
    //     attestationResult,
    //     publicKey: publicKeyHex,
    //   };
    //   setVerificationResult(attestationResult.appId, verificationResult);
    //   return verificationResult;
    // }

    // const wallet = wallets[0];
    // if (process.env.NEXT_PUBLIC_KMS_CONTRACT_NETWORK === "optimism") {
    //   await wallet.switchChain(optimism.id);
    // } else if (process.env.NEXT_PUBLIC_KMS_CONTRACT_NETWORK === "sepolia") {
    //   await wallet.switchChain(sepolia.id);
    // }

    // const provider = await wallet.getEthereumProvider();
    // const client = createPublicClient({
    //   chain: process.env.NEXT_PUBLIC_KMS_CONTRACT_NETWORK === "optimism" ? optimism : sepolia,
    //   transport: custom(provider),
    // });

    // console.log(`Reading contract isAppAllowed with wallet address: ${wallet.address} and contract address: ${ADDRESS}`);

    const toHex = (value: string) =>
      (value.startsWith("0x") ? value : `0x${value}`) as Hex;

    const [isAllowed, reason] = (await this.client.readContract({
      // account: wallet.address as Hex,
      address:
        (process.env.NEXT_PUBLIC_KMS_CONTRACT_ADDRESS as `0x${string}`) ||
        "0x3366E906D7C2362cE4C336f43933Cccf76509B23",
      abi: ABI,
      functionName: "isAppAllowed",
      args: [
        {
          appId: toHex(attestationResult.appId),
          composeHash: toHex(attestationResult.composeHash),
          instanceId: toHex(attestationResult.instanceId),
          deviceId: toHex(attestationResult.deviceId),
          mrAggregated: toHex(attestationResult.mrAggregated),
          mrSystem: toHex(attestationResult.mrSystem),
          osImageHash: toHex(attestationResult.osImageHash),
          tcbStatus: attestationResult.tcbStatus,
          advisoryIds: attestationResult.advisoryIds,
        },
      ],
    })) as [boolean, string];

    const verificationResult = {
      status: isAllowed
        ? VerificationStatus.ContractVerified
        : VerificationStatus.Failed,
      attestationResult,
      publicKey: publicKeyHex,
    };
    this.verificationResults[attestationResult.appId] = verificationResult;
    console.log("isAllowed:", isAllowed, "reason:", reason);
    return verificationResult;
  }

  public async verifyAttestation(
    publicKeyHex: string
  ): Promise<AttestationResult> {
    console.log("verifying attestation for publicKeyHex:", publicKeyHex);
    if (this.attestationResults[publicKeyHex]) {
      console.log("attestation already verified, returning true");
      this.verifyContract(publicKeyHex, this.attestationResults[publicKeyHex]);
      return this.attestationResults[publicKeyHex];
    }

    const attestationResponse =
      await this.api.app.getAttestation(publicKeyHex);

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

    console.log("attestationResponse:", attestationResponse);

    // 8) Replay event_log to recompute RTMR[] values
    const eventLog: EventLogEntry[] = JSON.parse(attestationResponse.event_log);
    const rtmr: string[] = Array(4).fill("0".repeat(96));

    for (const event of eventLog) {
      // previous value (hex) + event.digest (hex) → Buffer, then SHA-384
      const prevHex = rtmr[event.imr];
      const concatenated = Buffer.from(prevHex + event.digest, "hex");
      const newRtmrBuffer = await crypto.subtle.digest("SHA-384", concatenated);
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
    let osImageHash = "";
    for (const event of eventLog) {
      if (event.event === "app-id") {
        appId = event.event_payload;
      } else if (event.event === "key-provider") {
        keyProvider = event.event_payload;
      } else if (event.event === "compose-hash") {
        composeHash = event.event_payload;
      } else if (event.event === "instance-id") {
        instanceId = event.event_payload;
      } else if (event.event === "os-image-hash") {
        osImageHash = event.event_payload;
      }
    }
    if (!appId || !keyProvider || !composeHash || !osImageHash) {
      throw new Error(
        "Missing one of app-id, key-provider, or compose-hash, or os-image-hash in event_log"
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
    // const osImageHashConcat =
    //   jwtPayload.tdx.tdx_mrtd +
    //   jwtPayload.tdx.tdx_rtmr1 +
    //   jwtPayload.tdx.tdx_rtmr2;
    // const osImageHashBuffer = await crypto.subtle.digest(
    //   "SHA-256",
    //   Buffer.from(osImageHashConcat, "hex")
    // );
    // const osImageHash = bufferToHex(osImageHashBuffer);

    // 13) (Optional) Verify a hardcoded expected mr_image:
    const expectedosImageHash = process.env.NEXT_PUBLIC_OS_IMAGE_HASH;
    if (osImageHash !== expectedosImageHash) {
      throw new Error(
        `mr_image mismatch: expected ${expectedosImageHash}, got ${osImageHash}`
      );
    }

    // 14) Log or return the fields needed for KmsAuth.isAppAllowed():
    console.log("appId:", appId);
    console.log("composeHash:", composeHash);
    console.log("instanceId:", instanceId);
    console.log("deviceId:", deviceId);
    console.log("mrAggregated:", mrAggregated);
    console.log("mrSystem:", mrSystem);
    console.log("osImageHash:", osImageHash);

    // If you need to return them for further processing, you could:
    const attestationResult: AttestationResult = {
      appId,
      mrSystem,
      osImageHash,
      composeHash,
      deviceId,
      instanceId,
      mrAggregated,
      tcbStatus: "",
      advisoryIds: [],
    };

    this.attestationResults[publicKeyHex] = attestationResult;

    this.verificationResults[appId] = {
      status: VerificationStatus.AttestationVerified,
      attestationResult,
      publicKey: publicKeyHex,
    };

    this.verifyContract(publicKeyHex, attestationResult);

    return attestationResult;
  }
}
