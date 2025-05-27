import { useApiClient } from "./api-client-provider";

import { useEffect } from "react";

import { usePrivy } from "@privy-io/react-auth";
import { useChatStore } from "@/store/chat";
import { useChatActions } from "@/hooks/use-chat-actions";
import { useState } from "react";

// Uses the action hook to trigger data loading/clearing based on auth state.
export function AuthChatListener() {
    const { ready, authenticated } = usePrivy();
    const apiClient = useApiClient();
  
    // Direct store access for synchronous state clearing on logout
    const clearState = useChatStore((state) => state.clearCurrentStateToDefault);
  
    // Get actions from the hook
    const actions = useChatActions();
  
    const [prevAuthState, setPrevAuthState] = useState<boolean | null>(null);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
  
    useEffect(() => {
      // Wait for Privy readiness and API client availability
      if (!ready || !apiClient) {
          return;
      }
  
      const isInitialCheck = prevAuthState === null;
      const authChanged = !isInitialCheck && authenticated !== prevAuthState;
  
      if (isInitialCheck) {
          setPrevAuthState(authenticated);
      }
  
      // Load data on initial authentication or if auth changes to authenticated
      if (authenticated && (!initialLoadDone || authChanged)) {
          console.log("[AuthChatListener] User authenticated. Triggering load/sync...");
          actions.loadSessionsFromServer();
          setInitialLoadDone(true); // Mark initial load attempt as done
      } else if (authChanged && !authenticated) {
          // User logged out
          console.log(`[AuthChatListener] Auth state changed: ${prevAuthState} -> ${authenticated}. Clearing local state.`);
          clearState();
          setInitialLoadDone(false); // Reset initial load flag
      } else if (!authenticated && !isInitialCheck && initialLoadDone) {
           // Edge case: Logged out state detected after initial load was marked done
           console.log("[AuthChatListener] State inconsistency detected (logged out but initialLoadDone=true). Clearing data.");
           clearState();
           setInitialLoadDone(false); // Reset flag
      }
  
      // Update prevAuthState if auth state changed
      if (authChanged) {
          setPrevAuthState(authenticated);
      }
  
    }, [ready, authenticated, prevAuthState, initialLoadDone, apiClient, actions, clearState]);
  
    return null; // Component doesn't render anything
  }
  