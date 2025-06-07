import { create } from "zustand";
import { AttestationResult } from "@/types/attestation";
import { VerificationStatus } from "@/hooks/use-attestation-manager";

interface AttestationState {
  attestationResults: Record<string, AttestationResult>;
  verificationStatuses: Record<string, VerificationStatus>;
  setAttestationResult: (publicKeyHex: string, result: AttestationResult) => void;
  setVerificationStatus: (appId: string, status: VerificationStatus) => void;
}

export const useAttestationStore = create<AttestationState>((set) => ({
  attestationResults: {},
  verificationStatuses: {},
  setAttestationResult: (publicKeyHex, result) =>
    set((state) => ({
      attestationResults: {
        ...state.attestationResults,
        [publicKeyHex]: result,
      },
    })),
  setVerificationStatus: (appId, status) =>
    set((state) => ({
      verificationStatuses: {
        ...state.verificationStatuses,
        [appId]: status,
      },
    })),
})); 