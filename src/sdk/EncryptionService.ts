import { useVault } from "@/hooks/use-vault";

export class EncryptionService {
  private vault: ReturnType<typeof useVault> | null = null;
  private useVaultForOperations: boolean = false;

  public setVault(vault: ReturnType<typeof useVault>): void {
    this.vault = vault;
    this.useVaultForOperations = vault.state.isReady;
    console.log('[EncryptionService] Vault integration:', this.useVaultForOperations ? 'enabled' : 'disabled');
  }

  public isVaultReady(): boolean {
    return !!(this.vault && this.vault.state.isReady);
  }

  public async encrypt(text: string): Promise<string> {
    if (!text) return text;

    if (!this.isVaultReady()) { 
      return text;
    }
      try {
        return await this.vault!.encrypt(text);
      } catch (error) {
        throw new Error("Encryption failed");
      }
  }

  public async decrypt(encryptedText: string): Promise<string> {
    if (!encryptedText || encryptedText === "") return encryptedText;

    if (!this.isVaultReady()) { 
      return encryptedText;
    }

      try {
        return await this.vault!.decrypt(encryptedText);
      } catch (error) {
        return encryptedText;
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
      console.log("[EncryptionService] File encryption failed:", error);
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