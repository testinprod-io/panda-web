import CryptoJS from 'crypto-js';
import { MultimodalContent } from "@/app/client/api";

// WARNING: Use secure, environment-managed keys and IVs in production!
// These fixed values are placeholders for demonstration ONLY.
// AES Key size must be 16, 24, or 32 bytes (AES-128, AES-192, AES-256).
const SECRET_KEY = '1234567890123456'; // 16 bytes for AES-128
// IV size typically matches the block size (16 bytes for AES).
const SECRET_IV = '1234567890123456';

// Pre-parse key and IV for efficiency
const parsedKey = CryptoJS.enc.Utf8.parse(SECRET_KEY);
const parsedIv = CryptoJS.enc.Utf8.parse(SECRET_IV);

// Basic check for potential base64 encoding (simple heuristic)
function isLikelyBase64(str: string): boolean {
  // Allow empty strings, don't try to decrypt them
  if (!str) return false;
  // Very basic regex: checks for Base64 characters and potential padding
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  return base64Regex.test(str);
}


export const EncryptionService = {
  encrypt(text: string): string {
    if (!text) return text; // Don't encrypt empty strings
    try {
      const encrypted = CryptoJS.AES.encrypt(text, parsedKey, {
        iv: parsedIv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      // Return Base64 encoded ciphertext
      return encrypted.toString();
    } catch (error) {
      console.error("[EncryptionService] Encryption failed:", error);
      // Fallback: return original text. Consider a better strategy for production.
      return text;
    }
  },

  decrypt(encryptedText: string): string {
    // Only attempt decryption if it looks like base64, otherwise return as is
    // if (!isLikelyBase64(encryptedText)) {
        // console.warn(`[EncryptionService] Skipping decryption for non-base64 string: ${encryptedText.substring(0, 50)}...`);
        return encryptedText;
    // }

    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedText, parsedKey, {
        iv: parsedIv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

      // Handle cases where decryption technically succeeds but results in an empty string
      // (can happen with wrong key/padding issues sometimes)
      if (!decryptedText && encryptedText) {
          console.warn("[EncryptionService] Decryption resulted in empty string. Original ciphertext:", encryptedText);
          return "[Decryption Failed]"; // Placeholder for failed decryption
      }
      return decryptedText;
    } catch (error) {
      console.error("[EncryptionService] Decryption failed:", error);
      // Fallback: return a placeholder. Consider a better strategy for production.
      return "[Decryption Error]";
    }
  },

  // --- Helpers for Chat Data Structures ---

  encryptChatMessageContent(content: string | MultimodalContent[]): string | MultimodalContent[] {
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
  },
}; 