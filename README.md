# 大学生智能存钱系统 (Campus Smart Savings)

A full-stack intelligent savings management system for college students, featuring daily budget allocation, forced savings, and password-protected emergency fund.

## Project Structure

```
.
├── backend/
│   ├── config/
│   │   ├── constants.ts        # JWT, server config
│   │   └── passport.ts         # JWT + local auth strategies
│   ├── db/
│   │   ├── index.ts            # Drizzle DB connection
│   │   ├── schema.ts           # All table definitions + Zod schemas
│   │   └── migrations/
│   │       ├── 0_init_add_user_model.sql
│   │       └── 1_add_finance_tables.sql
│   ├── middleware/
│   │   ├── auth.ts             # authenticateJWT, authenticateLocal
│   │   └── errorHandler.ts
│   ├── repositories/
│   │   ├── users.ts            # User CRUD + password hashing
│   │   ├── budgets.ts          # Monthly budget + analytics queries
│   │   ├── expenses.ts         # Expense CRUD
│   │   ├── savings.ts          # Savings records CRUD
│   │   └── emergencyFund.ts    # Emergency fund + password lock logic
│   ├── routes/
│   │   ├── auth.ts             # POST /api/auth/signup|login, GET /me
│   │   ├── budgets.ts          # GET|POST /api/budgets, GET /current
│   │   ├── expenses.ts         # GET|POST|DELETE /api/expenses
│   │   ├── savings.ts          # GET|POST /api/savings
│   │   └── emergencyFund.ts    # GET|POST /api/emergency-fund/*
│   └── server.ts               # Express app entry point
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/             # shadcn/ui components (DO NOT MODIFY)
│       │   └── custom/
│       │       ├── Login.tsx
│       │       ├── Signup.tsx
│       │       └── OmniflowBadge.tsx
│       ├── contexts/
│       │   └── AuthContext.tsx  # JWT auth state management
│       ├── lib/
│       │   ├── api.ts          # All API client functions
│       │   └── utils.ts
│       ├── pages/
│       │   └── Index.tsx       # Main dashboard (all views)
│       ├── types/
│       │   └── index.ts        # All TypeScript types + CATEGORY_CONFIG
│       ├── config/
│       │   └── constants.ts    # API_BASE_URL
│       ├── App.tsx             # HashRouter + AuthProvider + routes
│       └── index.css           # Tailwind v4 theme (teal/indigo/amber)
```

## Tech Stack

- **Backend**: Express.js + TypeScript + Drizzle ORM + PostgreSQL
- **Auth**: Passport.js (JWT + local strategies) + bcryptjs
- **Frontend**: React 18 + Vite + Tailwind CSS v4 + shadcn/ui
- **Routing**: React Router DOM (HashRouter)
- **Fonts**: Poppins (heading) + Inter (body) + JetBrains Mono (numbers)

## Key Features

1. **User Auth** - JWT-based signup/login with bcrypt password hashing
2. **Monthly Budget Setup** - Income + savings goal → auto daily allowance calculation
3. **Daily Expense Recording** - Category-tagged expenses with auto savings transfer
4. **Forced Savings** - Remaining daily allowance auto-saved to savings account
5. **Emergency Fund** - Password-protected vault with deposit/withdraw + 5-attempt lockout
6. **Statistics** - Monthly category breakdown + daily trend charts
7. **History** - Full expense and savings record history

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/signup | Register user |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/me | Get current user |
| GET | /api/budgets/current | Dashboard data |
| POST | /api/budgets | Create/update monthly budget |
| GET | /api/budgets/:year/:month/summary | Monthly summary |
| GET | /api/expenses | List expenses |
| POST | /api/expenses | Record expense |
| DELETE | /api/expenses/:id | Delete expense |
| GET | /api/savings | List savings records |
| POST | /api/savings | Manual savings entry |
| GET | /api/emergency-fund | Fund info (no balance) |
| POST | /api/emergency-fund/verify | Verify password + get balance |
| POST | /api/emergency-fund/set-password | Set/reset vault password |
| POST | /api/emergency-fund/deposit | Deposit (no password) |
| POST | /api/emergency-fund/withdraw | Withdraw (requires password) |
| PUT | /api/emergency-fund/target | Update target amount |

## Database Tables

- `Users` - Auth + emergency fund password/lock fields
- `MonthlyBudgets` - Per-user per-month income/goal/allowance
- `Expenses` - Individual expense records with category
- `SavingsRecords` - Auto and manual savings entries
- `EmergencyFund` - Per-user balance + target
- `EmergencyFundTransactions` - Deposit/withdraw history

## Code Generation Guidelines

- All API calls go through `frontend/src/lib/api.ts` using `apiFetch` helper
- Auth token stored in `localStorage` under key `'token'`
- All views rendered inline in `Index.tsx` using `view` state (AppView type)
- Emergency fund password uses bcrypt with 12 rounds; 5 failed attempts = 10min lockout
- Budget daily allowance = (income - savingsGoal) / daysInMonth
- Expense categories: food, shopping, transport, entertainment, study, other
