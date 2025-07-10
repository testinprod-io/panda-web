# Vercel Deployment Guide for Panda Vault

This guide explains how to deploy the Panda Vault to Vercel.

## Prerequisites

- Vercel account
- Environment variables configured

## Vercel Build Settings

### Project Settings

1. **Framework Preset**: None (or Node.js)
2. **Root Directory**: `vault` (if deploying the vault subdirectory)
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Install Command**: `npm install`

### Environment Variables

Configure these environment variables in your Vercel dashboard:

```bash
# Required
NEXT_PUBLIC_APP_SERVER_ENDPOINT=https://api.panda.chat
VERCEL_ENV=production

# Optional (for local development)
NODE_ENV=production
```

### Build Configuration

The `vercel.json` file in this directory contains:

- **Build Command**: Automatically runs TypeScript compilation and bundling
- **Static File Serving**: Serves compiled assets from the `dist` directory
- **API Routes**: Serverless functions for vault operations
- **CORS Configuration**: Proper headers for cross-origin requests

### API Endpoints

After deployment, the following endpoints will be available:

- `GET /health` - Health check endpoint
- `POST /api/vault/deriveKey` - Derive encryption keys
- `POST /api/vault/createEncryptedId` - Create encrypted user ID

## File Structure

```
vault/
├── api/                    # Vercel serverless functions
│   ├── _utils.js          # Shared utilities
│   ├── health.js          # Health check endpoint
│   └── vault/
│       ├── deriveKey.js   # Key derivation endpoint
│       └── createEncryptedId.js # Encrypted ID endpoint
├── dist/                  # Build output (generated)
├── src files...           # TypeScript source files
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies and build scripts
```

## Deployment Steps

### Option 1: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from the vault directory
cd vault
vercel

# Follow the prompts to configure your project
```

### Option 2: Using Git Integration

1. Connect your repository to Vercel
2. Set the root directory to `vault`
3. Configure the environment variables
4. Deploy automatically on git push

### Option 3: Manual Deployment

1. Run the build locally:
   ```bash
   cd vault
   npm install
   npm run build
   ```

2. Upload the project to Vercel dashboard
3. Configure environment variables
4. Deploy

## Security Considerations

- The vault is configured with strict CORS policies
- Only allows requests from `https://panda.chat` in production
- Uses Content Security Policy headers
- API functions validate authentication tokens

## Monitoring

- Use `/health` endpoint for health checks
- Monitor serverless function logs in Vercel dashboard
- Set up alerts for API failures

## Troubleshooting

### Common Issues

1. **Build Fails**: Check that all TypeScript files compile without errors
2. **API Routes 404**: Ensure the `api/` directory structure is correct
3. **CORS Errors**: Verify environment variables and allowed origins
4. **Authentication Fails**: Check that `NEXT_PUBLIC_APP_SERVER_ENDPOINT` is correctly set

### Debug Steps

1. Check build logs in Vercel dashboard
2. Test API endpoints using the `/health` endpoint
3. Verify environment variables are set correctly
4. Check function logs for detailed error messages

## Performance

- Static assets are served from Vercel's global CDN
- API functions have cold start optimization
- Maximum function duration is set to 30 seconds
- Bundle size is optimized through the concat step 