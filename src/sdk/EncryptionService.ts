import CryptoJS from "crypto-js";

export class EncryptionService { 
    
    private inMemoryKey: CryptoJS.lib.WordArray | null = null;
    private inMemoryIv: CryptoJS.lib.WordArray | null = null;
    


  public generateKeyFromPassword(password: string): {
    key: CryptoJS.lib.WordArray;
    iv: CryptoJS.lib.WordArray;
  } {
    if (!password) {
      throw new Error("Cannot generate key from empty password");
    }

    // Use a known string as a constant "pepper" instead of a random salt
    // Note: this is less secure than using a random salt
    const pepper = "PandaAI-Static-Pepper-2023";

    // Use PBKDF2 to derive a key
    const derivedKey = CryptoJS.PBKDF2(password, pepper, {
      keySize: 256 / 32, // 256 bits
      iterations: 1000,
    });

    // Use first half for key, second half for IV
    const keyWords = derivedKey.words;
    const keyHalfLength = keyWords.length / 2;

    const keyBytes = keyWords.slice(0, keyHalfLength);
    const ivBytes = keyWords.slice(keyHalfLength);

    const key = CryptoJS.lib.WordArray.create(keyBytes);
    const iv = CryptoJS.lib.WordArray.create(ivBytes);

    return { key, iv };
  }

  /**
   * Derives and sets the encryption key and IV from a user password.
   * Stores them in memory.
   */
  public setKeyFromPassword(password: string) {
    if (!password) {
      console.error("[EncryptionService] Cannot set key from empty password.");
      this.clearKey();
      return;
    }

    try {
      const { key, iv } = this.generateKeyFromPassword(password);

      this.inMemoryKey = key;
      this.inMemoryIv = iv;

      console.log("[EncryptionService] Key and IV derived and set in memory.");
    } catch (error) {
      console.error(
        "[EncryptionService] Failed to derive key from password:",
        error,
      );
      this.clearKey();
    }
  }

  /**
   * Clears the encryption key and IV from memory.
   */
  public clearKey() {
    this.inMemoryKey = null;
    this.inMemoryIv = null;
    console.log("[EncryptionService] Key and IV cleared from memory.");
  }

  /**
   * Checks if the encryption key and IV are currently set in memory.
   */
  public isKeySet(): boolean {
    return !!this.inMemoryKey && !!this.inMemoryIv;
  }

  /**
   * Encrypt the verification token to test decryption later
   */
  public encryptVerificationToken(userId: string): string {
    if (!this.isKeySet()) {
      console.error(
        "[EncryptionService] encryptVerificationToken called without key set.",
      );
      return "";
    }

    try {
      const encrypted = CryptoJS.AES.encrypt(userId, this.inMemoryKey!, {
        iv: this.inMemoryIv!,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      return encrypted.toString();
    } catch (error) {
      console.error(
        "[EncryptionService] Failed to encrypt verification token:",
        error,
      );
      return "";
    }
  }

  /**
   * Verify that the provided password can correctly decrypt the verification token
   * This confirms the password is correct
   */
  public verifyKey(
    verificationToken: string,
    userId: string,
    password: string,
  ): boolean {
    if (typeof window === "undefined") {
      console.error("[EncryptionService] verifyKey called outside of browser.");
      return false; // Cannot verify outside of browser
    }

    try {
      const { key, iv } = this.generateKeyFromPassword(password);

      const decrypted = CryptoJS.AES.decrypt(verificationToken, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      return decryptedText === userId;
    } catch (error) {
      console.error("[EncryptionService] Verification failed:", error);
      return false;
    }
  }

  public encrypt(text: string): string {
    if (!this.isKeySet()) {
      console.warn(
        "[EncryptionService] encrypt called but no key set. Returning plain text.",
      );
      return text;
    }
    if (!text) return text;

    try {
      const encrypted = CryptoJS.AES.encrypt(text, this.inMemoryKey!, {
        iv: this.inMemoryIv!,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      return encrypted.toString();
    } catch (error) {
      console.error("[EncryptionService] Encryption failed:", error);
      throw new Error("Encryption failed");
    }
  }

  public decrypt(encryptedText: string): string {
    if (!this.isKeySet()) {
      console.info(
        "[EncryptionService] decrypt called but no key set. Returning plain text.",
      );
      return encryptedText;
    }

    if (!isLikelyBase64(encryptedText)) {
      return encryptedText;
    }

    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedText, this.inMemoryKey!, {
        iv: this.inMemoryIv!,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

      if (!decryptedText && encryptedText) {
        console.error(
          "Decryption failed - incorrect password or corrupted data",
        );
        return encryptedText;
      }

      return decryptedText;
    } catch (error) {
      console.error("[EncryptionService] Decryption failed:", error);
      throw error;
    }
  }

  public async encryptFile(file: File): Promise<File> {
    if (!this.isKeySet()) {
      throw new Error("Key not set");
    }

    try {
      const data = await file.arrayBuffer();

      const keyUint8Array = wordArrayToUint8Array(this.inMemoryKey!);
      const ivUint8Array = wordArrayToUint8Array(this.inMemoryIv!);

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyUint8Array,
        { name: "AES-GCM", length: this.inMemoryKey!.sigBytes * 8 },
        false,
        ["encrypt", "decrypt"],
      );

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: ivUint8Array,
        },
        cryptoKey,
        data,
      );

      const encryptedFile = new File([encryptedData], file.name, {
        type: file.type,
      });
      return encryptedFile;
    } catch (error) {
      console.error("[EncryptionService] File encryption failed:", error);
      throw new Error("File encryption failed");
    }
  }

  async decryptFile(file: File): Promise<File> {
    if (!this.isKeySet()) {
      throw new Error("Key not set");
    }

    const data = new Uint8Array(await file.arrayBuffer());

    const keyUint8Array = wordArrayToUint8Array(this.inMemoryKey!);
    const ivUint8Array = wordArrayToUint8Array(this.inMemoryIv!);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyUint8Array,
      { name: "AES-GCM", length: this.inMemoryKey!.sigBytes * 8 },
      false,
      ["encrypt", "decrypt"],
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivUint8Array },
      cryptoKey,
      data,
    );

    return new File([decryptedBuffer], file.name, { type: file.type });
  }
};

function isLikelyBase64(str: string): boolean {
    if (!str) return false;
  
    // Very basic regex: checks for Base64 characters and potential padding
    const base64Regex =
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    return base64Regex.test(str);
  }
  
  // Helper function to convert WordArray to Uint8Array
  function wordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
    const len = wordArray.sigBytes;
    const result = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      const byte = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      result[i] = byte;
    }
    return result;
  }