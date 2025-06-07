import { create } from "zustand";
import { AttestationResult } from "@/types/attestation";
import { VerificationResult, VerificationStatus } from "@/hooks/use-attestation-manager";

interface AttestationState {
  attestationResults: Record<string, AttestationResult>;
//   verificationStatuses: Record<strin    g, VerificationStatus>;
  verificationResults: Record<string, VerificationResult>;
  setAttestationResult: (publicKeyHex: string, result: AttestationResult) => void;
//   setVerificationStatus: (appId: string, status: VerificationStatus) => void;
  setVerificationResult: (appId: string, result: VerificationResult) => void;
}

export const useAttestationStore = create<AttestationState>((set) => ({
  attestationResults: {},
  verificationResults: {},
  setAttestationResult: (publicKeyHex, result) =>
    set((state) => ({
      attestationResults: {
        ...state.attestationResults,
        [publicKeyHex]: result,
      },
    })),
  setVerificationResult: (appId, result) =>
    set((state) => {
      const existingResult = state.verificationResults[appId];
      const newResult = existingResult ? { ...existingResult, ...result } : result;

      return {
        verificationResults: {
          ...state.verificationResults,
          [appId]: newResult,
        },
      };
    }),
})); 