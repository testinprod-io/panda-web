import { useChatStore } from "@/store/chat";
import { useAppConfig } from "@/store/config";
import { useAttestationStore } from "@/store/attestation";
import { useEncryption } from "@/providers/encryption-provider";
const clearAllStores = () => {
  console.log("[AuthService] Clearing all stores...");
  useChatStore.getState().clearCurrentStateToDefault();
  useAppConfig.getState().reset();
  // Reset attestation store
  useAttestationStore.setState({
    attestationResults: {},
    verificationResults: {},
  });
  console.log("[AuthService] All stores cleared.");
};

const handleLogout = async (privyLogout: () => Promise<void>) => {
  console.log("[AuthService] Logging out...");
  try {
    await privyLogout();
    useEncryption().lockApp();
    clearAllStores();
    // The listener will handle the clearing now
  } catch (error) {
    console.error("[AuthService] Error during logout:", error);
  }
};

export const AuthService = {
  clearAllStores,
  handleLogout,
}; 