# Deployment Guide - Awarjana Creations

Complete guide to deploy your application to Netlify.

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you've completed:

- [x] Database setup in Supabase (run `database_setup.sql`)
- [x] Environment variables configured locally (`.env` file)
- [x] Application tested locally (`pnpm dev`)
- [x] At least one test user created
- [x] Registration codes generated (for worker/admin signup)

---

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository

1. **Commit all changes to Git**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Verify `.gitignore` includes**:
   ```
   node_modules/
   dist/
   .env
   .env.local
   ```

### Step 2: Connect to Netlify

1. Go to [Netlify](https://app.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** (or your Git provider)
4. Select your repository: `awarjana-supabase`
5. Authorize Netlify to access your repository

### Step 3: Configure Build Settings

Netlify should auto-detect these settings, but verify:

- **Base directory**: (leave empty)
- **Build command**: `pnpm install && pnpm build`
- **Publish directory**: `dist`
- **Node version**: 18

If not auto-detected, the `netlify.toml` file will handle it.

### Step 4: Add Environment Variables

**CRITICAL**: Add your Supabase credentials to Netlify!

1. In Netlify, go to **Site settings** → **Environment variables**
2. Click **"Add a variable"** and add:

   ```
   Key: VITE_SUPABASE_URL
   Value: https://yqqzdkhelrzxhniygoxd.supabase.co
   ```

3. Click **"Add a variable"** again:

   ```
   Key: VITE_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxcXpka2hlbHJ6eGhuaXlnb3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTYwMTksImV4cCI6MjA4MTc5MjAxOX0.rQCFQZcPw0Y6tOQc-XUNJ6N1ZVjzHY3GONTnLY6OFAQ
   ```

4. Click **"Save"**

### Step 5: Deploy!

1. Click **"Deploy site"**
2. Wait 2-3 minutes for build to complete
3. Netlify will provide a URL like: `https://your-site-name.netlify.app`

---

## 🔧 Post-Deployment Configuration

### Update Supabase Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Add your Netlify URL to:
   - **Site URL**: `https://your-site-name.netlify.app`
   - **Redirect URLs**: Add `https://your-site-name.netlify.app/**`

### Test Your Deployment

1. Visit your Netlify URL
2. Try signing up as a customer
3. Check email for OTP
4. Verify you can log in
5. Test creating an order

---

## 🐛 Troubleshooting Deployment Issues

### Build Fails

**Error**: `Command failed with exit code 1`

**Solutions**:
1. Check build logs in Netlify
2. Verify `package.json` has all dependencies
3. Try building locally: `pnpm build`
4. Check Node version matches (18)

### Environment Variables Not Working

**Error**: "Missing Supabase environment variables"

**Solutions**:
1. Verify variables are added in Netlify (Site settings → Environment variables)
2. Variable names must start with `VITE_` for Vite
3. Redeploy after adding variables
4. Check for typos in variable names

### Page Not Found (404)

**Error**: Refreshing page shows 404

**Solution**:
- The `netlify.toml` file handles this
- Verify `netlify.toml` exists in your repository
- Check redirect rules are present

### Authentication Not Working

**Error**: "Invalid redirect URL" or "Email not confirmed"

**Solutions**:
1. Add Netlify URL to Supabase redirect URLs
2. Check email confirmation is enabled in Supabase
3. Verify environment variables are correct
4. Clear browser cache and try again

### Database Errors

**Error**: "relation 'users' does not exist"

**Solution**:
- You didn't run the database setup script
- Go to Supabase SQL Editor
- Run the entire `database_setup.sql` script

---

## 📱 Custom Domain (Optional)

### Add Your Own Domain

1. In Netlify, go to **Domain settings**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `awarjana.com`)
4. Follow DNS configuration instructions
5. Netlify provides free SSL certificate

### Update Supabase After Domain Change

1. Go to Supabase **Authentication** → **URL Configuration**
2. Update **Site URL** to your custom domain
3. Update **Redirect URLs** to include your custom domain

---

## 🔄 Continuous Deployment

Netlify automatically deploys when you push to GitHub!

### How It Works

1. Make changes to your code
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. Netlify automatically detects the push
4. Builds and deploys your site
5. New version live in 2-3 minutes!

### Deploy Previews

- Every pull request gets a preview URL
- Test changes before merging
- Share preview with team for review

---

## 🎯 Performance Optimization

### Enable Netlify Features

1. **Asset Optimization**:
   - Go to **Site settings** → **Build & deploy** → **Post processing**
   - Enable "Bundle CSS" and "Minify JS"

2. **Prerendering** (optional):
   - For better SEO
   - Enable in Post processing

3. **Edge Functions** (advanced):
   - For server-side logic
   - Not needed for basic deployment

---

## 📊 Monitoring

### Netlify Analytics (Optional, Paid)

- Track page views
- Monitor performance
- See visitor locations

### Free Alternatives

1. **Google Analytics**:
   - Add tracking code to `index.html`
   - Track user behavior

2. **Supabase Logs**:
   - Monitor database queries
   - Check authentication events
   - View error logs

---

## 🔒 Security Best Practices

### Before Going Live

1. **Review RLS Policies**:
   - Ensure all tables have proper security
   - Test with different user roles
   - Verify customers can't see other's data

2. **Check Environment Variables**:
   - Never commit `.env` to Git
   - Use Netlify environment variables
   - Rotate keys if accidentally exposed

3. **Enable Email Verification**:
   - Required for production
   - Prevents spam accounts
   - Already configured in your setup

4. **Set Up Rate Limiting** (Advanced):
   - Prevent abuse
   - Use Supabase rate limiting
   - Consider Cloudflare for DDoS protection

---

## 📝 Deployment Checklist

Use this checklist for each deployment:

- [ ] All changes committed to Git
- [ ] Tested locally (`pnpm dev`)
- [ ] Database schema up to date
- [ ] Environment variables configured in Netlify
- [ ] Supabase redirect URLs updated
- [ ] Build succeeds in Netlify
- [ ] Can sign up and log in
- [ ] Can create an order
- [ ] Mobile responsive (test on phone)
- [ ] Email verification works
- [ ] No console errors in browser

---

## 🆘 Getting Help

### Netlify Support

- [Netlify Docs](https://docs.netlify.com/)
- [Netlify Community](https://answers.netlify.com/)
- [Netlify Status](https://www.netlifystatus.com/)

### Supabase Support

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com/)
- [Supabase Status](https://status.supabase.com/)

### Project-Specific Issues

Check these files in your project:
- `CRITICAL_ISSUES_ANALYSIS.md` - Known issues and fixes
- `EMAIL_TROUBLESHOOTING.md` - Email delivery problems
- `DATABASE_SETUP_INSTRUCTIONS.md` - Database setup help

---

## 🎉 Success!

Your application is now live! 

**Next Steps**:
1. Share the URL with your team
2. Create admin and worker accounts
3. Start processing orders
4. Monitor for any issues
5. Iterate and improve!

---

**Deployment Complete!** 🚀

Your Awarjana Creations application is now accessible worldwide!
