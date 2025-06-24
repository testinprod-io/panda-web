import { importJWK, jwtVerify, JWTPayload } from "jose";

/* ---------- types ------------------------------------------------------- */

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
