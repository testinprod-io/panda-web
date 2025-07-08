// Integration layer for Vault with existing SDK architecture
// This demonstrates how to migrate from CryptoJS-based EncryptionService to Vault

import React from 'react';
import { useVault } from "../../hooks/use-vault";
import { EncryptionService } from "../EncryptionService";
import { BootstrapRes, CreateUserPasswordRes } from '@/types';

/**
 * VaultIntegration provides a bridge between the existing SDK and the new Vault system
 * This allows for gradual migration from CryptoJS to the secure iframe vault
 */
export class VaultIntegration {
  private vault: ReturnType<typeof useVault> | null = null;
  private encryptionService: EncryptionService;

  constructor() {
    this.encryptionService = new EncryptionService();
  }

  /**
   * Initialize the vault integration
   * This should be called from a React component that can use hooks
   */
  public setVault(vault: ReturnType<typeof useVault>): void {
    this.vault = vault;
    // Connect the vault to the encryption service
    this.encryptionService.setVault(vault);
  }

  /**
   * Get the integrated encryption service
   * This service will use vault when available, fallback to legacy otherwise
   */
  public getEncryptionService(): EncryptionService {
    return this.encryptionService;
  }

  /**
   * Check if the vault is ready for operations
   */
  public isVaultReady(): boolean {
    return !!this.vault?.state.isReady;
  }

  public async bootstrap(encryptedId: string, userId: string, encryptedPassword?: string): Promise<BootstrapRes> {
    if (!this.vault) {
      throw new Error('Vault not initialized. Call setVault() first.');
    }

    if (!this.vault.state.isReady) {
      throw new Error('Vault not ready');
    }

    return await this.vault.bootstrap(encryptedId, userId, encryptedPassword);
  }

  /**
   * Set password (for first-time users)
   */
  public async setPassword(password: string, encryptedId: string, userId: string): Promise<string> {
    if (!this.vault) {
      throw new Error('Vault not initialized. Call setVault() first.');
    }

    if (!this.vault.state.isReady) {
      throw new Error('Vault not ready');
    }

    return await this.vault.setPassword(password, encryptedId, userId);
  }

  public async createUserPassword(password: string, userId: string): Promise<CreateUserPasswordRes> {
    if (!this.vault) {
      throw new Error('Vault not initialized. Call setVault() first.');
    }

    if (!this.vault.state.isReady) {
      throw new Error('Vault not ready');
    }

    return await this.vault.createUserPassword(password, userId);
  }

  /**
   * Update encrypted password (for existing users with key rotation)
   */
  public async updatePassword(encryptedPassword: string): Promise<string> {
    if (!this.vault) {
      throw new Error('Vault not initialized. Call setVault() first.');
    }

    if (!this.vault.state.isReady) {
      throw new Error('Vault not ready');
    }

    return await this.vault.updateKey(encryptedPassword);
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
  }

  /**
   * Encrypt text using the vault (equivalent to EncryptionService.encrypt)
   */
  public async encrypt(plaintext: string): Promise<string> {
    return await this.encryptionService.encrypt(plaintext);
  }

  /**
   * Decrypt text using the vault (equivalent to EncryptionService.decrypt)
   */
  public async decrypt(encryptedData: string): Promise<string> {
    return await this.encryptionService.decrypt(encryptedData);
  }

  /**
   * Clear keys from memory (equivalent to EncryptionService.clearKey)
   */
  public clearKeys(): void {
    this.encryptionService.clearKey();
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
    return this.encryptionService.isKeySet();
  }

  /**
   * Encrypt file (fallback to legacy implementation)
   */
  public async encryptFile(file: File): Promise<File> {
    return await this.encryptionService.encryptFile(file);
  }

  /**
   * Decrypt file (fallback to legacy implementation)
   */
  public async decryptFile(file: File): Promise<File> {
    return await this.encryptionService.decryptFile(file);
  }
}

// React hook for easy integration
export function useVaultIntegration(): VaultIntegration {
  const vault = useVault();
  const [integration] = React.useState(() => new VaultIntegration());
  
  React.useEffect(() => {
    console.log("useVaultIntegrationContext useEffect");
    integration.setVault(vault);
  }, [vault.state.isReady, integration]);
  
  return integration;
}

// Context for vault integration
const VaultIntegrationContext = React.createContext<VaultIntegration | null>(null);

// Provider component for vault integration
export function VaultIntegrationProvider({ children }: { children: React.ReactNode }) {
  const integration = useVaultIntegration();
  
  return (
    <VaultIntegrationContext.Provider value={integration}>
      {children}
    </VaultIntegrationContext.Provider>
  );
}

// Hook to use vault integration from context
export function useVaultIntegrationContext(): VaultIntegration {
  console.log("useVaultIntegrationContext");
  const context = React.useContext(VaultIntegrationContext);
  if (!context) {
    throw new Error('useVaultIntegrationContext must be used within VaultIntegrationProvider');
  }
  return context;
} 