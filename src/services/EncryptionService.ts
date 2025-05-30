import CryptoJS from 'crypto-js';
import { MultimodalContent } from "@/client/api";
import { ClientApi } from "@/client/api";
// Key and IV will be stored in memory only
let inMemoryKey: CryptoJS.lib.WordArray | null = null;
let inMemoryIv: CryptoJS.lib.WordArray | null = null;

// Basic check for potential base64 encoding (simple heuristic)
function isLikelyBase64(str: string): boolean {
  // Allow empty strings, don't try to decrypt them
  if (!str) return false;
  // Very basic regex: checks for Base64 characters and potential padding
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
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

export const EncryptionService = {
  /**
   * Generates a key and IV from a password
   * Returns the key and IV
   */
  generateKeyFromPassword(password: string): { 
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
      keySize: 256/32, // 256 bits
      iterations: 1000
    });
    
    // Use first half for key, second half for IV
    const keyWords = derivedKey.words;
    const keyHalfLength = keyWords.length / 2;
    
    const keyBytes = keyWords.slice(0, keyHalfLength);
    const ivBytes = keyWords.slice(keyHalfLength);

    const key = CryptoJS.lib.WordArray.create(keyBytes);
    const iv = CryptoJS.lib.WordArray.create(ivBytes);
    
    return { key, iv };
  },

  /**
   * Derives and sets the encryption key and IV from a user password.
   * Stores them in memory and saves verification data to localStorage.
   */
  async setKeyFromPassword(clientApi: ClientApi, userId: string, password: string): Promise<void> {
    if (!password) {
      console.error("[EncryptionService] Cannot set key from empty password.");
      this.clearKey(); // Ensure key is cleared if password is empty
      return;
    }
    try {
      // Generate key and IV from password
      const { key, iv } = this.generateKeyFromPassword(password);
      
      // Store in memory
      inMemoryKey = key;
      inMemoryIv = iv;

      // Create verification token with this key
      // const encryptedVerificationToken = this.encryptVerificationToken(userId);
      
      // Save to localStorage for later verification
      // if (typeof window !== 'undefined') {
      //   await clientApi.app.createEncryptedId(encryptedVerificationToken);
      //   console.log("[EncryptionService] Verification token saved to localStorage.");
      // }
      
      console.log("[EncryptionService] Key and IV derived and set in memory.");
    } catch (error) {
        console.error("[EncryptionService] Failed to derive key from password:", error);
        this.clearKey();
    }
  },

  /**
   * Clears the encryption key and IV from memory.
   */
  clearKey(): void {
    inMemoryKey = null;
    inMemoryIv = null;
    // encryptedVerificationToken = null;
    console.log("[EncryptionService] Key and IV cleared from memory.");
  },

  /**
   * Checks if the encryption key and IV are currently set in memory.
   */
  isKeySet(): boolean {
    return !!inMemoryKey && !!inMemoryIv;
  },

  /**
   * Encrypt the verification token to test decryption later
   */
  encryptVerificationToken(userId: string): string {
    if (!this.isKeySet()) {
      console.error("[EncryptionService] encryptVerificationToken called without key set.");
      return ""; // Cannot encrypt without key
    }
    try {
      const encrypted = CryptoJS.AES.encrypt(userId, inMemoryKey!, {
        iv: inMemoryIv!,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return encrypted.toString();
    } catch (error) {
      console.error("[EncryptionService] Failed to encrypt verification token:", error);
      return "";
    }
  },

  /**
   * Verify that the provided password can correctly decrypt the verification token
   * This confirms the password is correct
   */
  async verifyKey(apiClient: ClientApi, userId: string, password: string): Promise<boolean> {
    if (typeof window === 'undefined') {
      console.error("[EncryptionService] verifyKey called outside of browser.");
      return false; // Cannot verify outside of browser
    }
    
    // Get verification token from localStorage
    const verificationToken = (await apiClient.app.getEncryptedId()).encrypted_id;
    
    if (!verificationToken) {
      console.error("[EncryptionService] No verification token found in localStorage.");
      return false; // Missing required data
    }

    try {
      // Generate key and IV from password
      const { key, iv } = this.generateKeyFromPassword(password);
      
      // Try to decrypt the verification token
      const decrypted = CryptoJS.AES.decrypt(verificationToken, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      console.log("[EncryptionService] decryptedText:", decryptedText);
      return decryptedText === userId;
    } catch (error) {
      console.error("[EncryptionService] Verification failed:", error);
      return false;
    }
  },

  encrypt(text: string): string {
    if (!this.isKeySet()) {
      // Return the original text if no key is set, assuming it might be a passthrough scenario.
      // The caller is responsible for ensuring encryption happens when intended if a key becomes available.
      // console.warn("[EncryptionService] encrypt called but no key set. Returning plain text.");
      return text; 
    }
    if (!text) return text;

    console.log(`inmemoryIv: ${inMemoryIv} inmemoryKey: ${inMemoryKey}`);
    try {
      const encrypted = CryptoJS.AES.encrypt(text, inMemoryKey!, {
        iv: inMemoryIv!,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return encrypted.toString();
    } catch (error) {
      console.error("[EncryptionService] Encryption failed:", error);
      throw new Error("Encryption failed");
    }
  },

  decrypt(encryptedText: string): string {
    if (!this.isKeySet()) {
      // Return the original text if no key is set, assuming it might already be decrypted.
      // console.warn("[EncryptionService] decrypt called but no key set. Returning plain text.");
      return encryptedText;
    }
    // If the text doesn't look like our encrypted format, return it as is.
    // This prevents errors if trying to decrypt already plain text.
    if (!isLikelyBase64(encryptedText)) {
        // console.log("[EncryptionService] decrypt called but text does not look like base64. Returning as is.");
        return encryptedText;
    }
    console.log(`inmemoryIv: ${inMemoryIv} inmemoryKey: ${inMemoryKey}`);
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedText, inMemoryKey!, {
        iv: inMemoryIv!,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // CryptoJS silently returns empty string on wrong key
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedText && encryptedText) {
        // return encryptedText;
        throw new Error("Decryption failed - incorrect password or corrupted data");
      }
      
      return decryptedText;
    } catch (error) {
      console.error("[EncryptionService] Decryption failed:", error);
      throw error;
    }
  },

  async encryptFile(file: File): Promise<File> {
    if (!this.isKeySet()) {
      throw new Error("Key not set");
    }
    
    const currentInMemoryKey = inMemoryKey!; 
    const currentInMemoryIv = inMemoryIv!;

    try {
      const data = await file.arrayBuffer();

      const keyUint8Array = wordArrayToUint8Array(currentInMemoryKey);
      const ivUint8Array = wordArrayToUint8Array(currentInMemoryIv);

      // Import key for crypto.subtle API
      const cryptoKey = await crypto.subtle.importKey(
        "raw", // format
        keyUint8Array, // keyData as Uint8Array (BufferSource)
        { name: "AES-GCM", length: currentInMemoryKey.sigBytes * 8 }, // algorithm details, length in bits
        false, // extractable
        ["encrypt", "decrypt"] // key usages
      );

      // Encrypt data
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: ivUint8Array, // IV as Uint8Array (BufferSource)
        },
        cryptoKey, // the imported CryptoKey
        data // data to encrypt (ArrayBuffer)
      );

      const encryptedFile = new File([encryptedData], file.name, { type: file.type });
      return encryptedFile;
    } catch (error) {
      console.error("[EncryptionService] File encryption failed:", error);
      throw new Error("File encryption failed");
    }
  },

  async decryptFile(file: File): Promise<File> {
    if (!this.isKeySet()) {
      throw new Error("Key not set");
    }
    const data = new Uint8Array(await file.arrayBuffer());
  
    const keyUint8Array = wordArrayToUint8Array(inMemoryKey!);
    const ivUint8Array = wordArrayToUint8Array(inMemoryIv!);

    // Import key for crypto.subtle API
    const cryptoKey = await crypto.subtle.importKey(
      "raw", // format
      keyUint8Array, // keyData as Uint8Array (BufferSource)
      { name: "AES-GCM", length: inMemoryKey!.sigBytes * 8 }, // algorithm details, length in bits
      false, // extractable
      ["encrypt", "decrypt"] // key usages
    );
  
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivUint8Array },
      cryptoKey,
      data
    );
  
    return new File([decryptedBuffer], file.name, { type: file.type });
  },

  encryptChatMessageContent(content: string): string {
    if (!this.isKeySet()) {
      // console.log("[EncryptionService] No key set, encryptChatMessageContent passing through.");
      return content;
    }
    // console.log("[EncryptionService] Key set, encryptChatMessageContent actually encrypting.");
    return this.encrypt(content); 
    },

  decryptChatMessageContent(content: string): string {
    if (!this.isKeySet()) {
      // console.log("[EncryptionService] No key set, decryptChatMessageContent passing through.");
      return content;
    }
    // If content is not likely base64, it's probably already decrypted or plain text.
    // console.log("[EncryptionService] Key set, decryptChatMessageContent checking if needs decryption.");
    if (!isLikelyBase64(content)) {
        // console.log("[EncryptionService] Content does not look like base64, returning as is.");
        return content;
    }
    // console.log("[EncryptionService] Content looks like base64, attempting decryption.");
    try {
      return this.decrypt(content);
    } catch (error) {
      console.error("[EncryptionService] Decryption failed:", error);
      return content;
    }
  },
}; 