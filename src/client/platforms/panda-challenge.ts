/**
 * This middleware handles the Panda API's challenge-response verification.
 */
import { createVerify, randomBytes } from "crypto";
import { ec as EC } from "elliptic";

export interface ChallengeResponse { 
  publicKey: string;
  challenge: string;
  signature: string;
  timestamp: string;
  randomHex: string;
}

/**
 * Converts a P-256 public key from hex to PEM format.
 * @param hex The public key in hex format.
 * @returns The public key in PEM format.
 */
function publicKeyFromHex(hex: string): string {
  const curve = new EC("p256");
  const key = curve.keyFromPublic(hex, "hex");
  const uncompressed = key.getPublic(false, "hex");

  // This is the ASN.1 DER prefix for a P-256 public key (SubjectPublicKeyInfo).
  const p256DerPrefix = "3059301306072a8648ce3d020106082a8648ce3d030107034200";
  const der = Buffer.from(p256DerPrefix + uncompressed, "hex");

  const pemBody = der.toString("base64").match(/.{1,64}/g)?.join("\n") ?? "";

  return `-----BEGIN PUBLIC KEY-----\n${pemBody}\n-----END PUBLIC KEY-----\n`;
}

/**
 * Verifies the signature of a challenge.
 * @param publicKeyHex The public key in hex format.
 * @param challenge The challenge string that was signed.
 * @param signatureHex The signature in hex format.
 * @returns True if the signature is valid, otherwise it throws an error.
 */
function verifyChallengeSignature(
  challenge: ChallengeResponse,
): boolean {
  const verify = createVerify("RSA-SHA256");

  const challengeExpiresAt = parseInt(challenge.timestamp) + 60 * 3; // 3 minutes timeout
  if (challengeExpiresAt < Date.now() / 1000) {
    console.error("Panda Challenge verification failed: Timestamp is too old.");
    return false;
  }

  const proofPrefix = "PANDA_PROOF_V0";
  const proof = `${proofPrefix}|${challenge.timestamp}|${challenge.randomHex}|${challenge.challenge}`;
  verify.update(proof, "utf8");
  verify.end();

  const publicKeyPem = publicKeyFromHex(challenge.publicKey);
  try {
    return verify.verify(publicKeyPem, Buffer.from(challenge.signature, "hex"));
  } catch (err) {
    console.error("Error verifying signature:", err);
    throw err;
  }
}

/**
 * Generates a challenge and returns it along with the header object.
 * @returns An object containing the challenge string and the request headers.
 */
export function generateChallengeHeaders(): {
  challenge: string;
  headers: Record<string, string>;
} {
  const challenge = randomBytes(32).toString("hex");
  return {
    challenge,
    headers: {
      "Panda-Challenge": challenge,
    },
  };
}

/**
 * Verifies the signature from the response headers.
 * Throws an error if verification fails.
 * @param response The fetch response object.
 * @param challenge The challenge string that was sent.
 */
export function verifyChallenge(response: Response, challenge: string): ChallengeResponse {
  const publicKeyHex = response.headers.get("Panda-Public-key");
  const signatureHex = response.headers.get("Panda-Signature");
  const timestamp = response.headers.get("Panda-Timestamp");
  const randomHex = response.headers.get("Panda-Server-Random");

  if (!publicKeyHex || !signatureHex || !timestamp || !randomHex) {
    throw new Error(
      "Panda Challenge verification failed: Missing 'Panda-Public-key', 'Panda-Signature', 'Panda-Timestamp', 'Panda-Server-Random' headers., response.headers: " + JSON.stringify(response.headers),
    );
  }

  const challengeResponse = {
    publicKey: publicKeyHex,
    challenge,
    signature: signatureHex,
    randomHex: randomHex,
    timestamp: timestamp,
  }
  const isValid = verifyChallengeSignature(challengeResponse);

  if (!isValid) {
    throw new Error("Panda Challenge verification failed: Invalid signature.");
  }
  console.log("[Panda Challenge] Verification successful.");
  return challengeResponse;
} 