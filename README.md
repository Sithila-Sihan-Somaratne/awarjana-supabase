# Awarjana Supabase - Photoframe Management System

A modern, production-ready web application for managing photoframe orders, inventory, and production workflow. Built with **React**, **Supabase**, and **Tailwind CSS** with **shadcn/ui** components.

## 🚀 Features

### 🔐 Authentication
- **Supabase Auth** - Email/Password authentication
- **Email verification** - Secure account verification
- **Role-based access control** - Customer, Worker, Admin roles
- **Registration codes** - Secure Worker and Admin signup
- **Password reset** - Forgot password flow with OTP

### 👥 Customer Features
- Place new orders with custom frame dimensions
- Select materials and view real-time cost calculation
- Track order status and progress with timeline
- View order history and detailed information
- Submit drafts and receive feedback

### 🔨 Worker Features
- View assigned job cards
- Submit work drafts with version control
- Track material usage and availability
- Monitor deadlines and priorities
- Update job status in real-time

### 👨‍💼 Admin Features
- Complete order management dashboard
- Assign orders to workers
- Review and approve/reject drafts
- Manage material inventory with low stock alerts
- Generate registration codes for new users
- View analytics and reports
- Monitor system-wide statistics

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS + shadcn/ui utilities
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Icons**: Lucide React
- **Package Manager**: pnpm
- **Node Version**: 20+

## 📦 Installation

### Prerequisites
- Node.js 20+ and pnpm 10+
- Supabase account and project
- Modern web browser

### Setup Steps

1. **Clone or Extract Project**
   ```bash
   cd awarjana-supabase
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set Up Database Schema**
   
   In your Supabase dashboard SQL Editor, run the SQL from `database_setup.sql` to create all necessary tables.

5. **Apply Row Level Security Policies**
   
   Run the SQL from `RLS_POLICIES_FIX.sql` to set up proper security policies.

6. **Run Development Server**
   ```bash
   pnpm dev
   ```

   The application will open at `http://localhost:5173`

## 📁 Project Structure

```
awarjana-supabase/
├── src/
│   ├── components/
│   │   ├── common/          # Reusable components
│   │   ├── ThemeToggle.jsx  # Dark/Light mode toggle
│   │   └── ProtectedRoute.jsx
│   ├── contexts/
│   │   ├── AuthContext.jsx  # Authentication state
│   │   └── ThemeContext.jsx # Theme state
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── ForgotPassword.jsx
│   │   ├── dashboard/       # Role-based dashboards
│   │   └── ...
│   ├── lib/
│   │   ├── supabase.js      # Supabase client
│   │   ├── utils.js         # shadcn/ui utilities
│   │   ├── crypto.js        # Hashing utilities
│   │   └── email.js         # Email helpers
│   ├── styles/
│   │   └── index.css        # Global styles + shadcn/ui vars
│   ├── App.jsx
│   └── main.jsx
├── database_setup.sql       # Database schema
├── RLS_POLICIES_FIX.sql    # Security policies
├── netlify.toml            # Netlify deployment config
├── tailwind.config.js      # Tailwind + shadcn/ui config
├── vite.config.js
└── package.json
```

## 🎨 Design System

### Colors
- **Primary**: Yellow (#eab308) - Main action buttons, accents
- **Background**: 
  - Light: White (#ffffff)
  - Dark: Black (#121212)
- **Text**: 
  - Light: Dark gray (#0a0a0a)
  - Dark: White (#fafafa)
- **Status Colors**:
  - Success: Green (#22c55e)
  - Error: Red (#ef4444)
  - Warning: Orange (#f59e0b)
  - Info: Yellow (#eab308)

### shadcn/ui Integration
This project is configured to work seamlessly with shadcn/ui components:
- CSS variables for theming
- `cn()` utility function for class merging
- Tailwind CSS with proper configuration
- Dark mode support

## 🔒 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Secure authentication** - Supabase Auth with email verification
- **Registration codes** - SHA-256 hashed codes for role-based signup
- **Protected routes** - Client-side route protection
- **HTTPS only** - Secure communication
- **Content Security Policy** - XSS protection

## 🚀 Deployment to Netlify

The project includes a complete `netlify.toml` configuration:

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to Netlify dashboard
   - Click "New site from Git"
   - Select your repository
   - Netlify will auto-detect settings from `netlify.toml`

3. **Set Environment Variables**
   In Netlify dashboard, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. **Deploy**
   - Click "Deploy site"
   - Netlify will build and deploy automatically

## 📊 Database Schema

The application uses the following main tables:

- **users** - User profiles with roles
- **materials** - Inventory items
- **orders** - Customer orders
- **order_materials** - Materials per order
- **job_cards** - Worker assignments
- **drafts** - Work submissions
- **registration_codes** - Signup codes

All tables have proper RLS policies for security.

## 🔧 Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build

### Adding shadcn/ui Components

This project is ready for shadcn/ui components. To add components:

```bash
# Example: Add a button component
npx shadcn-ui@latest add button
```

The `cn()` utility and CSS variables are already configured.

## 📝 Usage

### First Time Setup

1. **Create Admin Account**
   - Generate a registration code in Supabase:
   ```sql
   INSERT INTO registration_codes (code, role, is_used)
   VALUES ('ADMIN-2024', 'admin', false);
   ```
   - Go to `/signup`
   - Select "Admin" role
   - Enter the registration code
   - Complete signup and verify email

2. **Login**
   - Go to `/login`
   - Enter credentials
   - Access your dashboard

### Customer Workflow

1. Sign up as Customer (no code needed)
2. Create new order with dimensions
3. Select materials
4. Choose deadline
5. Track order progress

### Worker Workflow

1. Sign up with Worker registration code
2. View assigned job cards
3. Start work and track materials
4. Submit drafts
5. Wait for admin review

### Admin Workflow

1. Sign up with Admin registration code
2. View all orders and statistics
3. Assign orders to workers
4. Review submitted drafts
5. Manage inventory
6. Generate registration codes

## 🐛 Troubleshooting

### "Missing Supabase environment variables"
- Check `.env` file exists and has correct values
- Restart dev server after changing `.env`

### "Email verification not working"
- Check Supabase email settings in project dashboard
- Verify email templates are configured
- Check spam folder

### "Can't login after signup"
- Verify email address
- Check user was created in Supabase Auth
- Check database user record exists

### "Styles not loading"
- Clear browser cache
- Restart dev server
- Check Tailwind CSS configuration

## 🎯 Future Enhancements

- [ ] Real-time order status updates with Supabase Realtime
- [ ] File upload for drafts using Supabase Storage
- [ ] PDF bill generation
- [ ] Email notifications for order updates
- [ ] Advanced analytics with charts
- [ ] Mobile app (React Native)
- [ ] Payment integration
- [ ] Barcode/QR code tracking
- [ ] Multi-language support

## 📚 Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [React Router Documentation](https://reactrouter.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Vite Documentation](https://vitejs.dev)

## 📄 License

MIT License - Feel free to use this project for personal or commercial purposes.

---

**Built with ❤️ using React, Supabase, Tailwind CSS, and shadcn/ui**

**Version**: 2.0.0 - Supabase Only Edition
