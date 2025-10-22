# 🚀 Vercel Deployment Guide - FitCoach Pro

## Pre-Deployment Checklist

### 1. Environment Variables Setup

Create a `.env.local` file (if not already present) with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your_google_analytics_id

# Optional: Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### 2. Build Test Locally

```bash
npm run build
npm start
```

Test the production build locally to catch any build errors.

### 3. Update `next.config.js`

Make sure your `next.config.js` has:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "usmemrjcjsexwterrble.supabase.co", // Your Supabase storage
      // Add any other image domains
    ],
  },
  // Remove trailing slashes
  trailingSlash: false,

  // Optimize for production
  swcMinify: true,

  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

module.exports = nextConfig;
```

### 4. Check `.gitignore`

Ensure these are in `.gitignore`:

```
.env*.local
.env.production
.vercel
node_modules/
.next/
out/
```

---

## Deployment Steps

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your `DailyFitness` repository
5. Configure project:

   - **Framework Preset**: Next.js
   - **Root Directory**: `dailyfitness-app`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

6. Add Environment Variables:

   - Click "Environment Variables"
   - Add each variable from your `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Make sure they're available for all environments (Production, Preview, Development)

7. Click "Deploy"

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Navigate to your app directory
cd dailyfitness-app

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy: Y
# - Which scope: Your account
# - Link to existing project: N (first time)
# - Project name: fitcoach-pro (or your choice)
# - In which directory is your code located: ./
# - Want to override settings: N

# For production deployment
vercel --prod
```

### Step 3: Configure Vercel Project Settings

After deployment, in Vercel dashboard:

1. **Environment Variables**

   - Verify all env vars are set
   - Add any additional ones needed

2. **Domains**

   - Add your custom domain (if you have one)
   - Configure DNS settings

3. **Git Integration**
   - Ensure auto-deployments are enabled
   - Configure branch deployment rules

---

## Post-Deployment Configuration

### 1. Update Supabase Settings

In your Supabase project dashboard:

1. Go to **Authentication > URL Configuration**
2. Add your Vercel URL to **Site URL**: `https://your-app.vercel.app`
3. Add to **Redirect URLs**:
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/**` (wildcard)

### 2. Test Authentication

1. Visit your deployed app
2. Try signing up
3. Try signing in
4. Check email verification
5. Test password reset

### 3. Test Core Features

- [ ] Sign up / Sign in
- [ ] Coach dashboard loads
- [ ] Client dashboard loads
- [ ] Create exercise
- [ ] Create workout
- [ ] Assign workout
- [ ] View workout as client
- [ ] Start workout
- [ ] Log nutrition
- [ ] Book session
- [ ] Dark mode toggle
- [ ] Mobile responsiveness

---

## Common Issues & Solutions

### Issue: Build Fails

**Error**: `Module not found` or `Cannot find module`

**Solution**:

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Environment Variables Not Working

**Error**: `undefined` for env variables

**Solution**:

- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding env vars in Vercel dashboard
- Check spelling/case sensitivity

### Issue: Images Not Loading

**Error**: 403 or CORS errors for images

**Solution**:

- Add Supabase domain to `next.config.js` images.domains
- Update Supabase Storage CORS settings
- Ensure RLS policies allow public read for storage buckets

### Issue: Authentication Redirect Errors

**Error**: `Invalid redirect URL`

**Solution**:

- Add Vercel URL to Supabase redirect URLs
- Check for trailing slashes consistency
- Ensure NEXT_PUBLIC_SUPABASE_URL is correct

### Issue: API Routes 404

**Error**: API routes not found in production

**Solution**:

- Ensure API routes are in `app/api/` directory (App Router)
- Check file naming (must be `route.ts` for App Router)
- Verify routes are exported correctly

---

## Performance Optimization

### 1. Image Optimization

Already handled by Next.js Image component. Ensure you're using:

```tsx
import Image from "next/image";
<Image src={src} alt={alt} width={width} height={height} />;
```

### 2. Code Splitting

Next.js handles this automatically. For additional optimization:

```tsx
// Dynamic imports for large components
const LargeComponent = dynamic(() => import("./LargeComponent"), {
  loading: () => <p>Loading...</p>,
});
```

### 3. Caching Strategy

In `next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/:all*(svg|jpg|png)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ]
}
```

---

## Monitoring & Analytics

### 1. Vercel Analytics (Built-in)

Enable in Vercel dashboard:

- Project Settings > Analytics
- Free tier: 100k events/month

### 2. Error Monitoring (Optional)

Consider adding Sentry:

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### 3. Performance Monitoring

Vercel provides:

- Web Vitals
- Performance insights
- Real User Monitoring (RUM)

Access in: Project > Analytics tab

---

## Custom Domain Setup (Optional)

### 1. Purchase Domain

From providers like:

- Namecheap
- GoDaddy
- Google Domains
- Cloudflare

### 2. Add Domain in Vercel

1. Project Settings > Domains
2. Add your domain
3. Follow DNS configuration instructions

### 3. Configure DNS

Add these records:

**For root domain (example.com):**

```
Type: A
Name: @
Value: 76.76.21.21
```

**For www subdomain:**

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 4. Wait for Propagation

DNS changes can take 24-48 hours to propagate globally.

---

## Continuous Deployment

### Auto-Deploy on Push

Vercel automatically deploys when you push to:

- **main/master branch** → Production
- **Other branches** → Preview deployments

### Deploy Preview URLs

Every pull request gets a unique preview URL for testing.

---

## Security Checklist

- [ ] Environment variables are set (not hardcoded)
- [ ] `.env` files are in `.gitignore`
- [ ] Supabase RLS policies are enabled
- [ ] CORS is properly configured
- [ ] Authentication redirects are whitelisted
- [ ] Rate limiting considered (if needed)
- [ ] HTTPS is enforced (automatic with Vercel)

---

## Rollback Plan

If deployment has issues:

### Option 1: Redeploy Previous Version

In Vercel dashboard:

1. Go to Deployments
2. Find working deployment
3. Click "..." → Promote to Production

### Option 2: Git Revert

```bash
git revert HEAD
git push origin main
```

Vercel will auto-deploy the reverted version.

---

## Cost Estimation

### Vercel (Free Tier)

- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Preview deployments
- ⚠️ Serverless function execution limits

**If you exceed free tier**: ~$20/month for Pro

### Supabase (Free Tier)

- ✅ 500 MB database
- ✅ 1 GB file storage
- ✅ 2 GB bandwidth/month
- ✅ 50,000 monthly active users

**If you exceed free tier**: $25/month for Pro

### Total Monthly Cost (Starting)

- **Free**: $0/month (within limits)
- **Paid**: ~$45/month (if you upgrade both)

---

## Support & Resources

### Documentation

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)

### Community

- [Vercel Discord](https://vercel.com/discord)
- [Next.js Discord](https://discord.gg/nextjs)
- [Supabase Discord](https://discord.supabase.com)

---

## 🎉 Final Checklist

Before clicking "Deploy":

- [ ] Code is pushed to GitHub
- [ ] Build succeeds locally (`npm run build`)
- [ ] Environment variables documented
- [ ] Supabase project is production-ready
- [ ] Database schema is applied
- [ ] Test data created (optional)
- [ ] `.gitignore` is correct
- [ ] `next.config.js` is configured
- [ ] You have Vercel account
- [ ] Supabase redirect URLs ready to update

---

**You're ready to deploy! 🚀**

Click that deploy button and watch your app go live!

Questions? Issues? Check the troubleshooting section above or reach out to Vercel/Supabase support.

**Good luck! 💪**
