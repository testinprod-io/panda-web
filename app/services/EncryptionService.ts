import CryptoJS from 'crypto-js';
import { MultimodalContent } from "@/app/client/api";

// Key and IV will be stored in memory only
let inMemoryKey: CryptoJS.lib.WordArray | null = null;
let inMemoryIv: CryptoJS.lib.WordArray | null = null;

// Verification token to check if decryption works correctly
const VERIFICATION_TOKEN = "PandaAI-VerificationData-2023";
let encryptedVerificationToken: string | null = null;

// localStorage key
const STORAGE_VERIFICATION_KEY = 'pandaai_encryption_verification';

// Basic check for potential base64 encoding (simple heuristic)
function isLikelyBase64(str: string): boolean {
  // Allow empty strings, don't try to decrypt them
  if (!str) return false;
  // Very basic regex: checks for Base64 characters and potential padding
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  return base64Regex.test(str);
}

// Test function for debugging
export function testEncryption() {
  const originalText = "Test secret message";
  
  // Set a key
  EncryptionService.setKeyFromPassword("password1");
  console.log("Key set from password1");
  
  const encrypted = EncryptionService.encrypt(originalText);
  console.log("Encrypted:", encrypted);
  
  // Try with correct key
  const decrypted1 = EncryptionService.decrypt(encrypted);
  console.log("Decrypted with correct key:", decrypted1);
  
  // Try with wrong key
  EncryptionService.setKeyFromPassword("password2");
  console.log("Key set from password2");
  
  try {
    const decrypted2 = EncryptionService.decrypt(encrypted);
    console.log("Decrypted with wrong key:", decrypted2);
  } catch (error) {
    console.error("Decryption with wrong key failed (expected):", error);
  }
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
  setKeyFromPassword(password: string): void {
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
      encryptedVerificationToken = this.encryptVerificationToken();
      
      // Save to localStorage for later verification
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_VERIFICATION_KEY, encryptedVerificationToken);
        console.log("[EncryptionService] Verification token saved to localStorage.");
      }
      
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
    encryptedVerificationToken = null;
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
  encryptVerificationToken(): string {
    if (!this.isKeySet()) {
      console.error("[EncryptionService] encryptVerificationToken called without key set.");
      return ""; // Cannot encrypt without key
    }
    try {
      const encrypted = CryptoJS.AES.encrypt(VERIFICATION_TOKEN, inMemoryKey!, {
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
  verifyKey(password: string): boolean {
    if (typeof window === 'undefined') {
      console.error("[EncryptionService] verifyKey called outside of browser.");
      return false; // Cannot verify outside of browser
    }
    
    // Get verification token from localStorage
    const verificationToken = localStorage.getItem(STORAGE_VERIFICATION_KEY);
    
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
      return decryptedText === VERIFICATION_TOKEN;
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
    return this.decrypt(content);
  },
}; 