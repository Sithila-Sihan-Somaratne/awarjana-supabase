# Complete Setup & Deployment Guide

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Supabase Configuration](#supabase-configuration)
3. [Database Setup](#database-setup)
4. [Environment Variables](#environment-variables)
5. [Testing](#testing)
6. [Deployment to Netlify](#deployment-to-netlify)
7. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites

- Node.js 16+ (check with `node --version`)
- npm or pnpm (we use pnpm)
- Git
- Supabase account (free at https://supabase.com)

### Step 1: Clone Repository

```bash
git clone https://github.com/Sithila-Sihan-Somaratne/awarjana-supabase.git
cd awarjana-supabase
```

### Step 2: Install Dependencies

```bash
pnpm install
# or
npm install
```

### Step 3: Create .env File

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials.

### Step 4: Start Development Server

```bash
pnpm dev
```

Open http://localhost:5173 in your browser.

---

## Supabase Configuration

### Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details
4. Wait for project to initialize (2-3 minutes)

### Step 2: Get API Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `USED URL`
   - **anon public key** → `KNOWN KEY`
3. Paste into `.env` file

### Step 3: Configure Email

1. Go to **Authentication** → **Email**
2. Enable "Confirm email"
3. Set expiry to 24 hours
4. Go to **Email Templates**
5. Customize templates (optional)

### Step 4: Set Up CORS

1. Go to **Settings** → **API**
2. Scroll to "CORS"
3. Add your domains:
   - `http://localhost:5173` (local)
   - `http://localhost:3000` (if using port 3000)
   - `https://yourdomain.com` (production)

---

## Database Setup

### Step 1: Create Tables

1. Go to Supabase Dashboard
2. Click **SQL Editor**
3. Click **New Query**
4. Copy and paste SQL from `database-setup.sql`
5. Click **Run**

### Step 2: Verify Tables

Run this query to verify:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see:
- `users`
- `registration_codes`
- `code_usage_logs`
- `password_reset_logs`

### Step 3: Insert Registration Codes

```sql
-- Admin code (change to your own!)
INSERT INTO registration_codes (code, role, is_used) VALUES
  ('8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'admin', false);

-- Worker code (change to your own!)
INSERT INTO registration_codes (code, role, is_used) VALUES
  ('5e884898da28047151d0e56f8dc62927e8d0686b1b9f4b1b9b6b8d8c8d8c8d8c', 'worker', false);
```

**To generate your own codes:**

```bash
# Using Node.js
node -e "console.log(require('crypto').createHash('sha256').update('your-code-here').digest('hex'))"
```

---

## Environment Variables

### Required Variables

Add them, remember!

### Optional Variables

```env
# For development
VITE_DEBUG=true  # Enable debug logging
```

### Never Commit

- `.env` (contains secrets)
- `.env.local`
- Supabase keys

These are already in `.gitignore`.

---

## Testing

### Test Signup Flow

1. Go to http://localhost:5173/signup
2. Select "Customer"
3. Enter email and password
4. Click "Sign Up"
5. Check email for verification code
6. Enter code on verification page
7. Should redirect to login

### Test Worker/Admin Signup

1. Go to signup page
2. Select "Worker" or "Admin"
3. Enter registration code: `admin-master-2024` or `worker-master-2024`
4. Complete signup
5. Verify email
6. Login

### Test Password Reset

1. Go to login page
2. Click "Forgot password?"
3. Enter email
4. Check email for reset link
5. Click link
6. Enter new password
7. Should redirect to login

### Test with Different Emails

- Gmail: Fast delivery
- Outlook: Usually fast
- Corporate email: May be slower
- Temporary email: Often blocked

---

## Deployment to Netlify

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Connect to Netlify

1. Go to https://netlify.com
2. Click "Add new site"
3. Select "Import an existing project"
4. Choose GitHub
5. Select your repository
6. Click "Deploy"

### Step 3: Configure Build Settings

Netlify should auto-detect:
- **Build command**: `pnpm build`
- **Publish directory**: `dist`

If not, set manually in **Site settings** → **Build & deploy** → **Build settings**

### Step 4: Add Environment Variables

1. Go to **Site settings** → **Build & deploy** → **Environment**
2. Add enviroment variables.
3. Click "Deploy site"

### Step 5: Update Supabase CORS

1. Go to Supabase Dashboard
2. **Settings** → **API** → **CORS**
3. Add your Netlify domain:
   ```
   https://your-site.netlify.app
   ```

### Step 6: Configure Custom Domain (Optional)

1. In Netlify, go to **Domain settings**
2. Click "Add custom domain"
3. Follow instructions to update DNS
4. Update Supabase CORS with custom domain

---

## Troubleshooting

### Issue: "Supabase environment variables not found"

**Solution**:
1. Check `.env` file exists
2. Verify variable names are correct
3. Restart dev server: `pnpm dev`
4. Check browser console for errors

### Issue: "Email verification not working"

**Solution**:
1. Check spam folder
2. Verify Supabase email is configured
3. Check Supabase logs for errors
4. Try resending verification email
5. See `EMAIL_TROUBLESHOOTING.md`

### Issue: "Registration code rejected"

**Solution**:
1. Verify code is hashed correctly
2. Check code exists in database:
   ```sql
   SELECT * FROM registration_codes WHERE role = 'admin';
   ```
3. Verify role matches (admin/worker)
4. Check code hasn't been used

### Issue: "Password doesn't meet requirements"

**Solution**:
Password must have:
- ✅ 8+ characters
- ✅ Uppercase letter (A-Z)
- ✅ Lowercase letter (a-z)
- ✅ Number (0-9)
- ✅ Special character (!@#$%^&*)

Example: `MyPassword123!`

### Issue: "Netlify deployment fails"

**Solution**:
1. Check build logs in Netlify
2. Verify dependencies install: `pnpm install`
3. Check for TypeScript errors: `pnpm check`
4. Verify environment variables are set
5. Try rebuilding: **Deploys** → **Trigger deploy**

### Issue: "CORS error in production"

**Solution**:
1. Go to Supabase **Settings** → **API**
2. Add your Netlify domain to CORS whitelist
3. Redeploy to Netlify

---

## Performance Optimization

### 1. Build Optimization

```bash
# Check bundle size
pnpm build
# Output is in dist/ folder
```

### 2. Image Optimization

- Use WebP format when possible
- Compress images before upload
- Use lazy loading for images

### 3. Code Splitting

Already configured in Vite - no action needed.

### 4. Caching

Netlify automatically caches:
- Static assets (images, CSS, JS)
- HTML (with revalidation)

---

## Monitoring & Maintenance

### Check Supabase Health

1. Go to https://status.supabase.com/
2. Verify all systems are operational

### Monitor Email Delivery

1. Supabase Dashboard → **Logs** → **Auth**
2. Filter by email address
3. Check for errors

### Review User Activity

```sql
-- Recent signups
SELECT id, email, created_at FROM auth.users 
ORDER BY created_at DESC LIMIT 10;

-- Users by role
SELECT role, COUNT(*) FROM users GROUP BY role;
```

---

## Security Checklist

- [ ] Changed default registration codes
- [ ] Configured email templates
- [ ] Set up CORS properly
- [ ] Enabled HTTPS (automatic on Netlify)
- [ ] Reviewed Supabase security settings
- [ ] Set up password reset
- [ ] Tested email verification
- [ ] Tested role-based access
- [ ] Reviewed authentication flow
- [ ] Set up monitoring

---

## Next Steps

1. **Customize branding**
   - Update colors in `src/styles/`
   - Update logo and favicon
   - Customize email templates

2. **Add features**
   - Order management
   - Payment processing
   - Analytics dashboard

3. **Set up CI/CD**
   - Automated tests
   - Automated deployments
   - Code quality checks

4. **Monitor production**
   - Set up error tracking
   - Monitor performance
   - Track user metrics

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev
- **Netlify Docs**: https://docs.netlify.com
- **Email Troubleshooting**: See `EMAIL_TROUBLESHOOTING.md`

---

**Last Updated**: December 2024
**Version**: 1.0
