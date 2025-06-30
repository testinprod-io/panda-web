// Tests for crypto-core functionality
import {
  aesEncrypt,
  aesDecrypt,
  generateAesKey,
  generateRsaKeyPair,
  wrapKey,
  unwrapKey,
  bufferToBase64,
  base64ToBuffer,
} from './index';

describe('Crypto Core', () => {
  describe('AES Operations', () => {
    test('should encrypt and decrypt data correctly', async () => {
      const key = await generateAesKey();
      const plaintext = 'Hello, World!';
      
      const encrypted = await aesEncrypt(key, plaintext);
      const decrypted = await aesDecrypt(key, encrypted.ciphertext, encrypted.iv);
      
      expect(decrypted).toBe(plaintext);
    });

    test('should generate different IVs for each encryption', async () => {
      const key = await generateAesKey();
      const plaintext = 'Same message';
      
      const encrypted1 = await aesEncrypt(key, plaintext);
      const encrypted2 = await aesEncrypt(key, plaintext);
      
      expect(encrypted1.iv).not.toEqual(encrypted2.iv);
      expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
    });

    test('should fail with wrong key', async () => {
      const key1 = await generateAesKey();
      const key2 = await generateAesKey();
      const plaintext = 'Secret message';
      
      const encrypted = await aesEncrypt(key1, plaintext);
      
      await expect(aesDecrypt(key2, encrypted.ciphertext, encrypted.iv))
        .rejects.toThrow();
    });
  });

  describe('Key Wrapping', () => {
    test('should wrap and unwrap keys correctly', async () => {
      const rsaKeyPair = await generateRsaKeyPair();
      const aesKey = await generateAesKey();
      
      const wrapped = await wrapKey(aesKey, rsaKeyPair.publicKey);
      const unwrapped = await unwrapKey(wrapped, rsaKeyPair.privateKey);
      
      // Test that the unwrapped key can decrypt data encrypted with original key
      const testData = 'Test encryption';
      const encrypted = await aesEncrypt(aesKey, testData);
      const decrypted = await aesDecrypt(unwrapped, encrypted.ciphertext, encrypted.iv);
      
      expect(decrypted).toBe(testData);
    });

    test('should create non-extractable unwrapped keys', async () => {
      const rsaKeyPair = await generateRsaKeyPair();
      const aesKey = await generateAesKey();
      
      const wrapped = await wrapKey(aesKey, rsaKeyPair.publicKey);
      const unwrapped = await unwrapKey(wrapped, rsaKeyPair.privateKey);
      
      expect(unwrapped.extractable).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    test('should convert buffer to base64 and back', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5]);
      const base64 = bufferToBase64(original.buffer);
      const converted = base64ToBuffer(base64);
      
      expect(new Uint8Array(converted)).toEqual(original);
    });

    test('should handle empty buffers', () => {
      const empty = new ArrayBuffer(0);
      const base64 = bufferToBase64(empty);
      const converted = base64ToBuffer(base64);
      
      expect(converted.byteLength).toBe(0);
    });
  });

  describe('Key Generation', () => {
    test('should generate valid AES keys', async () => {
      const key = await generateAesKey();
      
      expect(key.algorithm.name).toBe('AES-GCM');
      expect((key.algorithm as any).length).toBe(256);
      expect(key.extractable).toBe(true);
      expect(key.usages).toContain('encrypt');
      expect(key.usages).toContain('decrypt');
    });

    test('should generate valid RSA key pairs', async () => {
      const keyPair = await generateRsaKeyPair();
      
      expect(keyPair.publicKey.algorithm.name).toBe('RSA-OAEP');
      expect(keyPair.privateKey.algorithm.name).toBe('RSA-OAEP');
      expect((keyPair.publicKey.algorithm as any).modulusLength).toBe(2048);
      expect(keyPair.publicKey.usages).toContain('wrapKey');
      expect(keyPair.privateKey.usages).toContain('unwrapKey');
    });
  });
});