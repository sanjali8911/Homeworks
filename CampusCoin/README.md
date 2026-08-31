# CampusCoin 🪙 – Student Personal Finance & Weekly Budget Tracker

> A modern, cyber-dark zero-sum personal finance web application for college students with **Supabase Authentication**, **Row Level Security (RLS)**, weekly allowance pacing, surprise anomaly tracking, and automated monthly macro-ledgers.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsanjali8911%2FHomeworks&project-name=campuscoin&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY&envDescription=Enter%20your%20Supabase%20Project%20URL%20and%20Anon%20Public%20API%20Key&envLink=https%3A%2F%2Fsupabase.com%2Fdashboard)

---

## 🚀 Key Features

### 1. Multi-Tenant Supabase Authentication & RLS Security
- **Per-User Isolation**: Every student gets their own private ledger securely isolated by PostgreSQL **Row Level Security (RLS)**. No shared database rows.
- **Email + Password & Magic Links**: Seamless account creation with instant session persistence across page reloads.
- **Zero Configuration for Students**: Students simply visit the deployed URL and sign up—no backend setup or API key entry required.

### 2. Zero-Sum Supreme Pool & Allowance Pacing
- **Starting Cash Foundation**: Starting cash dictates total spending pool (default 24% to Food, 76% to Necessities, customizable in Settings).
- **Safe-to-Spend Daily Hero Metric**:
  $$\text{Safe Daily Allowance} = \frac{\text{Remaining Cash Cushion} - \text{Surprises}}{\text{Remaining Days in Week (including today)}}$$
- **Zero-Sum Borrowing**: Borrow funds between categories with automatic audit trail and red ⚡ badges.
- **Surprise Anomaly Tracker**: Absorbs emergency expenses directly from Necessities without breaking zero-sum math.

### 3. Live Cash Balance & Inflows
- **Real-Time Running Balance**: Tracks all incoming funds (stipend, freelance, parents) and live outflows.
- **Multi-Device Live Sync**: PostgreSQL Realtime synchronization streams edits instantly across tabs and mobile devices.

### 4. Statements & Macro Aggregation
- **Weekly & Monthly PDF Statements**: Multi-page statements with macro KPI cards, 4-week summary ledger, and itemized daily matrix.
- **CSV Spreadsheets**: Download structured CSV logs for spreadsheet analysis.

---

## 🛠️ Deployer Setup (One-Time Setup)

As the maintainer/deployer, you only need to create **ONE** Supabase project for all your users:

### Step 1: Run SQL in Supabase SQL Editor
Open your [Supabase Dashboard](https://supabase.com/dashboard), navigate to the **SQL Editor**, and run the migration script:

```sql
-- 1. Drop existing legacy table if it was created with TEXT id
DROP TABLE IF EXISTS public.campuscoin_state CASCADE;

-- 2. Create the CampusCoin state table linked to authenticated users (UUID)
CREATE TABLE public.campuscoin_state (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Grant table permissions to authenticated, anon, and service_role
GRANT ALL ON TABLE public.campuscoin_state TO authenticated;
GRANT ALL ON TABLE public.campuscoin_state TO service_role;
GRANT ALL ON TABLE public.campuscoin_state TO anon;

-- 4. Turn ON Row Level Security (RLS)
ALTER TABLE public.campuscoin_state ENABLE ROW LEVEL SECURITY;

-- 5. Security Policy: Authenticated students can only access & manage their own row
CREATE POLICY "Users can manage own campuscoin_state"
ON public.campuscoin_state
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Enable Realtime broadcasting for live sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND tablename = 'campuscoin_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campuscoin_state;
  END IF;
END $$;
```

*(This SQL is also stored in [`supabase/migrations/20260831_init_auth_rls.sql`](supabase/migrations/20260831_init_auth_rls.sql).)*

---

### Step 2: 1-Click Deploy to Vercel

Click the **Deploy with Vercel** button above or link your GitHub repo to Vercel and add your project environment variables:

| Variable Name | Value Description |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL (`https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Public / Anon API Key |

---

## 👨‍🎓 Student Experience (Zero Setup Required)

1. Open your deployed CampusCoin URL.
2. Click **Create Account** or **Sign In** with email + password.
3. Your personal zero-sum budget is created instantly and securely synced across all your devices!

---

## 💻 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run unit & logic verification tests
npm test

# 3. Start local development server
npm run dev
# Open http://localhost:3000
```
