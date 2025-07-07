// CryptoJS is loaded from CDN in index.html
// @ts-ignore - CryptoJS will be available globally

/**
 * A stateless helper that derives a fresh key + IV **per encryption** using a
 * random salt and PBKDF2‑SHA‑256.  The salt, IV and ciphertext are then packed
 * into a single Base64‑encoded envelope so that *all* information needed for
 * decryption travels with the data.  Only the user's password remains secret.
 *
 * Envelope format (dot‑separated for readability):
 *    base64(salt).base64(iv).base64(ciphertext)
 *
 * – `salt`  : 16 bytes (128 bits)
 * – `iv`    : 16 bytes (AES‑CBC)  ─►  change to 12 bytes if you migrate to GCM
 * – `ciphertext` already includes the PKCS#7 padding that CryptoJS produces.
 *
 * To migrate an existing code‑base with the least friction we preserve the
 * public method names from the previous version, but they now all take the
 * **password** as an explicit parameter instead of relying on a key cached in
 * memory.  No state — no cache‑invalidation headaches.
 */
class EncryptionService {
  // ============ tweakables ============
  private static readonly ITERATIONS = 310_000;      // OWASP 2025
  private static readonly KEY_SIZE   = 256 / 32;     // 256‑bit AES key → 8 words
  private static readonly SALT_LEN   = 16;           // 128‑bit salt
  private static readonly IV_LEN     = 16;           // 128‑bit IV (CBC)

  // ---------- public high‑level API ----------

  /** Encrypt arbitrary text. */
  public encrypt(plaintext: string, password: string): string {
    if (!password) throw new Error("Password must not be empty");
    if (!plaintext) return plaintext;

    const salt = CryptoJS.lib.WordArray.random(EncryptionService.SALT_LEN);
    const iv   = CryptoJS.lib.WordArray.random(EncryptionService.IV_LEN);
    const key  = this.deriveKey(password, salt);

    const ctWordArray = CryptoJS.AES.encrypt(plaintext, key, {
      iv,
      mode   : CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).ciphertext;

    return [this.toB64(salt), this.toB64(iv), this.toB64(ctWordArray)].join(".");
  }

  /** Decrypt text produced by {@link encrypt}. */
  public decrypt(envelope: string, password: string): string {
    if (!password) throw new Error("Password must not be empty");
    if (!envelope) return envelope;

    const parts = envelope.split(".");
    if (parts.length !== 3) throw new Error("Malformed ciphertext envelope");

    const [saltB64, ivB64, ctB64] = parts;
    if (!saltB64 || !ivB64 || !ctB64) throw new Error("Malformed ciphertext envelope");
    const salt = this.fromB64(saltB64);
    const iv   = this.fromB64(ivB64);
    const ctWA = this.fromB64(ctB64);

    const key = this.deriveKey(password, salt);

    const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: ctWA });
    const ptWA = CryptoJS.AES.decrypt(cipherParams, key, {
      iv,
      mode   : CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return ptWA.toString(CryptoJS.enc.Utf8);
  }

  /** One‑liner wrapper for the old workflow — generates and encrypts a token. */
  public encryptVerificationToken(userId: string, password: string): string {
    return this.encrypt(userId, password);
  }

  /**
   * True if `password` successfully decrypts `verificationToken` and yields
   * the original `userId`.
   */
  public verifyKey(
    verificationToken: string,
    userId: string,
    password: string,
  ): boolean {
    try {
      return this.decrypt(verificationToken, password) === userId;
    } catch {
      return false;
    }
  }

  /** Encrypt a `File` (ArrayBuffer payload) with AES‑GCM, packing salt + iv. */
  public async encryptFile(file: File, password: string): Promise<File> {
    if (!password) throw new Error("Password must not be empty");

    const salt = crypto.getRandomValues(new Uint8Array(EncryptionService.SALT_LEN));
    const iv   = crypto.getRandomValues(new Uint8Array(12)); // 96‑bit IV for GCM
    const key  = await this.deriveWebKey(password, salt);

    const cipherBuf = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      await file.arrayBuffer(),
    );

    const blob = new Uint8Array(salt.length + iv.length + cipherBuf.byteLength);
    blob.set(salt, 0);
    blob.set(iv, salt.length);
    blob.set(new Uint8Array(cipherBuf), salt.length + iv.length);

    return new File([blob], `${file.name}.enc`, { type: file.type });
  }

  /** Decrypt a file produced by {@link encryptFile}. */
  public async decryptFile(file: File, password: string): Promise<File> {
    if (!password) throw new Error("Password must not be empty");

    const blob = new Uint8Array(await file.arrayBuffer());
    const salt = blob.slice(0, EncryptionService.SALT_LEN);
    const iv   = blob.slice(EncryptionService.SALT_LEN, EncryptionService.SALT_LEN + 12);
    const data = blob.slice(EncryptionService.SALT_LEN + 12);

    const key = await this.deriveWebKey(password, salt);

    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );

    const originalName = file.name.replace(/\.enc$/i, "");
    return new File([plainBuf], originalName, { type: file.type });
  }

  // ---------- helpers ----------

  /** PBKDF2‑SHA‑256 → CryptoJS WordArray key (CBC/PKCS7 path). */
  private deriveKey(password: string, salt: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray {
    return CryptoJS.PBKDF2(password, salt, {
      keySize  : EncryptionService.KEY_SIZE,
      iterations: EncryptionService.ITERATIONS,
      hasher    : CryptoJS.algo.SHA256,
    });
  }

  /** PBKDF2‑SHA‑256 → WebCrypto AES‑GCM key (file path). */
  private async deriveWebKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);

    return crypto.subtle.deriveKey(
      {
        name      : "PBKDF2",
        hash      : "SHA-256",
        iterations: EncryptionService.ITERATIONS,
        salt,
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  // ---------- WordArray <‑‑> Base64 ----------

  private toB64(wa: CryptoJS.lib.WordArray): string {
    return CryptoJS.enc.Base64.stringify(wa);
  }

  private fromB64(b64: string): CryptoJS.lib.WordArray {
    return CryptoJS.enc.Base64.parse(b64);
  }
}

/**
 * Quick utility for external callers that need to test
 * whether a string *looks* like one of our envelopes (salt.iv.cipher).
 */
function isLikelyEnvelope(str: string): boolean {
  return /^[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*$/.test(str);
}
