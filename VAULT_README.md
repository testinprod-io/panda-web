# Panda Vault - Sandbox-iframe Cryptography Layer

## Overview

The Panda Vault is a zero-knowledge cryptographic layer that isolates sensitive cryptographic operations in a sandboxed iframe, ensuring maximum security through browser isolation mechanisms.

## Architecture

### Security Model

The vault implements a three-layer security model:

1. **Origin Isolation**: The vault runs on a separate origin (`https://vault.panda.chat`) from the main application (`https://app.panda.chat`)
2. **Sandbox Isolation**: The iframe uses strict sandbox attributes (`allow-scripts` only) preventing same-origin access, form submission, navigation, etc.
3. **Cryptographic Isolation**: All cryptographic keys are non-extractable `CryptoKey` objects that cannot be read from memory

### Components

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Main SPA          │────▶│   Sandboxed Vault   │────▶│   API Server        │
│ (app.panda.chat)    │     │ (vault.panda.chat)  │     │ (api.panda.chat)    │
│                     │     │                     │     │                     │
│ • UI Logic          │     │ • Key Derivation    │     │ • Key Wrapping      │
│ • postMessage       │     │ • AES Encryption    │     │ • Authentication    │
│ • Business Logic    │     │ • Rate Limiting     │     │ • Session Management│
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

## Directory Structure

```
panda-web/
├── vault/                      # Standalone vault application
│   ├── index.html             # Minimal HTML with strict CSP
│   ├── vault.ts               # Core vault implementation
│   ├── package.json           # Vault-specific dependencies
│   └── tsconfig.json          # TypeScript configuration
├── src/
│   ├── types/vault.ts         # Shared protocol types
│   ├── crypto/core.ts         # Crypto utilities
│   ├── hooks/use-vault.ts     # React integration
│   └── components/vault-demo.tsx  # Test component
└── README.md                  # This file
```

## Security Features

### 1. Content Security Policy (CSP)

The vault operates under an extremely restrictive CSP:

```
default-src 'none'; 
script-src 'self'; 
connect-src https://api.panda.chat; 
base-uri 'none'; 
object-src 'none'; 
require-trusted-types-for 'script'
```

This prevents:
- Loading external scripts or resources
- Inline script execution
- Form submissions
- Object/embed usage
- Base URI manipulation

### 2. Iframe Sandbox

The iframe uses minimal sandbox permissions:

```html
<iframe sandbox="allow-scripts" src="https://vault.panda.chat"></iframe>
```

This prevents:
- Same-origin access (`allow-same-origin` not set)
- Navigation (`allow-top-navigation` not set)  
- Form submission (`allow-forms` not set)
- Popup creation (`allow-popups` not set)

### 3. Rate Limiting

The vault implements rate limiting to prevent abuse:
- Maximum 100 operations per minute
- Sliding window implementation
- Operations are throttled, not the origin

### 4. Idle Timeout

Keys are automatically cleared from memory:
- 10-minute idle timeout
- Timer resets on each operation
- Keys are non-recoverable once cleared

### 5. Non-extractable Keys

All cryptographic keys use Web Crypto API with `extractable: false`:
- Keys cannot be read from JavaScript
- Keys cannot be serialized or transmitted
- Keys remain in secure browser memory

## API Reference

### useVault Hook

```typescript
const vault = useVault();

// Check status
console.log(vault.state.isReady);    // boolean
console.log(vault.state.isLoading);  // boolean  
console.log(vault.state.error);      // string | null

// Derive encryption key from server
await vault.derive();

// Encrypt data
const { ciphertext, iv } = await vault.encrypt("hello world");

// Decrypt data
const plaintext = await vault.decrypt(ciphertext, iv);

// Reset vault (cleanup)
vault.reset();
```

### Message Protocol

The vault communicates via `postMessage` with a structured protocol:

```typescript
// Key derivation
{ id: "req_1", cmd: "derive" }
→ { id: "req_1", ok: true }

// Encryption
{ id: "req_2", cmd: "encrypt", plain: "hello" }
→ { id: "req_2", ciphertext: ArrayBuffer, iv: ArrayBuffer }

// Decryption  
{ id: "req_3", cmd: "decrypt", cipher: ArrayBuffer, iv: ArrayBuffer }
→ { id: "req_3", plain: "hello" }

// Error response
→ { id: "req_4", error: "key not derived" }
```

## Development Setup

### Prerequisites

- Node.js 18+
- Python 3 (for vault dev server)

### Installation

1. Install main app dependencies:
```bash
npm install
```

2. Install vault dependencies:
```bash
cd vault
npm install
```

### Development

Start both servers (main app + vault):
```bash
npm run dev
```

This starts:
- Main app on `http://localhost:3000`
- Vault server on `http://localhost:3001`

### Testing

1. Visit the test page: `http://localhost:3000/vault-test`
2. The demo will automatically run a round-trip encryption test
3. Check browser console for detailed logs

### Manual Testing

```typescript
// In browser console
const vault = useVault();

// Wait for ready state
// vault.state.isReady should be true

// Test encryption round-trip
await vault.derive();
const encrypted = await vault.encrypt("test data");
const decrypted = await vault.decrypt(encrypted.ciphertext, encrypted.iv);
console.log(decrypted === "test data"); // Should be true
```

## Build and Deploy

### Building for Production

```bash
npm run build
```

This will:
1. Build the vault TypeScript to JavaScript
2. Build the main Next.js application
3. Output vault files to `vault/dist/`

### Deployment

1. **Vault Deployment**: 
   - Deploy `vault/dist/` to `https://vault.panda.chat`
   - Ensure proper CORS and CSP headers
   - Use a static file server (no server-side rendering)

2. **Main App Deployment**:
   - Deploy Next.js app to `https://app.panda.chat`
   - Update CSP to allow vault origin
   - Ensure proper session cookie configuration

### Security Checklist

- [ ] Vault served from different origin than main app
- [ ] Vault CSP headers properly configured
- [ ] Iframe sandbox attributes set correctly
- [ ] No `allow-same-origin` in sandbox
- [ ] API cookies are `HttpOnly`, `Secure`, `SameSite=Strict`
- [ ] No third-party scripts in vault
- [ ] Rate limiting configured
- [ ] Idle timeout configured

## Security Considerations

### Threat Model

**Protected Against:**
- XSS attacks on main application cannot access vault keys
- CSRF attacks cannot trigger vault operations (no forms)
- Memory inspection cannot extract cryptographic keys
- Malicious scripts cannot access vault DOM or storage
- Session hijacking cannot directly access encryption keys

**Attack Vectors Considered:**
- Malicious iframe injection (prevented by CSP)
- postMessage tampering (mitigated by origin checking)
- Timing attacks (rate limiting provides some protection)
- Browser vulnerabilities (defense in depth)

### Limitations

- Relies on browser security model
- Vulnerable to browser bugs affecting Web Crypto API
- Not protection against physical access to unlocked device
- Vulnerable to advanced malware with browser exploit capabilities

### Best Practices

1. **Key Rotation**: Implement periodic key rotation
2. **Audit Logging**: Log all vault operations
3. **Monitoring**: Monitor for unusual vault usage patterns
4. **Updates**: Keep browser and dependencies updated
5. **Testing**: Regular security testing and penetration testing

## Troubleshooting

### Common Issues

**Vault not loading:**
- Check CSP headers allow vault origin
- Verify vault server is running on correct port/domain
- Check browser console for iframe loading errors

**postMessage not working:**
- Verify origin restrictions in message handlers
- Check that MessageChannel is properly established
- Ensure proper port transfer in init message

**Encryption failing:**
- Verify key derivation completed successfully
- Check that derive() was called before encrypt/decrypt
- Verify rate limiting not triggered

**Performance issues:**
- Check for excessive encrypt/decrypt operations
- Verify proper cleanup in component unmount
- Monitor for memory leaks in pending requests

### Debug Mode

Enable debug logging:

```typescript
// In browser console
localStorage.setItem('vault-debug', 'true');
```

This will enable additional console logging for troubleshooting.

## License

Proprietary - Panda Team