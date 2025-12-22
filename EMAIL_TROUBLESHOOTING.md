# Email Delivery Troubleshooting Guide

## Overview

This guide helps diagnose and fix slow email delivery issues in Awarjana Creations.

---

## Common Email Issues & Solutions

### 1. **Verification Email Takes Too Long to Arrive**

**Problem**: User signs up but doesn't receive verification email for 5+ minutes.

**Root Causes**:
- Supabase email service is experiencing delays
- Email is going to spam/junk folder
- Network connectivity issues
- Email provider rate limiting

**Solutions**:

#### Step 1: Check Spam/Junk Folder
- Look in spam, promotions, or junk folder
- Add sender to contacts to whitelist

#### Step 2: Resend Verification Email
- Click "Didn't receive code?" button
- System will retry with exponential backoff
- Wait 1-2 minutes for new email

#### Step 3: Check Supabase Configuration
1. Go to Supabase Dashboard
2. **Authentication** → **Email Templates**
3. Verify settings:
   - Email provider is configured
   - From address is valid
   - Reply-to is set correctly

#### Step 4: Check Email Provider Status
- Supabase uses SendGrid by default
- Check [SendGrid Status](https://status.sendgrid.com/)
- Check [Supabase Status](https://status.supabase.com/)

---

### 2. **"Email Not Confirmed" Error on Login**

**Problem**: User verified email but still gets error.

**Causes**:
- Verification didn't complete properly
- User clicked link but didn't wait for redirect
- Browser cache issues

**Solutions**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Try incognito/private window
3. Request new verification email
4. Check email verification status in Supabase:
   ```sql
   SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'user@example.com';
   ```

---

### 3. **Password Reset Email Not Received**

**Problem**: User clicks "Forgot Password" but doesn't get reset email.

**Solutions**:
1. Check spam folder
2. Verify email address is correct
3. Wait 2-3 minutes (email service may be slow)
4. Try again after 5 minutes
5. Check Supabase email configuration

---

### 4. **"Too Many Requests" Error**

**Problem**: User gets rate limit error when trying to resend.

**Causes**:
- Clicked resend button multiple times quickly
- Supabase rate limiting (60 requests per hour per email)

**Solutions**:
1. Wait 1 minute before resending
2. Check browser console for exact error
3. Try again after 5 minutes
4. Contact support if persistent

---

## Email Retry Logic

The application now includes **automatic retry logic** with exponential backoff:

```
Attempt 1: Immediate
Attempt 2: Wait 1 second, retry
Attempt 3: Wait 2 seconds, retry
Attempt 4: Wait 4 seconds, retry
```

This helps handle temporary email service delays automatically.

---

## Configuration Settings

Email settings are in `src/config/email.js`:

```javascript
EMAIL_CONFIG = {
  RETRY_ATTEMPTS: 3,           // Number of retries
  RETRY_INITIAL_DELAY: 1000,   // Start with 1 second
  OTP_LENGTH: 8,               // 8-character verification codes
  OTP_EXPIRY: 24 hours,        // Codes valid for 24 hours
}
```

---

## Supabase Email Configuration

### Enable Email Verification

1. Go to Supabase Dashboard
2. **Authentication** → **Providers** → **Email**
3. Enable "Confirm email"
4. Set "Confirm email link expires in": 24 hours

### Configure Email Templates

1. **Authentication** → **Email Templates**
2. Customize these templates:
   - **Confirm signup**: Verification email
   - **Reset password**: Password reset email
   - **Magic link**: (Optional)

### Test Email Delivery

1. Go to **Authentication** → **Users**
2. Create test user
3. Check if email arrives
4. If not, check Supabase logs:
   - **Logs** → **Auth** → Look for email errors

---

## Browser Console Debugging

Open browser console (F12) to see detailed logs:

```
🚀 [Request Signup OTP] Starting for: {email, role}
📧 [Request Signup OTP] Sending OTP email with retry logic...
🔄 [Retry] Attempt 1/4
⏳ [Retry] Waiting 1000ms before retry...
✅ [Request Signup OTP] OTP email sent to: user@example.com
```

**Red messages (❌)** = Errors
**Green messages (✅)** = Success
**Yellow messages (⏳)** = Waiting/Retrying

---

## Network Issues

### Check Internet Connection
```javascript
// In browser console:
navigator.onLine  // true if connected
```

### Test Supabase Connection
```javascript
// In browser console:
const { data } = await supabase.auth.getSession()
console.log(data)  // Should show current session
```

---

## Email Provider Limits

**Supabase Default (SendGrid)**:
- 60 emails per hour per recipient
- 100 emails per hour per sender
- Verification codes valid for 24 hours

**Workarounds**:
- Wait 1 hour before retrying same email
- Use different email address
- Contact Supabase support for higher limits

---

## Supabase Logs

Check what happened with emails:

1. Go to Supabase Dashboard
2. **Logs** → **Auth**
3. Filter by email address
4. Look for error messages

**Common errors**:
- `Invalid email`: Email format wrong
- `User already exists`: Email already registered
- `Rate limit exceeded`: Too many requests
- `SMTP error`: Email provider issue

---

## Fix Checklist

- [ ] Check spam/junk folder
- [ ] Try resending verification email
- [ ] Clear browser cache
- [ ] Check internet connection
- [ ] Verify email address is correct
- [ ] Wait 2-3 minutes for delivery
- [ ] Check Supabase email configuration
- [ ] Check Supabase status page
- [ ] Check browser console for errors
- [ ] Try incognito/private window
- [ ] Contact support if still failing

---

## Performance Tips

### Faster Email Delivery

1. **Use valid email domain**
   - Gmail, Outlook, Yahoo = fast
   - Corporate email = may be slower
   - Temporary email = often blocked

2. **Avoid peak hours**
   - Email slower 9am-5pm
   - Try signing up outside business hours

3. **Check network**
   - Use stable WiFi or mobile data
   - Avoid public WiFi if possible
   - Close other bandwidth-heavy apps

4. **Browser optimization**
   - Use modern browser (Chrome, Firefox, Safari, Edge)
   - Disable VPN/proxy if using
   - Disable browser extensions

---

## Advanced Debugging

### Enable Detailed Logging

Edit `src/contexts/AuthContext.jsx` to see more details:

```javascript
// Already enabled - check browser console (F12)
// Look for 🔐, 📧, ✅, ❌ emoji messages
```

### Monitor Network Requests

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try signing up
4. Look for requests to:
   - `supabase.co/auth/v1/signup`
   - `supabase.co/auth/v1/resend`
5. Check response status (should be 200)

### Check Supabase Realtime

```javascript
// In browser console:
const channel = supabase
  .channel('auth-events')
  .on('postgres_changes', { event: '*', schema: 'auth' }, payload => {
    console.log('Auth change:', payload)
  })
  .subscribe()
```

---

## Getting Help

If emails still aren't working:

1. **Check Supabase Status**: https://status.supabase.com/
2. **Check SendGrid Status**: https://status.sendgrid.com/
3. **Supabase Docs**: https://supabase.com/docs/guides/auth
4. **GitHub Issues**: Search existing issues
5. **Contact Support**: Supabase support portal

---

## Email Service Providers

If Supabase email is too slow, consider:

1. **SendGrid** (Supabase default)
   - Free tier: 100 emails/day
   - Reliable, good deliverability

2. **Mailgun**
   - Free tier: 5,000 emails/month
   - Good for testing

3. **Resend**
   - Designed for transactional email
   - Good for auth emails

4. **AWS SES**
   - Cheap at scale
   - Requires setup

---

**Last Updated**: December 2024
**Version**: 1.0
