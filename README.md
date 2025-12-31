# Awarjana Supabase - Photoframe Management System (2026 Edition)

A modern, production-ready web application for managing photoframe orders, inventory, and production workflow. Built with **React**, **Supabase**, and **Tailwind CSS** with **shadcn/ui** components.

## 🚀 Features

### 🔐 Authentication & Security
- **Supabase Auth** - Email/Password authentication with PKCE flow.
- **Email & SMS Verification** - Secure account verification via Email or SMS.
- **Role-based Access Control** - Distinct dashboards for Customer, Employer, and Admin roles.
- **Registration Codes** - Secure Employer and Admin signup with a system limit of 10 codes.
- **Session Tracker** - Logs login activity and user sessions for security monitoring.
- **Password Reset** - Secure forgot password flow with OTP verification.

### 👥 Customer Features
- **Order Management** - Place new orders with custom frame dimensions and material selection.
- **Real-time Costing** - Instant cost calculation based on selected materials.
- **Order Tracking** - Monitor order status and progress through a visual timeline.
- **Profile Management** - Update personal details, including phone and address.

### 🔨 Employer Features
- **Job Cards** - View and manage assigned production tasks.
- **Draft Submissions** - Submit work drafts for admin review with version control.
- **Material Tracking** - Monitor material usage and availability for assigned jobs.

### 👨‍💼 Admin Features
- **Central Dashboard** - Complete overview of orders, inventory, and system statistics.
- **Order Assignment** - Assign orders to specific employers and manage deadlines.
- **Inventory Management** - Track material stock levels with low-stock alerts.
- **Registration Code Control** - Generate, delete, and reset registration codes (Max 10).
- **User Management** - View and manage all system users and their roles.
- **Activity Logs** - Monitor system-wide user activity and sessions.

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Icons**: Lucide React
- **Package Manager**: pnpm

## 📦 Installation & Setup

### Prerequisites
- Node.js 20+
- pnpm 10+
- Supabase Project

### Setup Steps

1. **Clone the Project**
   ```bash
   git clone https://github.com/Sithila-Sihan-Somaratne/awarjana-supabase.git
   cd awarjana-supabase
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Variables**
   Create a `.env` file in the root:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   - Run the contents of `database_setup.sql` in your Supabase SQL Editor.
   - Apply security policies using `RLS_POLICIES_FIX.sql`.

5. **Run Development Server**
   ```bash
   pnpm dev
   ```

## 🚀 Deployment

The project is pre-configured for **Netlify** deployment.

1. Connect your repository to Netlify.
2. Set the environment variables in the Netlify dashboard.
3. The `netlify.toml` file handles the build and routing configuration automatically.

## 🔒 Security Note

- **Row Level Security (RLS)** is enabled on all tables.
- **Registration Codes** are hashed using SHA-256 before storage.
- **Session Tracking** is implemented to monitor unauthorized access.

## 📄 License

MIT License - 2026 Awarjana Creations.
