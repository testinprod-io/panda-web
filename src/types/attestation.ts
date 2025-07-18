import { JWK } from "jose";

export interface Jwks {
  keys: JWK[];
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

export interface EventLogEntry {
  imr: number;
  digest: string; // hex string
  event: string;
  event_payload: string; // hex string or ascii content, depending on event type
}

export interface AttestationResult {
  appId: string;
  composeHash: string;
  instanceId: string;
  deviceId: string;
  mrAggregated: string;
  mrSystem: string;
  osImageHash: string;
  tcbStatus: string;
  advisoryIds: string[];
}

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
