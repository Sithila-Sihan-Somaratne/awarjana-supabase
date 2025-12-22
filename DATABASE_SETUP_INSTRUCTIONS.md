# Database Setup Instructions

**CRITICAL**: You must complete this setup before the application will work!

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: **yqqzdkhelrzxhniygoxd**
3. Click on **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Run the Database Setup Script

1. Open the file `database_setup.sql` in this project
2. **Copy the ENTIRE contents** of that file
3. **Paste it into the Supabase SQL Editor**
4. Click **Run** (or press Ctrl+Enter)

**Expected result**: You should see "Success. No rows returned"

### Step 3: Verify Tables Were Created

1. Click on **Table Editor** in the left sidebar
2. You should see these tables:
   - ✅ `users`
   - ✅ `materials`
   - ✅ `orders`
   - ✅ `order_materials`
   - ✅ `job_cards`
   - ✅ `drafts`
   - ✅ `registration_codes`

### Step 4: Verify RLS Policies

1. Click on **Authentication** → **Policies** in the left sidebar
2. You should see multiple policies for each table
3. All tables should show "RLS enabled"

---

## 🔐 Generate Registration Codes (For Worker/Admin Signup)

### Option 1: Using the Script (Recommended)

1. Open terminal in the project directory
2. Run:
   ```bash
   node generate-codes.js admin 2
   ```
3. Copy the **SQL output** shown in the terminal
4. Paste it into Supabase SQL Editor and run it
5. **SAVE THE PLAIN CODES** - you'll need them for signup!

### Option 2: Manual Creation

1. Go to Supabase **Table Editor** → `registration_codes`
2. Click **Insert** → **Insert row**
3. Fill in:
   - `code`: (generate a SHA-256 hash of your desired code)
   - `role`: `admin` or `worker`
   - `is_used`: `false`
4. Click **Save**

**Note**: For manual creation, you need to hash your code first. Use the script instead!

---

## ✅ Verification Checklist

Before testing the app, verify:

- [ ] All 7 tables exist in Table Editor
- [ ] RLS is enabled on all tables (check Policies)
- [ ] Sample materials are inserted (check `materials` table)
- [ ] At least one registration code exists (for testing admin/worker signup)
- [ ] Database trigger `on_auth_user_created` exists (check Functions)

---

## 🧪 Test the Setup

### Test 1: Customer Signup (No Code Required)

1. Go to the app: http://localhost:3000/signup
2. Enter:
   - Email: `test@example.com`
   - Account Type: **Customer**
   - Password: `Test123!@#`
   - Confirm Password: `Test123!@#`
3. Click **Continue to Verification**
4. Check your email for the OTP code
5. Enter the 8-character code
6. You should be redirected to login

### Test 2: Check User Record

1. Go to Supabase **Table Editor** → `users`
2. You should see your test user with:
   - Email: `test@example.com`
   - Role: `customer`

### Test 3: Login

1. Go to http://localhost:3000/login
2. Enter your email and password
3. Click **Sign In**
4. You should see the dashboard

---

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"

**Solution**: Make sure `.env` file exists with:
```
VITE_SUPABASE_URL=https://yqqzdkhelrzxhniygoxd.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Error: "relation 'users' does not exist"

**Solution**: You didn't run the `database_setup.sql` script. Go back to Step 2.

### Error: "Invalid registration code"

**Solution**: 
1. Make sure you generated codes using `generate-codes.js`
2. Make sure you inserted the **hashed** code into the database
3. Make sure you're entering the **plain** code in the signup form

### Error: "Email not confirmed"

**Solution**:
1. Check your spam folder for the verification email
2. Make sure email confirmation is enabled in Supabase:
   - Go to **Authentication** → **Providers** → **Email**
   - Check "Confirm email" is enabled
3. Try resending the OTP

### OTP Email Takes Too Long

**Solutions**:
1. Check spam folder
2. Wait 2-3 minutes (Supabase free tier can be slow)
3. Click "Didn't receive code?" to resend
4. Try a different email provider (Gmail works best)

### Error: "new row violates row-level security policy"

**Solution**: RLS policies aren't set up correctly. Re-run the entire `database_setup.sql` script.

---

## 📊 Database Schema Overview

### Core Tables

1. **users** - User profiles and roles
   - Links to `auth.users` (Supabase Auth)
   - Stores role: customer, worker, admin

2. **materials** - Available materials for orders
   - Pre-populated with sample data
   - Admins can add/edit

3. **orders** - Customer orders
   - Links to customer and assigned worker
   - Tracks status and deadlines

4. **order_materials** - Materials used in each order
   - Junction table for orders ↔ materials

5. **job_cards** - Worker assignments
   - Links orders to workers
   - Tracks work progress

6. **drafts** - Work submissions
   - Workers submit drafts for review
   - Admins approve/reject

7. **registration_codes** - Secure signup codes
   - SHA-256 hashed codes
   - One-time use for workers/admins

---

## 🔒 Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies:

- **Customers** can only see their own orders
- **Workers** can only see assigned orders
- **Admins** can see everything
- **Users** can only edit their own profile

### Automatic User Creation

When a user signs up via Supabase Auth:
1. Record created in `auth.users` (automatic)
2. Trigger fires: `on_auth_user_created`
3. Record created in `users` table (automatic)
4. User can now log in and access dashboard

---

## 🎯 Next Steps After Setup

1. ✅ Complete database setup (this guide)
2. ✅ Test customer signup and login
3. ✅ Generate admin registration code
4. ✅ Test admin signup with code
5. ✅ Test worker signup with code
6. 🚀 Start using the application!

---

## 📞 Need Help?

If you're stuck:

1. Check the browser console (F12) for errors
2. Check Supabase logs: **Logs** → **Auth** or **Database**
3. Verify all steps in this guide were completed
4. Check `EMAIL_TROUBLESHOOTING.md` for email issues
5. Review `CRITICAL_ISSUES_ANALYSIS.md` for known issues

---

**Setup Complete!** 🎉

Once you've run the SQL script and verified the tables exist, your application is ready to use!
