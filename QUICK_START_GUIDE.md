# Quick Start Guide - Awarjana Creations

**Get your application running in 5 minutes!**

---

## 🚀 Step 1: Set Up Database (3 minutes)

1.  **Go to Supabase SQL Editor**:
    *   [https://supabase.com/dashboard/project/yqqzdkhelrzxhniygoxd/sql](https://supabase.com/dashboard/project/yqqzdkhelrzxhniygoxd/sql)
2.  **Run the Setup Script**:
    *   Open `database_setup.sql` in this project.
    *   Copy the **entire contents**.
    *   Paste into the SQL editor and click **Run**.

**This creates all tables, security policies, and sample data.**

---

## 🔐 Step 2: Generate Admin Code (1 minute)

1.  **Open a terminal** in the project folder.
2.  **Run this command**:

    ```bash
    node generate-codes.js admin 1
    ```

3.  **Copy the SQL output** and run it in the Supabase SQL Editor.
4.  **Save the PLAIN CODE** - you'll need it to create your admin account.

---

## 💻 Step 3: Run Locally (1 minute)

1.  **Install dependencies**:

    ```bash
    pnpm install
    ```

2.  **Start the development server**:

    ```bash
    pnpm dev
    ```

3.  **Open in your browser**: [http://localhost:3000](http://localhost:3000)

---

## 🎉 Step 4: Create Your Admin Account

1.  Go to [http://localhost:3000/signup](http://localhost:3000/signup)
2.  Fill in your details:
    *   **Account Type**: `Admin`
    *   **Registration Code**: (Enter the plain code from Step 2)
3.  Verify your email with the OTP.
4.  Log in and start managing your application!

---

## 🚀 Next Steps

*   **Deploy to Netlify**: Follow the `DEPLOYMENT_GUIDE.md` for step-by-step instructions.
*   **Explore Features**: Create customer orders, manage materials, and explore the admin dashboard.
*   **Review Documentation**: Check out `FIXES_APPLIED.md` to see all the improvements made.

**That's it! Your application is ready to use.**
