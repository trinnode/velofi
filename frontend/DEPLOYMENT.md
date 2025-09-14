# VeloFi Frontend Deployment Guide

## Vercel Deployment

### Environment Variables Required

When deploying to Vercel, make sure to set these environment variables in your Vercel dashboard:

```bash
# Feature Flags
NEXT_PUBLIC_GOVERNANCE_ENABLED=true
NEXT_PUBLIC_LENDING_ENABLED=true
NEXT_PUBLIC_DEX_ENABLED=true
NEXT_PUBLIC_CREDIT_SCORING_ENABLED=true

# Web3 Configuration
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=demo-project-id
NEXT_PUBLIC_ENABLE_TESTNETS=true

# RPC Configuration
NEXT_PUBLIC_SOMNIA_RPC_URL=https://testnet-rpc.somnia.network
NEXT_PUBLIC_SOMNIA_EXPLORER_URL=https://testnet-explorer.somnia.network

# App Configuration
NEXT_PUBLIC_APP_NAME=VeloFi
NEXT_PUBLIC_APP_VERSION=1.0.0

# Production
NODE_ENV=production
```

### Deployment Steps

1. **Push your code to a Git repository** (GitHub, GitLab, etc.)

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Select the `frontend` folder as the root directory

3. **Configure Environment Variables:**
   - In Vercel dashboard, go to Settings > Environment Variables
   - Add all the variables listed above

4. **Deploy:**
   - Vercel will automatically detect Next.js and use the correct build settings
   - The `vercel.json` file will ensure proper configuration

### Troubleshooting

If you encounter deployment errors:

1. **Check Build Logs:** Look for specific error messages in Vercel's deployment logs
2. **Environment Variables:** Ensure all required env vars are set
3. **Node.js Version:** Vercel uses Node.js 20.x by default (matches our configuration)
4. **Build Command:** Should be `npm run build` (configured in vercel.json)

### Local Testing

To test the production build locally:

```bash
npm run build
npm start
```

### Error ID Reference

If you see error ID `mfjn6uxzatzak9djz6g` or similar:
- This usually indicates a runtime error during static generation
- Check that all environment variables are properly set
- Ensure no server-side only code is running during static generation