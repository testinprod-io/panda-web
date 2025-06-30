// Integration layer for Vault with existing SDK architecture
// This demonstrates how to migrate from CryptoJS-based EncryptionService to Vault

import React from 'react';
import { useVault } from '@/hooks/use-vault';
import type { EncryptRes, DecryptRes } from '@/types/vault';

export interface VaultIntegrationOptions {
  fallbackToLegacy?: boolean; // Whether to fall back to legacy EncryptionService
  autoDerive?: boolean; // Whether to auto-derive keys on first use
}

/**
 * VaultIntegration provides a bridge between the existing SDK and the new Vault system
 * This allows for gradual migration from CryptoJS to the secure iframe vault
 */
export class VaultIntegration {
  private vault: ReturnType<typeof useVault> | null = null;
  private options: VaultIntegrationOptions;
  private keysDerived = false;

  constructor(options: VaultIntegrationOptions = {}) {
    this.options = {
      fallbackToLegacy: true,
      autoDerive: true,
      ...options,
    };
  }

  /**
   * Initialize the vault integration
   * This should be called from a React component that can use hooks
   */
  public setVault(vault: ReturnType<typeof useVault>): void {
    this.vault = vault;
  }

  /**
   * Check if the vault is ready for operations
   */
  public isReady(): boolean {
    return !!this.vault?.state.isReady;
  }

  /**
   * Derive encryption keys (equivalent to EncryptionService.setKeyFromPassword)
   */
  public async deriveKeys(): Promise<void> {
    if (!this.vault) {
      throw new Error('Vault not initialized. Call setVault() first.');
    }

    if (!this.vault.state.isReady) {
      throw new Error('Vault not ready');
    }

    await this.vault.derive();
    this.keysDerived = true;
  }

  /**
   * Encrypt text using the vault (equivalent to EncryptionService.encrypt)
   */
  public async encrypt(plaintext: string): Promise<string> {
    if (!this.vault) {
      throw new Error('Vault not initialized');
    }

    // Auto-derive keys if enabled and not already derived
    if (this.options.autoDerive && !this.keysDerived) {
      await this.deriveKeys();
    }

    if (!this.keysDerived) {
      throw new Error('Keys not derived. Call deriveKeys() first.');
    }

    try {
      const result = await this.vault.encrypt(plaintext);
      
      // Convert to a format compatible with existing system
      // We combine ciphertext and IV into a single base64 string
      return this.encodeVaultResult(result);
    } catch (error) {
      console.error('[VaultIntegration] Encryption failed:', error);
      
      if (this.options.fallbackToLegacy) {
        console.warn('[VaultIntegration] Falling back to legacy encryption');
        // Here you would fallback to the existing EncryptionService
        // return legacyEncryptionService.encrypt(plaintext);
        throw new Error('Fallback to legacy encryption not implemented');
      }
      
      throw error;
    }
  }

  /**
   * Decrypt text using the vault (equivalent to EncryptionService.decrypt)
   */
  public async decrypt(encryptedData: string): Promise<string> {
    if (!this.vault) {
      throw new Error('Vault not initialized');
    }

    if (!this.keysDerived) {
      throw new Error('Keys not derived. Call deriveKeys() first.');
    }

    try {
      // Check if this is vault-encrypted data or legacy data
      if (this.isVaultEncryptedData(encryptedData)) {
        const { ciphertext, iv } = this.decodeVaultResult(encryptedData);
        return await this.vault.decrypt(ciphertext, iv);
      } else if (this.options.fallbackToLegacy) {
        console.warn('[VaultIntegration] Detected legacy encrypted data, falling back');
        // Here you would fallback to the existing EncryptionService
        // return legacyEncryptionService.decrypt(encryptedData);
        throw new Error('Fallback to legacy decryption not implemented');
      } else {
        throw new Error('Unrecognized encrypted data format');
      }
    } catch (error) {
      console.error('[VaultIntegration] Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Clear keys from memory (equivalent to EncryptionService.clearKey)
   */
  public clearKeys(): void {
    this.keysDerived = false;
    // The vault automatically clears keys on idle timeout
    // For immediate clearing, we could reset the vault
    if (this.vault) {
      this.vault.reset();
    }
  }

  /**
   * Check if keys are currently available
   */
  public isKeySet(): boolean {
    return this.keysDerived && this.isReady();
  }

  // Private helper methods

  private encodeVaultResult(result: { ciphertext: ArrayBuffer; iv: ArrayBuffer }): string {
    // Create a format that identifies this as vault-encrypted data
    // Format: "vault:" + base64(version + iv_length + iv + ciphertext)
    const version = new Uint8Array([1]); // Version 1
    const ivLengthBytes = new Uint8Array([result.iv.byteLength]);
    const ivBytes = new Uint8Array(result.iv);
    const ciphertextBytes = new Uint8Array(result.ciphertext);
    
    const combined = new Uint8Array(
      version.length + ivLengthBytes.length + ivBytes.length + ciphertextBytes.length
    );
    
    let offset = 0;
    combined.set(version, offset);
    offset += version.length;
    combined.set(ivLengthBytes, offset);
    offset += ivLengthBytes.length;
    combined.set(ivBytes, offset);
    offset += ivBytes.length;
    combined.set(ciphertextBytes, offset);
    
    return 'vault:' + this.arrayBufferToBase64(combined.buffer);
  }

  private decodeVaultResult(encoded: string): { ciphertext: ArrayBuffer; iv: ArrayBuffer } {
    if (!encoded.startsWith('vault:')) {
      throw new Error('Invalid vault-encrypted data format');
    }
    
    const base64Data = encoded.substring(6); // Remove "vault:" prefix
    const combined = new Uint8Array(this.base64ToArrayBuffer(base64Data));
    
    let offset = 0;
    
    // Read version
    const version = combined[offset];
    offset += 1;
    
    if (version !== 1) {
      throw new Error(`Unsupported vault data version: ${version}`);
    }
    
    // Read IV length
    const ivLength = combined[offset];
    offset += 1;
    
    // Read IV
    const iv = combined.slice(offset, offset + ivLength);
    offset += ivLength;
    
    // Read ciphertext
    const ciphertext = combined.slice(offset);
    
    return {
      iv: iv.buffer,
      ciphertext: ciphertext.buffer,
    };
  }

  private isVaultEncryptedData(data: string): boolean {
    return data.startsWith('vault:');
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// React hook for easy integration
export function useVaultIntegration(options?: VaultIntegrationOptions): VaultIntegration {
  const vault = useVault();
  const [integration] = React.useState(() => new VaultIntegration(options));
  
  React.useEffect(() => {
    integration.setVault(vault);
  }, [vault, integration]);
  
  return integration;
}

// Usage example:
/*
// In a React component:
function MyComponent() {
  const vault = useVault();
  const integration = new VaultIntegration();
  
  useEffect(() => {
    integration.setVault(vault);
  }, [vault]);
  
  const handleEncrypt = async () => {
    try {
      const encrypted = await integration.encrypt("sensitive data");
      console.log("Encrypted:", encrypted);
      
      const decrypted = await integration.decrypt(encrypted);
      console.log("Decrypted:", decrypted);
    } catch (error) {
      console.error("Crypto operation failed:", error);
    }
  };
  
  return <button onClick={handleEncrypt}>Test Encryption</button>;
}
*/