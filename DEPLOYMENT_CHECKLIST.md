# Deployment Checklist for Awarjana Creations

## Pre-Deployment Tasks

### 1. Database Setup ✓
- [x] Apply RLS policies from `RLS_POLICIES_FIX.sql`
- [ ] Verify all tables have correct policies
- [ ] Test registration code validation
- [ ] Create initial admin registration code
- [ ] Add sample materials to inventory

### 2. Supabase Configuration
- [ ] Update email templates with production URL
- [ ] Set Site URL to Netlify domain
- [ ] Add redirect URLs:
  - [ ] `https://your-site.netlify.app/**`
  - [ ] `http://localhost:5173/**` (for dev)
- [ ] Enable email confirmations
- [ ] Test email delivery

### 3. Environment Variables
- [ ] `VITE_SUPABASE_URL` set in Netlify
- [ ] `VITE_SUPABASE_ANON_KEY` set in Netlify
- [ ] Verify variables are correct

### 4. Code Review
- [x] All admin features completed
- [x] Dark/light mode implemented
- [x] Theme toggle working
- [x] RLS policies created
- [x] netlify.toml configured

## Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Production ready: Fixed 401 errors, completed admin features, added dark mode"
git push origin main
```

### 2. Connect to Netlify
- [ ] Create new site in Netlify
- [ ] Connect GitHub repository
- [ ] Configure build settings:
  - Build command: `pnpm install && pnpm build`
  - Publish directory: `dist`
  - Node version: 20.11.0

### 3. Add Environment Variables
- [ ] Add `VITE_SUPABASE_URL`
- [ ] Add `VITE_SUPABASE_ANON_KEY`

### 4. Deploy
- [ ] Trigger manual deploy
- [ ] Wait for build to complete
- [ ] Check build logs for errors

## Post-Deployment Testing

### Authentication Tests
- [ ] Navigate to signup page
- [ ] Create customer account
- [ ] Verify email with OTP
- [ ] Login successfully
- [ ] No 401 errors during registration
- [ ] Logout works

### Admin Registration
- [ ] Generate admin registration code in Supabase
- [ ] Sign up with admin code
- [ ] Verify admin access to all features

### Theme Testing
- [ ] Toggle dark/light mode
- [ ] Verify theme persists on refresh
- [ ] Check all pages in both themes
- [ ] No styling issues

### Admin Features
- [ ] Access Inventory Management
- [ ] Add a material
- [ ] Edit a material
- [ ] Delete a material
- [ ] Search and filter materials

- [ ] Access Registration Codes
- [ ] Generate worker codes
- [ ] Generate admin codes
- [ ] View code statistics
- [ ] Delete unused code

- [ ] Access User Management
- [ ] View all users
- [ ] Edit user role
- [ ] Verify user email manually
- [ ] Search and filter users

- [ ] Access Analytics & Reports
- [ ] View revenue metrics
- [ ] Check order statistics
- [ ] View user analytics
- [ ] Export report

### Customer Flow
- [ ] Login as customer
- [ ] Create new order
- [ ] View order details
- [ ] Track order status

### Worker Flow
- [ ] Login as worker
- [ ] View job cards
- [ ] Submit draft
- [ ] Track material usage

### Performance
- [ ] Run Lighthouse audit
- [ ] Check page load times
- [ ] Verify mobile responsiveness
- [ ] Test on different browsers

## Security Verification

- [ ] Check security headers in browser
- [ ] Verify HTTPS is enforced
- [ ] Test unauthorized access attempts
- [ ] Verify RLS policies are working
- [ ] Check for exposed sensitive data

## Monitoring Setup

- [ ] Enable Netlify Analytics
- [ ] Monitor Supabase usage
- [ ] Set up error tracking (optional)
- [ ] Configure uptime monitoring (optional)

## Documentation

- [x] README.md updated
- [x] DEPLOYMENT_INSTRUCTIONS.md created
- [x] PROJECT_SUMMARY.md created
- [x] RLS_POLICIES_FIX.sql created
- [ ] Update any API documentation

## Backup & Recovery

- [ ] Verify Supabase automatic backups
- [ ] Export initial database schema
- [ ] Document recovery procedures
- [ ] Save admin credentials securely

## Final Checks

- [ ] All features working as expected
- [ ] No console errors
- [ ] No broken links
- [ ] All images loading
- [ ] Forms submitting correctly
- [ ] Responsive on mobile
- [ ] Cross-browser compatible

## Go Live

- [ ] Update DNS (if custom domain)
- [ ] Announce launch
- [ ] Monitor for issues
- [ ] Be ready for support

## Post-Launch

- [ ] Monitor error logs daily
- [ ] Check user feedback
- [ ] Plan next features
- [ ] Schedule regular backups

---

## Quick Commands

### Local Development
```bash
cd awarjana-supabase
pnpm install
pnpm dev
```

### Build Test
```bash
pnpm build
pnpm preview
```

### Deploy to Netlify
```bash
netlify deploy --prod
```

---

## Emergency Contacts

- Supabase Support: https://supabase.com/support
- Netlify Support: https://www.netlify.com/support/
- GitHub Issues: [Your repo]/issues

---

**Status:** Ready for Deployment
**Last Updated:** December 28, 2024
