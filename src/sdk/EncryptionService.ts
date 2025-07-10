import CryptoJS from "crypto-js";
import { useVault } from "@/hooks/use-vault";

export class EncryptionService {
  private vault: ReturnType<typeof useVault> | null = null;
  private useVaultForOperations: boolean = false;

  /**
   * Set the vault instance for secure operations
   * When vault is set and ready, all encryption/decryption will be delegated to vault
   */
  public setVault(vault: ReturnType<typeof useVault>): void {
    this.vault = vault;
    this.useVaultForOperations = vault.state.isReady;
    console.log('[EncryptionService] Vault integration:', this.useVaultForOperations ? 'enabled' : 'disabled');
  }

  /**
   * Check if vault operations are available
   */
  public isVaultReady(): boolean {
    return !!(this.vault && this.vault.state.isReady);
  }


  /**
   * Checks if the encryption key and IV are currently set in memory.
   */


  /**

  /**
   * Verify that the provided password can correctly decrypt the verification token
   * This confirms the password is correct
   * @deprecated Use vault-based password verification instead
   */


  public async encrypt(text: string): Promise<string> {
    if (!text) return text;

    if (!this.isVaultReady()) { 
      return text;
    }
      try {
        console.log("[EncryptionService] Vault encryption called", text);
        return await this.vault!.encrypt(text);
      } catch (error) {
        console.error("[EncryptionService] Vault encryption failed:", error);
        throw new Error("Encryption failed");
      }
  }

  public async decrypt(encryptedText: string): Promise<string> {
    if (!encryptedText || encryptedText === "") return encryptedText;

    if (!this.isVaultReady()) { 
      return encryptedText;
    }

      try {
        console.log("decrypting with vault", encryptedText);
        return await this.vault!.decrypt(encryptedText);
      } catch (error) {
        console.error("[EncryptionService] Vault decryption failed:", error, encryptedText);
        // Try fallback to legacy if the data might be legacy encrypted
        // if (this.isKeySet() && isLikelyBase64(encryptedText)) {
        //   console.log("[EncryptionService] Attempting legacy decryption fallback");
        //   return this.decryptLegacy(encryptedText);
        // }
        return encryptedText;
        // throw error;
      }
  }

  public async encryptFile(file: File): Promise<File> {
    // File encryption is not yet supported with vault
    // Fall back to legacy implementation
    if (!this.isVaultReady()) {
      throw new Error("Key not set");
    }

    try {
      const data = await file.arrayBuffer();
      const encryptedData = await this.vault!.encryptFile(data, file.name, file.type);

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
    // File decryption is not yet supported with vault
    // Fall back to legacy implementation
    if (!this.isVaultReady()) {
      throw new Error("Key not set");
    }

    const data = await file.arrayBuffer();
    const decryptedBuffer = await this.vault!.decryptFile(data, file.name, file.type);

    return new File([decryptedBuffer], file.name, { type: file.type });
  }
}

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
