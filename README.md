# Panda Crypto Vault

A secure, sandbox-iframe cryptography layer for zero-knowledge web applications. This implementation demonstrates how to isolate cryptographic operations in a sandboxed iframe with strict Content Security Policy (CSP) for maximum security.

## 🔒 Security Architecture

### Core Security Principles

1. **Sandbox Isolation**: The vault runs in an iframe with `sandbox="allow-scripts"` - no same-origin access, no form submission, no navigation
2. **Strict CSP**: Content Security Policy prevents script injection and limits network access to only the API server
3. **Non-extractable Keys**: All cryptographic keys are marked as non-extractable in the Web Crypto API
4. **Rate Limiting**: Decrypt operations are limited to 100 per minute to prevent abuse
5. **Idle Timeout**: Keys are automatically cleared after 10 minutes of inactivity
6. **PostMessage Only**: Communication happens exclusively through structured PostMessage protocol

### Why This Architecture?

- **Zero Trust**: UI code cannot access vault memory, DOM, or storage
- **Key Isolation**: Cryptographic keys never leave the secure context
- **Attack Surface Reduction**: Minimal attack vectors through strict sandboxing
- **Audit Trail**: All operations are logged and can be monitored
- **Forward Security**: Keys are ephemeral and can be rotated frequently

## 🏗️ Project Structure

```
├── apps/
│   ├── ui/            # Main React SPA (port 3000)
│   └── vault/         # Sandboxed crypto vault (port 3001)
├── packages/
│   ├── crypto-core/   # Web Crypto API wrappers
│   └── shared-proto/  # PostMessage protocol types
└── services/
    └── api-server/    # Mock API for key derivation (port 3002)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation & Development

```bash
# Install all dependencies
npm install

# Start all services in development mode
npm run dev
```

This will start:
- **UI App**: http://localhost:3000 (main application)
- **Vault**: http://localhost:3001 (sandboxed iframe)
- **API Server**: http://localhost:3002 (key derivation service)

### What You'll See

1. The UI automatically creates a hidden sandboxed iframe
2. Establishes secure PostMessage communication with the vault
3. Demonstrates encrypt/decrypt round-trip with "hello world"
4. Shows real-time operation logs in the console view

### Manual Testing

Use the web interface to:
- Change the test message
- Manually trigger encrypt/decrypt operations
- View hex dumps of encrypted data
- Monitor the operation log for security events

## 🔧 Production Deployment

### Build for Production

```bash
# Build all components
npm run build

# Build individual apps
npm run build:ui
npm run build:vault
```

### Production Considerations

1. **Origin Separation**: Deploy vault and UI on different origins (e.g., `vault.panda.chat` vs `panda.chat`)
2. **CSP Headers**: Ensure strict CSP is enforced by the web server, not just meta tags
3. **HTTPS Only**: All communication must be over HTTPS in production
4. **Key Management**: Replace mock key derivation with proper HSM/KMS integration
5. **Session Management**: Implement proper session handling with HttpOnly cookies
6. **Monitoring**: Add security monitoring for rate limiting violations and suspicious activity

### Example Production CSP

```
Content-Security-Policy: default-src 'none'; script-src 'self'; connect-src https://api.panda.chat; base-uri 'none'; object-src 'none'; require-trusted-types-for 'script'
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Test individual packages
npm run test:crypto
npm run test:proto

# Lint all code
npm run lint
```

## 📡 API Reference

### Vault Methods

The vault exposes three main operations through PostMessage:

```typescript
// Initialize and derive master key
await vault.derive();

// Encrypt plaintext
const { ciphertext, iv } = await vault.encrypt("secret message");

// Decrypt ciphertext  
const plaintext = await vault.decrypt(ciphertext, iv);
```

### Security Limits

- **Rate Limiting**: 100 decrypt operations per minute
- **Idle Timeout**: 10 minutes of inactivity clears keys
- **Message Size**: No explicit limit, but practical limits apply
- **Concurrent Operations**: Requests are queued and processed sequentially

## 🔐 Cryptographic Details

### Algorithms Used

- **Symmetric Encryption**: AES-256-GCM with 96-bit random IV
- **Key Wrapping**: RSA-OAEP with SHA-256
- **Key Derivation**: Web Crypto API `generateKey()` for demo (HKDF in production)

### Key Lifecycle

1. **Generation**: AES keys generated server-side per session
2. **Wrapping**: Keys wrapped with device RSA public key  
3. **Transport**: Wrapped keys sent over HTTPS
4. **Unwrapping**: Vault unwraps with device private key
5. **Usage**: Non-extractable keys used for encrypt/decrypt
6. **Destruction**: Keys cleared on timeout or explicit request

## 🐛 Troubleshooting

### Common Issues

**Vault not initializing**
- Check browser console for CSP violations
- Verify all three services are running on correct ports
- Ensure CORS is properly configured

**CORS errors**
- API server is configured for localhost:3000 and localhost:3001
- Check that ports match your development setup

**TypeScript errors during development**
- Run `npm install` in the root directory to link workspace packages
- Restart your IDE/TypeScript server

**Rate limiting in development**
- The demo allows 100 decrypts per minute
- Wait for the rate limit to reset or restart the vault

### Security Testing

To verify the security model:

1. **XSS Protection**: Try injecting `<script>alert(1)</script>` in the UI - it cannot access vault memory
2. **CSP Enforcement**: Check browser DevTools for CSP violations
3. **Iframe Sandbox**: Verify the iframe has no same-origin privileges
4. **Rate Limiting**: Trigger 100+ decrypt operations to test throttling

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure all linting passes
5. Submit a pull request

---

**Security Note**: This is a demonstration implementation. For production use, conduct a thorough security audit, implement proper key management, and consider additional hardening measures based on your threat model.
