/**
 * This middleware handles the Panda API's challenge-response verification.
 * It requires the 'elliptic' package. Please install it using:
 * npm install elliptic
 * or
 * yarn add elliptic
 * If using TypeScript, also install types:
 * npm install --save-dev @types/elliptic
 */
import { createVerify, randomBytes } from "crypto";
import { ec as EC } from "elliptic";

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
  publicKeyHex: string,
  challenge: string,
  signatureHex: string,
): boolean {
  const verify = createVerify("RSA-SHA256");
  verify.update(challenge, "utf8");
  verify.end();

  const publicKeyPem = publicKeyFromHex(publicKeyHex);
  try {
    return verify.verify(publicKeyPem, Buffer.from(signatureHex, "hex"));
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
  const challenge = "cb6f7e72d52aaba79c5757c2a67dfeada60f7c3121e9fe513bcdb013d1ea7bd4"; //randomBytes(32).toString("hex");
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
export function verifyChallenge(response: Response, challenge: string): string {
  const publicKeyHex = "04b4e21611be6ea53d5ea647922eca60c869906ae3be4c12a5928ea50097d48cbb6d72c18213572b1c8f9ffa56aaab6a519e918e05157fec328241ca19f1cdea62"; //response.headers.get("Panda-Public_key");
  const signatureHex = "3046022100b40df7a5e43f072f3ad73bc37a2e948244c138137c9ceb6d3bbacf8851e80a04022100c0561f3773c1ab8e8c5aab0acf44bd77a03419b3fb82e5151539e7aa74dcfa50"; //response.headers.get("Panda-Signature");

  if (!publicKeyHex || !signatureHex) {
    throw new Error(
      "Panda Challenge verification failed: Missing 'Panda-Public_key' or 'Panda-Signature' headers., response.headers: " + JSON.stringify(response.headers),
    );
  }

  const isValid = verifyChallengeSignature(
    publicKeyHex,
    challenge,
    signatureHex,
  );

  if (!isValid) {
    throw new Error("Panda Challenge verification failed: Invalid signature.");
  }
  console.log("[Panda Challenge] Verification successful.");
  return publicKeyHex;
} 