import { ApiService } from "./api";
import { optimism } from "viem/chains";
import { createPublicClient, http, Hex } from "viem";
import { ABI } from "@/services/kms-contract";
import {
  Jwks,
  VerificationResult,
  VerificationStatus,
} from "@/types/attestation";
import { jwtVerify, JWTPayload, importJWK } from "jose";
import { EventBus, SDKEventMap } from "@/sdk/events";
import { AttestationResponse } from "@/sdk/client/types";

export class AttestationManager {
  private api: ApiService;
  private bus: EventBus;
  private client = createPublicClient({
    chain: optimism,
    transport: http("https://mainnet.optimism.io"),
  });

  private attestationResults: Record<string, AttestationResult> = {};
  private verificationResults: Record<string, VerificationResult> = {};
  
  private state: {
    attestationResults: Record<string, AttestationResult>;
    verificationResults: Record<string, VerificationResult>;
  };

  constructor(api: ApiService, bus: EventBus) {
    this.api = api;
    this.bus = bus;
    this.state = {
      attestationResults: this.attestationResults,
      verificationResults: this.verificationResults,
    };
    console.log("AttestationManager initialized");
  }

  private updateState(payload: SDKEventMap["attestation.status.updated"]) {
    this.state = {
      attestationResults: { ...this.attestationResults },
      verificationResults: { ...this.verificationResults },
    };
    this.bus.emit("attestation.status.updated", payload);
  }

  public getState() {
    return this.state;
  }

  private async verifyLocalCert(
    publicKeyHex: string,
    attestationResponse: AttestationResponse
  ): Promise<AttestationResult> {
    const jwksResponse = await fetch("/trust-authority-certs.txt");
    const rawJwks = await jwksResponse.text();
    const jwks = JSON.parse(rawJwks) as Jwks;
    const lastKey = jwks.keys[jwks.keys.length - 1];

    const publicKey = await importJWK(lastKey, "RS256");

    const { payload: verifiedPayload } = await jwtVerify(
      attestationResponse.token,
      publicKey,
      { algorithms: ["RS256"], clockTolerance: "1 year" }
    );
    const jwtPayload = verifiedPayload as JWTPayload & TdxPayload;

    const computedQuoteHash = await sha256Hex(attestationResponse.quote);
    const expectedQuoteHash = `0x${jwtPayload.tdx.tdx_collateral.quotehash}`;
    if (computedQuoteHash !== expectedQuoteHash) {
      throw new Error(
        `quotehash mismatch: expected ${expectedQuoteHash}, got ${computedQuoteHash}`
      );
    }

    const deviceId = await deviceIdFromQuote(attestationResponse.quote);

    const eventLog: EventLogEntry[] = JSON.parse(attestationResponse.event_log);

    const rtmr: string[] = await replayRtmr(eventLog);
    for (let i = 0; i < 4; i++) {
      const claimName = `tdx_rtmr${i}` as keyof TdxPayload["tdx"];
      const expected = `0x${jwtPayload.tdx[claimName]}`;
      if (rtmr[i] !== expected) {
        throw new Error(
          `RTMR${i} mismatch: expected ${expected}, got ${rtmr[i]}`
        );
      }
    }

    // 10) Parse event_log again to pick out app_id, key_provider, compose_hash
    const bootInfo = extractBootInfo(eventLog);
    const { appId, keyProvider, composeHash, instanceId, osImageHash } =
      bootInfo;

    if (!appId || !keyProvider || !composeHash || !osImageHash) {
      throw new Error(
        "Missing one of app-id, key-provider, or compose-hash, or os-image-hash in event_log"
      );
    }

    const { mrAggregated, mrSystem } = await buildMrHashes(
      jwtPayload.tdx,
      keyProvider
    );

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
    return attestationResult;
  }

  private async verifyOnchain(
    publicKeyHex: string,
    attestationResponse: AttestationResponse
  ) {
    if (!attestationResponse.tx_hash) {
      throw new Error("tx_hash is required for v1 attestation");
    }

    const txHash = `0x${attestationResponse.tx_hash}` as `0x${string}`;

    const [tx, receipt] = await Promise.all([
      this.client.getTransaction({ hash: txHash }),
      this.client.getTransactionReceipt({ hash: txHash }),
    ]);

    const calldataBytes = hexToBuf(tx.input as `0x${string}`);
    const quoteBytes = calldataBytes.slice(68, calldataBytes.length - 18);
    const quoteHex = bufToHex(quoteBytes);

    if (quoteHex !== `0x${attestationResponse.quote}`) {
      throw new Error("quote in tx input ≠ quote in REST payload");
    }

    const logData = hexToBuf(receipt.logs[0].data as `0x${string}`);
    const successWord = bufToHex(logData.slice(0, 32));
    if (successWord !== "0x" + "1".padStart(64, "0"))
      throw new Error("attestation contract emitted success = 0");

    const output = logData.slice(128); // skip 4 × 32-byte words
    const rawQuote = output.slice(13, 13 + 584); // SGX quote body

    const reportData = rawQuote.slice(-64, -32); // last 32 bytes of REPORTDATA
    const pubKeyHash = await sha256Hex(publicKeyHex); // util helper

    if (bufToHex(reportData) !== pubKeyHash)
      throw new Error("public-key hash mismatch");

    const deviceId = await deviceIdFromQuote(quoteHex);

    const eventLog: EventLogEntry[] = JSON.parse(attestationResponse.event_log);

    const replayedRtmr: string[] = await replayRtmr(eventLog);
    const rtmrOnChain = [...Array(4)].map((_, i) =>
      bufToHex(rawQuote.slice(328 + i * 48, 328 + (i + 1) * 48))
    );

    rtmrOnChain.forEach((rtmr, i) => {
      if (rtmr !== replayedRtmr[i])
        throw new Error(`RTMR${i} mismatch (on-chain vs replay)`);
    });

    const bootInfo = extractBootInfo(eventLog);
    const { appId, keyProvider, composeHash, instanceId, osImageHash } =
      bootInfo;

    if (!appId || !keyProvider || !composeHash || !osImageHash || !instanceId) {
      throw new Error(
        "Missing one of app-id, key-provider, or compose-hash, or os-image-hash, or instance-id in event_log"
      );
    }

    const attestationResult: AttestationResult = {
      appId,
      mrSystem: "0".repeat(64),
      osImageHash,
      composeHash,
      deviceId,
      instanceId,
      mrAggregated: "0".repeat(64),
      tcbStatus: "0".repeat(64),
      advisoryIds: [],
    };
    return attestationResult;
  }

  public async verifyContract(
    publicKeyHex: string,
    attestationResult: AttestationResult
  ): Promise<VerificationResult> {
    try {
      if (this.verificationResults.hasOwnProperty(publicKeyHex)) {
        if (
          this.verificationResults[publicKeyHex].status ===
          VerificationStatus.ContractVerified
        ) {
          console.log("Contract already verified, returning true");
          return this.verificationResults[publicKeyHex];
        } else if (
          this.verificationResults[publicKeyHex].status ===
          VerificationStatus.Pending
        ) {
          console.log("Contract already pending");
          return this.verificationResults[publicKeyHex];
        }
      }

      this.verificationResults[publicKeyHex] = {
        status: VerificationStatus.Pending,
        attestationResult,
        publicKey: publicKeyHex,
      };
      this.updateState({
        status: VerificationStatus.Pending,
        attestationResult,
        publicKey: publicKeyHex,
      });

      const toHex = (value: string) =>
        (value.startsWith("0x") ? value : `0x${value}`) as Hex;

      const [isAllowed, reason] = (await this.client.readContract({
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
      this.verificationResults[publicKeyHex] = verificationResult;
      console.log("Successfully verified contract");
      this.updateState({
        status: verificationResult.status,
        attestationResult,
        publicKey: publicKeyHex,
      });
      return verificationResult;
    } catch (e) {
      this.verificationResults[publicKeyHex] = {
        status: VerificationStatus.Failed,
        attestationResult,
        publicKey: publicKeyHex,
      };
      this.updateState({
        status: VerificationStatus.Failed,
        attestationResult,
        publicKey: publicKeyHex,
      });
      console.error("Failed to verify contract", e);
      throw new Error("Failed to verify contract");
    }
  }

  public async verifyAttestation(
    publicKeyHex: string
  ): Promise<AttestationResult> {
    try {
      if (this.attestationResults[publicKeyHex]) {
        this.verifyContract(
          publicKeyHex,
          this.attestationResults[publicKeyHex]
        );
        return this.attestationResults[publicKeyHex];
      }

      const attestationResponse =
        await this.api.app.getAttestation(publicKeyHex);

      let attestationResult: AttestationResult;
      if (attestationResponse.version === "v1") {
        console.log("verifying onchain attestation");
        attestationResult = await this.verifyOnchain(
          publicKeyHex,
          attestationResponse
        );
      } else {
        console.log("verifying local cert attestation");
        attestationResult = await this.verifyLocalCert(
          publicKeyHex,
          attestationResponse
        );
      }

      this.attestationResults[publicKeyHex] = attestationResult;
      this.verificationResults[publicKeyHex] = {
        status: VerificationStatus.AttestationVerified,
        attestationResult,
        publicKey: publicKeyHex,
      };

      this.updateState({
        status: VerificationStatus.AttestationVerified,
        attestationResult,
        publicKey: publicKeyHex,
      });
      this.verifyContract(publicKeyHex, attestationResult);
      return attestationResult;
    } catch (e) {
      console.log("Failed to verify attestation", e);
      this.verificationResults[publicKeyHex] = {
        status: VerificationStatus.Failed,
        attestationResult: undefined,
        publicKey: publicKeyHex,
      };
      this.updateState({
        status: VerificationStatus.Failed,
        attestationResult: undefined,
        publicKey: publicKeyHex,
      });
      throw new Error("Failed to verify attestation");
    }
  }
}

export interface EventLogEntry {
  imr: number; //0 | 1 | 2 | 3;
  digest: string; // hex
  event: string; //"app-id" | "key-provider" | "compose-hash" | "instance-id" | "os-image-hash";
  event_payload: string; // hex
}

export interface TdxPayload {
  tdx: {
    tdx_collateral: {
      quotehash: string;
    };
    tdx_rtmr0: string;
    tdx_rtmr1: string;
    tdx_rtmr2: string;
    tdx_rtmr3: string;
    tdx_mrtd: string;

    tdx_mrowner: string;
    tdx_mrconfigid: string;
    tdx_mrownerconfig: string;
  };
}

export interface AttestationResult {
  appId: string;
  mrSystem: string;
  osImageHash: string;
  composeHash: string;
  deviceId: string;
  instanceId: string;
  mrAggregated: string;
  tcbStatus: string;
  advisoryIds: string[];
}

/* ---------- tiny helpers ------------------------------------------------ */

export const hexToBuf = (hex: string): Uint8Array => {
  const hexString = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Uint8Array.from(
    hexString.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
  );
};

export const bufToHex = (buf: ArrayBuffer | Uint8Array): string =>
  "0x" +
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export const sha256Hex = async (
  hexOrBuf: string | ArrayBuffer
): Promise<string> =>
  bufToHex(
    await crypto.subtle.digest(
      "SHA-256",
      typeof hexOrBuf === "string" ? hexToBuf(hexOrBuf) : hexOrBuf
    )
  );

export const sha384Hex = async (
  hexOrBuf: string | ArrayBuffer
): Promise<string> =>
  bufToHex(
    await crypto.subtle.digest(
      "SHA-384",
      typeof hexOrBuf === "string" ? hexToBuf(hexOrBuf) : hexOrBuf
    )
  );

/* ---------- reusable building blocks ----------------------------------- */

export const verifyJwtWithJwks = async <P extends JWTPayload>(
  token: string,
  jwksUrl: string
): Promise<P> => {
  const raw = await (await fetch(jwksUrl)).text();
  const { keys } = JSON.parse(raw);
  const publicKey = await importJWK(keys[keys.length - 1], "RS256");
  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ["RS256"],
    clockTolerance: "1 year",
  });
  return payload as P;
};

export const quoteHash = (quoteHex: string) => sha256Hex(quoteHex);

/** user_data = quote[28*2 .. 48*2) → device_id = SHA-256(user_data) */
export const deviceIdFromQuote = async (quoteHex: string): Promise<string> => {
  const rawHex = quoteHex.startsWith("0x") ? quoteHex.slice(2) : quoteHex;
  return sha256Hex(rawHex.slice(28 * 2, 48 * 2));
};

/** Replay the event log to regenerate the four RTMR registers */
export const replayRtmr = async (log: EventLogEntry[]): Promise<string[]> => {
  const rtmr = Array(4).fill("0".repeat(96));
  for (const ev of log) {
    rtmr[ev.imr] = await sha384Hex(rtmr[ev.imr] + ev.digest);
  }
  return rtmr;
};

export const extractBootInfo = (log: EventLogEntry[]) => {
  const out = {
    appId: "",
    keyProvider: "",
    composeHash: "",
    instanceId: "0x0000000000000000000000000000000000000000",
    osImageHash: "",
  };
  for (const ev of log) {
    // @ts-ignore – key is guaranteed present
    if (ev.event === "app-id") {
      out.appId = ev.event_payload;
    } else if (ev.event === "key-provider") {
      out.keyProvider = ev.event_payload;
    } else if (ev.event === "compose-hash") {
      out.composeHash = ev.event_payload;
    } else if (ev.event === "instance-id") {
      out.instanceId = ev.event_payload;
    } else if (ev.event === "os-image-hash") {
      out.osImageHash = ev.event_payload;
    }
  }
  return out;
};

/** Builds mrAggregated & mrSystem exactly once, reuse everywhere. */
export const buildMrHashes = async (
  tdx: TdxPayload["tdx"],
  keyProvider: string
): Promise<{ mrAggregated: string; mrSystem: string }> => {
  // mrAggregated ----------------------------------------------------------
  let concat =
    tdx.tdx_mrtd +
    tdx.tdx_rtmr0 +
    tdx.tdx_rtmr1 +
    tdx.tdx_rtmr2 +
    tdx.tdx_rtmr3;

  const zero48 = "0".repeat(96);
  if (
    tdx.tdx_mrconfigid !== zero48 ||
    tdx.tdx_mrowner !== zero48 ||
    tdx.tdx_mrownerconfig !== zero48
  ) {
    concat += tdx.tdx_mrconfigid + tdx.tdx_mrowner + tdx.tdx_mrownerconfig;
  }
  const mrAggregated = await sha256Hex(concat);

  // mrSystem --------------------------------------------------------------
  const kpHash = await sha256Hex(keyProvider);
  const mrSystem = await sha256Hex(
    tdx.tdx_mrtd + tdx.tdx_rtmr0 + tdx.tdx_rtmr1 + tdx.tdx_rtmr2 + kpHash
  );

  return { mrAggregated, mrSystem };
};
