import { useApiClient } from "./api-client-provider";

import { useEffect } from "react";

import { usePrivy } from "@privy-io/react-auth";
import { useChatStore } from "@/store/chat";
import { useChatActions } from "@/hooks/use-chat-actions";
import { useState } from "react";
import { jwtVerify, importSPKI, JWTPayload, importJWK, JWK } from "jose";

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
      console.log(
        "[AuthChatListener] User authenticated. Triggering load/sync...",
      );
      actions.loadSessionsFromServer();
      setInitialLoadDone(true); // Mark initial load attempt as done
      try {
      // handleAttestation3("04b4e21611be6ea53d5ea647922eca60c869906ae3be4c12a5928ea50097d48cbb6d72c18213572b1c8f9ffa56aaab6a519e918e05157fec328241ca19f1cdea62");
      } catch (error) {
        console.error(error);
      }
    } else if (authChanged && !authenticated) {
      // User logged out
      console.log(
        `[AuthChatListener] Auth state changed: ${prevAuthState} -> ${authenticated}. Clearing local state.`,
      );
      clearState();
      setInitialLoadDone(false); // Reset initial load flag
    } else if (!authenticated && !isInitialCheck && initialLoadDone) {
      // Edge case: Logged out state detected after initial load was marked done
      console.log(
        "[AuthChatListener] State inconsistency detected (logged out but initialLoadDone=true). Clearing data.",
      );
      clearState();
      setInitialLoadDone(false); // Reset flag
    }

    // Update prevAuthState if auth state changed
    if (authChanged) {
      setPrevAuthState(authenticated);
    }
  }, [
    ready,
    authenticated,
    prevAuthState,
    initialLoadDone,
    apiClient,
    actions,
    clearState,
  ]);

  const handleAttestation = async (publicKey: string) => {
    const attestationToken = await apiClient.app.getAttestation(publicKey);
    const keyForVerification = await importSPKI(publicKey, "RS256");
    const { payload } = await jwtVerify(attestationToken.token, keyForVerification, {
      algorithms: ["RS256"],
    });
    return attestationToken;
  };
  
  // const handleAttestation2 = async (publicKey: string) => {
  //   const attestationResponse = await apiClient.app.getAttestation(publicKey);

  //     // 1) Load the sample response JSON
  // // const respPath = path.resolve(__dirname, 'get_attestation_token_response_sample.json');
  // // const rawResp = fs.readFileSync(respPath, 'utf-8');
  // // const response = JSON.parse(rawResp) as AttestationTokenResponse;

  // // 2) Load the Trust Authority JWKs
  // const jwksResponse = await fetch("/trust-authority-certs.txt");
  // const rawJwks = await jwksResponse.text();
  // const jwks = JSON.parse(rawJwks) as Jwks;
  // const lastKey = jwks.keys[jwks.keys.length - 1];

  // // 3) Import the last JWK as a public key
  // // const publicKey = await importJWK(lastKey, 'RS256');

  // // 4) Verify the JWT (ignoring expiration)
  // //    In jose, pass { ignoreExp: true } in jwtVerify options
  // const { payload: verifiedPayload } = await jwtVerify(
  //   attestationResponse.token,
  //   lastKey,
  //   { algorithms: ['RS256'], clockTolerance: "1 year" }
  // );
  // const jwtPayload = verifiedPayload as JWTPayload & TdxPayload;
  // console.log(jwtPayload);

  // const bufferToHex = (buffer: ArrayBuffer) => {
  //   return [...new Uint8Array(buffer)]
  //     .map((b) => b.toString(16).padStart(2, "0"))
  //     .join("");
  // };

  // // 5) Compare "quotehash"
  // //    Compute SHA-256 over the raw quote bytes (hex → Buffer)
  // const quoteBytes = Buffer.from(attestationResponse.quote, 'hex');
  // const computedQuoteHashBuffer = await crypto.subtle.digest("SHA-256", quoteBytes);
  // const computedQuoteHash = bufferToHex(computedQuoteHashBuffer);

  // if (computedQuoteHash !== jwtPayload.tdx.tdx_collateral.quotehash) {
  //   throw new Error(
  //     `quotehash mismatch:\n  expected ${jwtPayload.tdx.tdx_collateral.quotehash}\n  got      ${computedQuoteHash}`
  //   );
  // }

  // // 6) Extract `user_data` from the quote:
  // //    quote is a hex string; header.user_data starts at byte offset 28, length 20 bytes
  // //    which corresponds to hex indices [28*2 .. 48*2).
  // const userDataHex = attestationResponse.quote.slice(28 * 2, 48 * 2);
  // // 7) Compute device_id = SHA-256(user_data)
  // const deviceIdBuffer = await crypto.subtle.digest(
  //   "SHA-256",
  //   Buffer.from(userDataHex, "hex"),
  // );
  // const deviceId = bufferToHex(deviceIdBuffer);
  // console.log(attestationResponse);

  // // 8) Replay event_log to recompute RTMR[] values
  // const eventLog: EventLogEntry[] = JSON.parse(attestationResponse.event_log);
  // const rtmr: string[] = Array(4).fill('0'.repeat(96));

  // for (const event of eventLog) {
  //   // previous value (hex) + event.digest (hex) → Buffer, then SHA-384
  //   const prevHex = rtmr[event.imr];
  //   const concatenated = Buffer.from(prevHex + event.digest, 'hex');
  //   const newRtmrBuffer = await crypto.subtle.digest("SHA-384", concatenated);
  //   const newRtmr = bufferToHex(newRtmrBuffer);
  //   rtmr[event.imr] = newRtmr;
  // }

  // // 9) Compare each rtmr[i] against jwtPayload.tdx[`tdx_rtmr${i}`]
  // for (let i = 0; i < 4; i++) {
  //   const claimName = `tdx_rtmr${i}` as keyof TdxPayload['tdx'];
  //   const expected = jwtPayload.tdx[claimName];
  //   if (rtmr[i] !== expected) {
  //     throw new Error(
  //       `RTMR${i} mismatch:\n  expected ${expected}\n  got      ${rtmr[i]}`
  //     );
  //   }
  // }

  // // 10) Parse event_log again to pick out app_id, key_provider, compose_hash
  // let appId = '';
  // let keyProvider = '';
  // let composeHash = '';
  // for (const event of eventLog) {
  //   if (event.event === 'app-id') {
  //     appId = event.event_payload;
  //   } else if (event.event === 'key-provider') {
  //     keyProvider = event.event_payload;
  //   } else if (event.event === 'compose-hash') {
  //     composeHash = event.event_payload;
  //   }
  // }
  // if (!appId || !keyProvider || !composeHash) {
  //   throw new Error('Missing one of app-id, key-provider, or compose-hash in event_log');
  // }

  // // 11) Compute mr_system:
  // //     mr_system = SHA-256(
  // //        tdx_mrtd
  // //      + tdx_rtmr0
  // //      + tdx_rtmr1
  // //      + tdx_rtmr2
  // //      + SHA-256(key_provider)
  // //     )
  // const sha256OfKeyProviderBuffer = await crypto.subtle.digest(
  //   "SHA-256",
  //   Buffer.from(keyProvider, "hex"),
  // );
  // const sha256OfKeyProvider = bufferToHex(sha256OfKeyProviderBuffer);

  // const mrSystemConcat =
  //   jwtPayload.tdx.tdx_mrtd +
  //   jwtPayload.tdx.tdx_rtmr0 +
  //   jwtPayload.tdx.tdx_rtmr1 +
  //   jwtPayload.tdx.tdx_rtmr2 +
  //   sha256OfKeyProvider;
  
  // const mrSystemBuffer = await crypto.subtle.digest(
  //   "SHA-256",
  //   Buffer.from(mrSystemConcat, "hex"),
  // );
  // const mrSystem = bufferToHex(mrSystemBuffer);

  // // 12) Compute mr_image:
  // //     mr_image = SHA-256(
  // //        tdx_mrtd
  // //      + tdx_rtmr1
  // //      + tdx_rtmr2
  // //     )
  // const mrImageConcat =
  //   jwtPayload.tdx.tdx_mrtd +
  //   jwtPayload.tdx.tdx_rtmr1 +
  //   jwtPayload.tdx.tdx_rtmr2;
  // const mrImageBuffer = await crypto.subtle.digest(
  //   "SHA-256",
  //   Buffer.from(mrImageConcat, "hex"),
  // );
  // const mrImage = bufferToHex(mrImageBuffer);

  // // 13) (Optional) Verify a hardcoded expected mr_image:
  // const expectedMrImage = '36ac6151fcd827d0d78822c57db7c98ff0da2218c12e11f76ac15399b1c193ee';
  // if (mrImage !== expectedMrImage) {
  //   throw new Error(
  //     `mr_image mismatch:\n  expected ${expectedMrImage}\n  got      ${mrImage}`
  //   );
  // }

  // // 14) Log or return the fields needed for KmsAuth.isAppAllowed():
  // //     { appId, mrSystem, mrImage, composeHash, deviceId }
  // console.log('appId:', appId);
  // console.log('composeHash:', composeHash);

  // console.log('mrSystem:', mrSystem);
  // console.log('mrImage:', mrImage);
  // console.log('key-provider:', keyProvider);
  // console.log('deviceId:', deviceId);

  // // If you need to return them for further processing, you could:
  // return {
  //   appId,
  //   mrSystem,
  //   mrImage,
  //   composeHash,
  //   deviceId,
  // };


  //   // const { payload } = await jwtVerify(attestationToken.token, keyForVerification, {
  //   //   algorithms: ["RS256"],
  //   // });
  //   // return attestationToken;
  // };



  return null; // Component doesn't render anything
}
