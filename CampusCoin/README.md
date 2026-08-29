# CampusCoin 🪙 – Student Personal Finance & Weekly Budget Tracker

> A modern, responsive, cyber-dark personal finance single-page web application designed specifically for college students to track weekly expenses, manage allotted category budgets, track surprise anomalies, and aggregate spending into a monthly macro-summary.

![CampusCoin Screenshot](assets/preview.png)

---

## 🚀 Key Features

### 1. Data Storage & Persistence (Supabase PostgreSQL Cloud)
- **Direct Supabase Cloud Persistence**: All inputs, allotted budgets, surprise anomalies, and preferences are automatically synced to your Supabase database in real-time.
- **Multi-Device / Multi-Tab Live Sync**: Built-in PostgreSQL real-time listeners keep all open tabs and devices synchronized.
- **Backup & Restore System**:
  - **Export Backup**: Downloads complete historical data, weeks, and ledger as a `budget_data.json` file.
  - **Import Backup**: Uploads and validates a JSON file to restore state into Supabase instantly.
- **Hard Reset**: Double-confirmed "Clear All Data" option with one-click "Load Sample Student Data" preview.

### 2. Core Interface & Weekly Planner Table
- **Weekly Structure**: Sunday through Saturday rows with inline currency inputs.
- **Category Columns**:
  1. 🍕 **Food** (Dining, groceries, coffee)
  2. 🧼 **Necessities** (Toiletries, laundry)
  3. 👕 **Clothes** (Apparel & accessories)
  

### 3. Smart Calculations & Advanced Features
- **"Safe to Spend Today" Hero Widget**:
  $$\text{Safe to Spend Today} = \frac{\text{Remaining Weekly Budget} - \text{Surprises}}{\text{Remaining Days in Week (including today)}}$$
  Calculates your dynamic daily allowance with pacing feedback (e.g. *"$18.50 safe today / 4 days left"*).
- **Surprise / Unexpected Expense Anomaly Tracker**: Dedicated row to log unbudgeted emergency costs (e.g. lab fee, broken charger) and compute their exact impact on weekly cash flow.
- **Automated Running Math**: Starting Balance, daily totals, category totals, and projected Ending Balance update in real-time.
- **Campus AI Coach Insights**: Dynamic rule-based recommendations tailored to college life (campus meal prep, free student union events, textbook library reserves, .edu discounts).

### 4. Notifications, Exports & Macro Aggregation
- **Browser Reminders**: Scheduled daily reminder system (e.g. 9:00 PM) prompting: *"Time to update your daily spends!"* with custom Web Audio API pleasant coin chime.
- **Weekly Exports**:
  - **CSV Export**: Clean spreadsheet export of current week matrix.
  - **PDF Export**: Formatted printable weekly budget report.
- **Monthly Book Tab**: Aggregates finalized weekly tables into a monthly ledger (Total Monthly Allotted vs. Total Monthly Spent, net savings rate, and category distribution donut charts).

---

## 🛠️ Supabase Setup Guide

### 1. Configure `.env.local`
Add your Supabase project credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

### 2. Run SQL in Supabase SQL Editor
Open your Supabase dashboard, go to the **SQL Editor**, and run the following script:
```sql
-- 1. Create the CampusCoin state table
CREATE TABLE IF NOT EXISTS campuscoin_state (
    id TEXT PRIMARY KEY DEFAULT 'default_user',
    state JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Disable Row Level Security (RLS)
ALTER TABLE campuscoin_state DISABLE ROW LEVEL SECURITY;

-- 3. Enable Realtime broadcasting for live multi-device syncing
ALTER PUBLICATION supabase_realtime ADD TABLE campuscoin_state;

-- 4. Seed initial default record placeholder
INSERT INTO campuscoin_state (id, state, updated_at)
VALUES ('default_user', '{}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;
```

---

## 🚀 Running Locally
```bash
npm install
npm test
npm run dev
```
