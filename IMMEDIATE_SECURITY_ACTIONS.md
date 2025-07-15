# Immediate Security Actions Required

**CRITICAL: These issues MUST be fixed before open sourcing**

## 1. Remove Sensitive Console Logging 🚨

### Files to Clean:
- `vault/server.js` - Remove all access token logging
- `vault/vault.ts` - Remove password operation logging  
- `src/sdk/PandaSDK.ts` - Remove stack trace logging
- All other files with sensitive console outputs

### Action:
```javascript
// Replace with environment-gated logging
if (process.env.NODE_ENV === 'development') {
  console.log('[Debug] Non-sensitive operation details only');
}
```

## 2. Fix Hardcoded Development URLs 🚨

### Files to Fix:
- `src/hooks/use-vault.ts:167` - Remove hardcoded localhost
- `vault/index.html` - Remove localhost from CSP

### Action:
```javascript
// Use proper environment variables
const vaultOrigin = process.env.NEXT_PUBLIC_VAULT_ENDPOINT || 
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '');
```

## 3. Sanitize Error Messages 🚨

### Files to Review:
- All API error handling code
- Environment variable validation

### Action:
```javascript
// Don't expose configuration details
if (!privyAppId) {
  console.error('Required configuration missing');
  // Log detailed error server-side only
}
```

## Quick Security Checklist

- [ ] **Search and remove ALL console.log with sensitive data**
- [ ] **Replace hardcoded localhost URLs with environment variables**
- [ ] **Add production environment checks for all development features**
- [ ] **Review and sanitize all error messages**
- [ ] **Test application with production environment settings**
- [ ] **Add security headers to next.config.ts**
- [ ] **Enable ESLint for production builds**
- [ ] **Bundle CryptoJS locally instead of using CDN**

## Search Commands to Find Issues

```bash
# Find console logs that might be sensitive
grep -r "console\." --include="*.js" --include="*.ts" --include="*.tsx" .

# Find hardcoded localhost
grep -r "localhost" --include="*.js" --include="*.ts" --include="*.tsx" .

# Find environment variable logging
grep -r "process\.env" --include="*.js" --include="*.ts" --include="*.tsx" .
```

## Estimated Time: 4-6 hours

These are the absolute minimum changes required for security before open sourcing. The comprehensive security report contains additional improvements that should be addressed in subsequent releases.