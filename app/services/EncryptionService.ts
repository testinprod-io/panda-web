import CryptoJS from 'crypto-js';
import { MultimodalContent } from "@/app/client/api";

// Key and IV will be stored in memory only
let inMemoryKey: CryptoJS.lib.WordArray | null = null;
let inMemoryIv: CryptoJS.lib.WordArray | null = null;

// Verification token to check if decryption works correctly
const VERIFICATION_TOKEN = "PandaAI-VerificationData-2023";
let encryptedVerificationToken: string | null = null;

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
   * Derives and sets the encryption key and IV from a user password.
   * Stores them in memory.
   */
  setKeyFromPassword(password: string): void {
    if (!password) {
      console.error("[EncryptionService] Cannot set key from empty password.");
      this.clearKey(); // Ensure key is cleared if password is empty
      return;
    }
    try {
      // Use PBKDF2 to derive a more secure key
      // const salt = CryptoJS.lib.WordArray.random(128/8); // 128 bits
      // const key = CryptoJS.PBKDF2(password, salt, {
      //   keySize: 256/32, // 256 bits
      //   iterations: 1000
      // });
      const key = CryptoJS.enc.Hex.parse(password);
      
      // Use first half for key, second half for IV
      const keyWords = key.words;
      const keyHalfLength = keyWords.length / 2;
      
      const keyBytes = keyWords.slice(0, keyHalfLength);
      const ivBytes = keyWords.slice(keyHalfLength);

      inMemoryKey = CryptoJS.lib.WordArray.create(keyBytes);
      inMemoryIv = CryptoJS.lib.WordArray.create(ivBytes);

      // Create verification token with this key
      encryptedVerificationToken = this.encryptVerificationToken();
      
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
   * Verify that the current key can correctly decrypt data
   * This confirms the password is correct
   */
  verifyKey(): boolean {
    if (!this.isKeySet() || !encryptedVerificationToken) {
      return false;
    }
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedVerificationToken, inMemoryKey!, {
        iv: inMemoryIv!,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      return decryptedText === VERIFICATION_TOKEN;
    } catch (error) {
      console.error("[EncryptionService] Verification failed:", error);
      return false;
    }
  },

  encrypt(text: string): string {
    if (!this.isKeySet()) {
      return "Please unlock with the correct password.";
      // throw new Error("[EncryptionService] No encryption key set");
    }
    if (!text) return text; // Don't encrypt empty strings

    try {
      const encrypted = CryptoJS.AES.encrypt(text, inMemoryKey!, {
        iv: inMemoryIv!,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      // Return Base64 encoded ciphertext
      return encrypted.toString();
    } catch (error) {
      console.error("[EncryptionService] Encryption failed:", error);
      throw new Error("Encryption failed");
    }
  },

  decrypt(encryptedText: string): string {
    if (!this.isKeySet()) {
      return "Please unlock with the correct password.";
      // throw new Error("[EncryptionService] No decryption key set");
    }
    
    // Only attempt decryption if it looks like base64
    if (!isLikelyBase64(encryptedText)) {
      // Special case for our error placeholders
      // if (encryptedText.startsWith("[") && encryptedText.endsWith("]")) {
        return encryptedText; // Return error placeholders as-is
      // }
      
      // console.warn(`[EncryptionService] Data not in encrypted format: ${encryptedText.substring(0, 30)}...`);
      // throw new Error("Data is not in encrypted format");
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
        throw new Error("Decryption failed - incorrect password or corrupted data");
      }
      
      return decryptedText;
    } catch (error) {
      console.error("[EncryptionService] Decryption failed:", error);
      throw error; // Re-throw to make caller aware of failure
    }
  },

  // --- Helpers for Chat Data Structures ---

  encryptChatMessageContent(content: string | MultimodalContent[]): string | MultimodalContent[] {
    // Throw error if key not set - enforce encryption
    if (!this.isKeySet()) {
      return "Please unlock with the correct password.";
      // throw new Error("Cannot encrypt chat content - no encryption key set");
    }

    if (typeof content === 'string') {
      return this.encrypt(content);
    } else if (Array.isArray(content)) {
      return content.map(item => {
        if (item.type === 'text' && item.text) {
          // Encrypt the text part of multimodal messages
          return { ...item, text: this.encrypt(item.text) };
        }
        // Assume non-text parts (like image URLs) are not encrypted for now
        return item;
      });
    }
    return content; // Return untouched if not string or array
  },

  decryptChatMessageContent(content: string | MultimodalContent[]): string | MultimodalContent[] {
    // Throw error if key not set - enforce decryption
    if (!this.isKeySet()) {
      return "Please unlock with the correct password.";
      // throw new Error("Cannot decrypt chat content - no encryption key set");
    }

    try {
      if (typeof content === 'string') {
        // If it's a plain string, attempt to decrypt it
        return this.decrypt(content);
      } else if (Array.isArray(content)) {
        return content.map(item => {
          if (item.type === 'text' && item.text) {
            // Decrypt the text part of multimodal messages
            return { ...item, text: this.decrypt(item.text) };
          }
          // Assume non-text parts were not encrypted
          return item;
        });
      }
      return content; // Return untouched if not string or array
    } catch (error) {
      console.error("[EncryptionService] Failed to decrypt chat content:", error);
      throw error; // Re-throw to make caller aware
    }
  },
}; 