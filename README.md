# Awarjana Creations - Photoframe Management System

A modern web application for managing photoframe orders, inventory, and production workflow using React, Supabase, and Tailwind CSS.

## Features

### Authentication
- Email/Password authentication with Supabase
- Email verification
- Role-based access control (Customer, Worker, Admin)
- Registration codes for Worker and Admin signup

### Customer Features
- Place new orders with custom dimensions
- Select materials and view real-time cost calculation
- Track order status and progress
- View order history and details

### Worker Features
- View assigned job cards
- Submit work drafts
- Track material usage
- Monitor deadlines

### Admin Features
- Complete order management dashboard
- Assign orders to workers
- Review and approve/reject drafts
- Manage material inventory
- Generate registration codes
- Monitor low stock alerts
- View analytics and reports

## Tech Stack

- **Frontend**: React 18 + Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS + Custom CSS
- **Backend**: Supabase (Postgres + Auth + Realtime)
- **Icons**: Lucide React
- **Package Manager**: pnpm

## Installation

### Prerequisites
- Node.js 16+ and pnpm
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

3. **Configure Supabase**
   
   The `.env` file is already configured with your Supabase credentials:
   ```
   URL=url.com
   ANONKEY=AnonKEY
   ```

4. **Set Up Database Schema**
   
   In your Supabase dashboard, run these SQL queries to create the tables:

   ```sql
   -- Users table
   CREATE TABLE users (
     id UUID PRIMARY KEY REFERENCES auth.users(id),
     email TEXT UNIQUE NOT NULL,
     role TEXT CHECK (role IN ('customer', 'worker', 'admin')) DEFAULT 'customer',
     registration_code TEXT,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   -- Materials table
   CREATE TABLE materials (
     id BIGSERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     cost DECIMAL(10, 2) NOT NULL,
     stock_quantity INT DEFAULT 0,
     low_stock_threshold INT DEFAULT 10,
     unit TEXT,
     category TEXT,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   -- Orders table
   CREATE TABLE orders (
     id BIGSERIAL PRIMARY KEY,
     customer_id UUID REFERENCES users(id),
     order_number TEXT UNIQUE,
     height INT,
     width INT,
     height2 INT,
     width2 INT,
     cost DECIMAL(10, 2),
     status TEXT DEFAULT 'pending',
     deadline_type TEXT,
     requested_deadline TIMESTAMP,
     confirmed_deadline TIMESTAMP,
     assigned_worker_id UUID REFERENCES users(id),
     is_delayed BOOLEAN DEFAULT FALSE,
     delay_reason TEXT,
     refund_amount DECIMAL(10, 2),
     customer_notes TEXT,
     admin_notes TEXT,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW(),
     completed_at TIMESTAMP
   );

   -- Order Materials table
   CREATE TABLE order_materials (
     id BIGSERIAL PRIMARY KEY,
     order_id BIGINT REFERENCES orders(id),
     material_id BIGINT REFERENCES materials(id),
     quantity INT,
     cost_at_time DECIMAL(10, 2),
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Job Cards table
   CREATE TABLE job_cards (
     id BIGSERIAL PRIMARY KEY,
     order_id BIGINT REFERENCES orders(id),
     worker_id UUID REFERENCES users(id),
     status TEXT DEFAULT 'assigned',
     worker_notes TEXT,
     created_at TIMESTAMP DEFAULT NOW(),
     started_at TIMESTAMP,
     completed_at TIMESTAMP
   );

   -- Drafts table
   CREATE TABLE drafts (
     id BIGSERIAL PRIMARY KEY,
     job_card_id BIGINT REFERENCES job_cards(id),
     order_id BIGINT REFERENCES orders(id),
     worker_id UUID REFERENCES users(id),
     draft_url TEXT,
     version INT,
     status TEXT DEFAULT 'pending',
     reviewed_by UUID REFERENCES users(id),
     reviewed_at TIMESTAMP,
     review_comments TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Registration Codes table
   CREATE TABLE registration_codes (
     id BIGSERIAL PRIMARY KEY,
     code TEXT UNIQUE NOT NULL,
     role TEXT NOT NULL,
     is_used BOOLEAN DEFAULT FALSE,
     used_by UUID REFERENCES users(id),
     used_at TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

5. **Run Development Server**
   ```bash
   pnpm dev
   ```

   The application will open at `http://localhost:3000`

## Usage

### First Time Setup

1. **Create Account**
   - Go to `/signup`
   - Enter email and password
   - Select account type (Customer/Worker/Admin)
   - If Worker or Admin, enter registration code
   - Verify email address

2. **Login**
   - Go to `/login`
   - Enter credentials
   - Access your dashboard

### Customer Workflow

1. Login with customer account
2. Click "New Order" button
3. Enter frame dimensions
4. Select materials
5. Choose deadline type
6. Review and confirm price
7. Track order progress

### Worker Workflow

1. Login with worker account
2. View assigned job cards
3. Start work and track materials
4. Submit draft when complete
5. Wait for admin review

### Admin Workflow

1. Login with admin account
2. View all orders and stats
3. Assign orders to workers
4. Review submitted drafts
5. Manage materials and inventory
6. Generate registration codes

## Project Structure

```
awarjana-supabase/
├── src/
│   ├── components/
│   │   ├── Alert.jsx          # Alert/notification component
│   │   └── ProtectedRoute.jsx # Route protection wrapper
│   ├── contexts/
│   │   └── AuthContext.jsx    # Authentication state management
│   ├── pages/
│   │   ├── Login.jsx          # Login page
│   │   ├── Signup.jsx         # Signup page
│   │   └── Dashboard.jsx      # Main dashboard
│   ├── lib/
│   │   └── supabase.js        # Supabase client configuration
│   ├── styles/
│   │   └── index.css          # Global styles
│   ├── App.jsx                # Main app component with routing
│   └── main.jsx               # Entry point
├── index.html                 # HTML template
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS configuration
├── package.json              # Dependencies
├── .env                       # Environment variables
└── README.md                 # This file
```

## Design System

### Colors
- **Primary**: Yellow (#eab308) - Main action buttons, accents
- **Background**: Black (#000000) - Page background
- **Text**: White (#ffffff) - Primary text
- **Success**: Green (#22c55e) - Success messages
- **Error**: Red (#ef4444) - Error messages
- **Warning**: Orange (#f59e0b) - Warning messages
- **Info**: Yellow (#eab308) - Info messages

### Components
- **Cards**: Dark background with subtle borders
- **Buttons**: Primary (yellow), Secondary (gray), Danger (red), Success (green)
- **Inputs**: Dark background with yellow focus ring
- **Badges**: Color-coded status indicators
- **Alerts**: Dismissible notifications with icons

### Responsive Design
- Mobile-first approach
- Breakpoints: 640px (sm), 768px (md), 1024px (lg)
- Flexible grid layouts
- Touch-friendly buttons and inputs

## Routing

| Route | Purpose | Protected | Role |
|-------|---------|-----------|------|
| `/` | Root (redirects to dashboard) | No | - |
| `/login` | Login page | No | - |
| `/signup` | Signup page | No | - |
| `/dashboard` | Main dashboard | Yes | All |
| `/new-order` | Create new order | Yes | Customer |
| `/order/:id` | Order details | Yes | All |
| `/admin/materials` | Material management | Yes | Admin |
| `/admin/codes` | Registration codes | Yes | Admin |

## API Integration

All data operations use Supabase:

- **Authentication**: Supabase Auth (Email/Password)
- **Database**: Supabase Postgres
- **Realtime**: Supabase Realtime subscriptions (optional)
- **Email**: Supabase built-in email service

## Alerts & Notifications

The application includes comprehensive alert system:

- **Success**: Green alerts for successful operations
- **Error**: Red alerts for failures
- **Warning**: Orange alerts for important notices
- **Info**: Yellow alerts for general information

All alerts are dismissible and auto-close after 5 seconds (configurable).

## Responsive Design

The application is fully responsive:

- **Mobile**: Single column layout, touch-optimized
- **Tablet**: Two column layout
- **Desktop**: Multi-column dashboard with full features

All components adapt to screen size automatically.

## Deployment to Netlify

1. **Build the project**
   ```bash
   pnpm build
   ```

2. **Connect to Netlify**
   - Push code to GitHub
   - Connect GitHub repository to Netlify
   - Set build command: `pnpm build`
   - Set publish directory: `dist`

3. **Environment Variables**
   - Add them to Netlify environment

4. **Deploy**
   - Netlify automatically deploys on push

## Troubleshooting

### "Missing Supabase environment variables"
- Check `.env` file has correct values
- Restart dev server after changing `.env`

### "Email verification not working"
- Check Supabase email settings in project settings
- Verify email templates are configured

### "Can't login after signup"
- Verify email address
- Check user was created in Supabase auth
- Check database user record exists

### "Styles not loading"
- Clear browser cache
- Restart dev server
- Check Tailwind CSS configuration

## Future Enhancements

- Real-time order status updates with Supabase Realtime
- File upload for drafts (Supabase Storage)
- PDF bill generation
- Email notifications for order updates
- Advanced analytics and charts
- Mobile app (React Native)
- Payment integration
- Barcode/QR code tracking

## Support & Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [React Router Documentation](https://reactrouter.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev)

## License

MIT License - Feel free to use this project for personal or commercial purposes.

---

**Built with ❤️ using React, Supabase, and Tailwind CSS**
