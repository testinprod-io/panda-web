# Panda Crypto Vault - Usage Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   cd apps/ui && npm install
   cd ../vault && npm install  
   cd ../../services/api-server && npm install
   ```

2. **Start all services:**
   ```bash
   # From project root
   npm run dev
   ```
   
   Or start individually:
   ```bash
   # Terminal 1 - API Server (port 3002)
   npm run dev:api
   
   # Terminal 2 - Vault (port 3001) 
   npm run dev:vault
   
   # Terminal 3 - UI App (port 3000)
   npm run dev:ui
   ```

3. **Open the demo:**
   Visit http://localhost:3000 in your browser

## What You'll See

- The app automatically creates a sandboxed iframe vault
- Demonstrates encrypt/decrypt round-trip with "hello world"
- Real-time operation logs show security events
- Manual testing interface for custom messages

## Security Features Demonstrated

✅ **Iframe Sandbox**: `sandbox="allow-scripts"` - no same-origin access  
✅ **Strict CSP**: Prevents script injection, limits network access  
✅ **Non-extractable Keys**: Cryptographic keys cannot be exported  
✅ **Rate Limiting**: Max 100 decrypts per minute  
✅ **Idle Timeout**: Keys cleared after 10 minutes inactivity  
✅ **PostMessage Only**: Structured communication protocol  

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI App        │    │   Vault         │    │   API Server    │
│   localhost:3000│◄──►│   localhost:3001│◄──►│   localhost:3002│
│                 │    │   (sandboxed)   │    │                 │
│   - React SPA   │    │   - AES encrypt │    │   - Key derive  │
│   - PostMessage │    │   - Rate limit  │    │   - RSA wrap    │
│   - UI Controls │    │   - Timeout     │    │   - Mock auth   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Testing Security

1. **XSS Protection**: Try injecting scripts in the UI - they cannot access vault memory
2. **CSP Enforcement**: Check browser DevTools for violations  
3. **Rate Limiting**: Trigger 100+ decrypts to test throttling
4. **Iframe Isolation**: Verify iframe has no same-origin privileges

⚠️ **Note**: This is a demonstration. Production use requires security audit and proper key management.