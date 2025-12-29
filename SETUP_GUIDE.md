# AWARJANA CREATIONS - COMPLETE SETUP GUIDE

## What's New in This Version

### 🚀 Major Features Implemented

#### 1. Credit System (Max 10 Credits)
- **Credits Table**: Tracks user credits with `credits_remaining` and `total_credits_used`
- **Credit Usage Table**: Detailed tracking of all credit-consuming actions
- **API Keys Table**: Manage multiple API keys with individual credit pools
- **Slow Consumption**: Credits are consumed slowly (0.1 per order, 0.05 per update, etc.)
- **Low Credit Notifications**: Automatic warnings at 5, 3, and 1 credits remaining

#### 2. Dark/Light Mode Toggle
- Fully integrated with Tailwind CSS
- System preference detection
- Persistent theme storage
- Global floating toggle button
- Proper CSS variable handling

#### 3. Email Sending via Supabase
- OTP email verification
- Password reset emails
- Low credit warning emails
- Order confirmation emails
- Development mode with OTP simulation

#### 4. Shadcn UI Components
- Button, Card, Input, Label
- Alert (with variants)
- Dialog (modal)
- Toast (notifications)
- All components with dark mode support

#### 5. Debug Panel (Development Only)
- Real-time credit status
- Test OTP management
- Quick credit consumption buttons
- Environment information

---

## 📋 Quick Setup Instructions

### Step 1: Run Database Setup

1. Go to your Supabase SQL Editor
2. Copy and paste the contents of `database_setup.sql`
3. Run the entire script

This will:
- Drop existing tables (clean start)
- Create all new tables including credits, api_keys, credit_usage
- Create the admin_code_usage_stats view
- Add RLS policies for security
- Insert sample materials data
- Create helper functions

### Step 2: Configure Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_DEV_MODE=true
```

### Step 3: Install Dependencies

```bash
pnpm install
# or
npm install
```

### Step 4: Start Development Server

```bash
pnpm dev
# or
npm run dev
```

---

## 💳 Credit System Details

### Credit Consumption Rates

| Action | Credits Consumed |
|--------|-----------------|
| Order Create | 0.10 (1 per 10 orders) |
| Order Update | 0.05 (1 per 20 updates) |
| Draft Submit | 0.05 (1 per 20 drafts) |
| Material View | 0.01 (1 per 100 views) |
| Report Generate | 0.10 (1 per 10 reports) |
| API Call | 0.01 (1 per 100 calls) |
| Email Sent | 0.02 (1 per 50 emails) |
| Login | 0.001 (1 per 1000 logins) |

### Low Credit Thresholds

| Status | Credits Remaining | Action |
|--------|------------------|--------|
| Healthy | > 5 | Normal operation |
| Warning | ≤ 5 | Informational notice |
| Low | ≤ 3 | Warning notification |
| Critical | ≤ 1 | Urgent action required |

### API Key Management

Users can:
- Generate new API keys (10 credits each)
- View all their API keys
- Deactivate old keys
- Track usage per key

---

## 🎨 Theme System

### CSS Variables (for Shadcn UI)

The theme system uses CSS variables that are automatically updated:

**Light Mode:**
```css
--background: 0 0% 100%
--foreground: 0 0% 0%
--primary: 45 100% 50% (Yellow)
--card: 0 0% 100%
--border: 0 0% 80%
```

**Dark Mode:**
```css
--background: 0 0% 0%
--foreground: 0 0% 100%
--primary: 45 100% 50% (Yellow)
--card: 0 0% 4%
--border: 0 0% 15%
```

### Usage in Components

```jsx
import { useTheme } from './contexts/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      Current: {theme}
    </button>
  );
}
```

---

## 📧 Email System

### Development Mode
In development mode, OTPs are stored in localStorage for testing:
- Check browser console for OTP logs
- View test OTPs in the Debug Panel
- OTPs expire after 15 minutes

### Production Mode
In production, emails are sent via:
1. Supabase Auth (built-in OTP)
2. Custom Edge Functions (for custom templates)
3. External email service (Resend, SendGrid, etc.)

---

## 🏗️ Project Structure

```
src/
├── components/
│   ├── common/
│   │   ├── CreditWarningBanner.jsx
│   │   ├── CreditDisplay.jsx
│   │   ├── DebugPanel.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── ...
│   └── ui/
│       ├── Button.jsx
│       ├── Card.jsx
│       ├── Input.jsx
│       ├── Label.jsx
│       ├── Alert.jsx
│       ├── Dialog.jsx
│       └── Toast.jsx
├── contexts/
│   ├── AuthContext.jsx
│   ├── ThemeContext.jsx
│   └── CreditContext.jsx
├── lib/
│   ├── supabase.js
│   ├── costCalculator.js
│   ├── email.js
│   ├── utils.js
│   └── creditConfig.js
├── pages/
│   ├── dashboard/
│   ├── orders/
│   ├── worker/
│   └── admin/
└── App.jsx
```

---

## 🔧 Key Files Modified

| File | Purpose |
|------|---------|
| `database_setup.sql` | Complete database schema with credits |
| `src/App.jsx` | Routing with CreditProvider & ToastProvider |
| `src/contexts/CreditContext.jsx` | Credit management logic |
| `src/contexts/ThemeContext.jsx` | Dark/light mode handling |
| `src/lib/email.js` | Email sending functionality |
| `src/lib/costCalculator.js` | Cost calculations in LKR |
| `src/lib/utils.js` | Utility functions & credit status |
| `src/components/ui/*` | Shadcn UI components |
| `src/components/common/CreditWarningBanner.jsx` | Low credit warnings |
| `src/components/common/CreditDisplay.jsx` | Credit status display |
| `src/components/common/DebugPanel.jsx` | Development debug tools |
| `src/components/common/ProtectedRoute.jsx` | Route protection with credits |

---

## 💰 Currency Configuration

All costs are displayed in **LKR (Sri Lankan Rupees)**:

```javascript
// Format: Rs. 1,234.56
formatLKR(1234.56)

// In cost calculator
const { total } = calculateOrderCost(width, height);
// total is in LKR
```

---

## 🔐 RLS Policies

The database includes comprehensive Row Level Security policies:

- **Users**: Can view/edit own profile; Admins can view/edit all
- **API Keys**: Users can manage their own; Admins can view all
- **Credits**: Users can view their own; Admins can view all
- **Credit Usage**: Users can view their own; Admins can view all
- **Materials**: Anyone can view; Only admins can modify
- **Orders**: Role-based access (Customer → own, Worker → assigned, Admin → all)
- **Job Cards/Drafts**: Workers → own; Admins → all
- **Registration Codes**: Verification → public; Management → admin only

---

## 🧪 Testing Checklist

After setup, verify:

- [ ] Dark/light mode toggle works
- [ ] Login/logout works
- [ ] Signup with registration code works
- [ ] Credit display shows 10 credits on signup
- [ ] Credit consumption on order creation
- [ ] Low credit warning at 5, 3, 1 credits
- [ ] New API key generation
- [ ] Email sending (check console in dev mode)
- [ ] Dashboard shows correct role-based content
- [ ] Protected routes redirect properly
- [ ] Debug panel shows all information

---

## 🐛 Debug Mode

The Debug Panel (🐛 button, bottom-left) shows:
- Current theme
- User authentication status
- Credit balance and status
- Quick credit consumption buttons
- Test OTPs
- Environment information

Enable with:
```env
VITE_DEV_MODE=true
```

---

## 📞 Support

For issues:
1. Check browser console for error logs
2. Use Debug Panel to verify state
3. Check Supabase SQL execution results
4. Verify RLS policies in Supabase dashboard

---

## 📝 Changelog

### Version 2.0.0
- Added complete credit system
- Implemented dark/light mode toggle
- Added Shadcn UI components
- Improved email sending
- Enhanced debug logging
- Added credit warning banners
- Created API key management
- Improved cost calculations in LKR
- Added comprehensive RLS policies

---

**Last Updated**: December 2025
**Version**: 2.0.0
