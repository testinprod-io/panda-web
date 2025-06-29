// // import { useApiClient } from "./api-client-provider";

// import { useEffect } from "react";

// import { usePrivy } from "@privy-io/react-auth";
// import { useChatStore } from "@/store/chat";
// // import { useChatActions } from "@/hooks/use-chat-actions";
// import { useState } from "react";
// import { jwtVerify, importSPKI, JWTPayload, importJWK, JWK } from "jose";
// import { AuthService } from "@/services/auth-service";
// // import { usePandaSDK } from "@/providers/sdk-provider";
// // Uses the action hook to trigger data loading/clearing based on auth state.
// export function AuthChatListener() {
//   const { ready, authenticated } = usePrivy();
//   const apiClient = useApiClient();
//   // const { sdk } = usePandaSDK();
//   // Get actions from the hook
//   const actions = useChatActions();

//   const [prevAuthState, setPrevAuthState] = useState<boolean | null>(null);
//   const [initialLoadDone, setInitialLoadDone] = useState(false);

//   useEffect(() => {
//     // Wait for Privy readiness and API client availability
//     if (!ready || !apiClient) {
//       return;
//     }

//     const isInitialCheck = prevAuthState === null;
//     const authChanged = !isInitialCheck && authenticated !== prevAuthState;

//     if (isInitialCheck) {
//       setPrevAuthState(authenticated);
//     }

//     // Load data on initial authentication or if auth changes to authenticated
//     if (authenticated && (!initialLoadDone || authChanged)) {
//       console.log(
//         "[AuthChatListener] User authenticated. Triggering load/sync...",
//       );
//       // sdk.chat.loadChats();
//       setInitialLoadDone(true); // Mark initial load attempt as done
//       try {
//       // handleAttestation3("04b4e21611be6ea53d5ea647922eca60c869906ae3be4c12a5928ea50097d48cbb6d72c18213572b1c8f9ffa56aaab6a519e918e05157fec328241ca19f1cdea62");
//       } catch (error) {
//         console.error(error);
//       }
//     } else if (authChanged && !authenticated) {
//       // User logged out
//       console.log(
//         `[AuthChatListener] Auth state changed: ${prevAuthState} -> ${authenticated}. Clearing local state.`,
//       );
//       AuthService.clearAllStores();
//       setInitialLoadDone(false); // Reset initial load flag
//     } else if (!authenticated && !isInitialCheck && initialLoadDone) {
//       // Edge case: Logged out state detected after initial load was marked done
//       console.log(
//         "[AuthChatListener] State inconsistency detected (logged out but initialLoadDone=true). Clearing data.",
//       );
//       AuthService.clearAllStores();
//       setInitialLoadDone(false); // Reset flag
//     }

//     // Update prevAuthState if auth state changed
//     if (authChanged) {
//       setPrevAuthState(authenticated);
//     }
//   }, [
//     ready,
//     authenticated,
//     prevAuthState,
//     initialLoadDone,
//     apiClient,
//     actions,
//   ]);

//   const handleAttestation = async (publicKey: string) => {
//     const attestationToken = await apiClient.app.getAttestation(publicKey);
//     const keyForVerification = await importSPKI(publicKey, "RS256");
//     const { payload } = await jwtVerify(attestationToken.token, keyForVerification, {
//       algorithms: ["RS256"],
//     });
//     return attestationToken;
//   };

//   return null; // Component doesn't render anything
// }
