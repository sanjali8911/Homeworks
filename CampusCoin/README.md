# CampusCoin 🪙 – Student Personal Finance & Weekly Budget Tracker

> A modern, responsive, cyber-dark personal finance single-page web application designed specifically for college students to track weekly expenses, manage allotted category budgets, track surprise anomalies, and aggregate spending into a monthly macro-summary.

![CampusCoin Screenshot](assets/preview.png)

---

## 🚀 Key Features

### 1. Data Storage & Persistence (Zero Backend Required)
- **Automatic Local Storage**: All inputs, allotted budgets, surprise anomalies, and preferences are automatically and instantly saved into browser `localStorage` on every keystroke.
- **Backup & Restore System**:
  - **Export Backup**: Downloads complete historical data, weeks, and ledger as a `budget_data.json` file.
  - **Import Backup**: Uploads and validates a JSON file to restore state on any device instantly.
- **Hard Reset**: Double-confirmed "Clear All Data" option with one-click "Load Sample Student Data" preview.

### 2. Core Interface & Weekly Planner Table
- **Weekly Structure**: Sunday through Saturday rows with inline currency inputs.
- **Category Columns**:
  1. 🍕 **Food** (Dining, groceries, coffee)
  2. 🧼 **Necessities** (Toiletries, laundry)
  3. 👕 **Clothes** (Apparel & accessories)
  4. 📚 **Textbooks & Supplies** (Books, lab fees, stationery)
  5. 🎮 **Entertainment** (Movies, games, social)
  6. 🚌 **Transportation** (Bus, metro, rideshare)
  7. ⚡ **Daily Total** (Real-time auto-sum)
- **Top Allotted Limit Row**: Set weekly targets per category at the beginning of the week.
- **Traffic-Light Color System**:
  - 🟢 **Green** (`< 75%` spent of budget) – Safe spending zone.
  - 🟡 **Yellow** (`75% - 99%` spent) – Caution threshold.
  - 🔴 **Red** (`≥ 100%` spent) – Over-budget alert with dynamic badges.

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

## 🛠️ Tech Stack & Architecture

- **Core**: HTML5, Vanilla JavaScript (Modular ES6), CSS3 Custom Design System (Glassmorphism & Cyber-Neon Dark Theme).
- **Libraries**: [Chart.js](https://www.chartjs.org/) (Interactive analytics), [Lucide Icons](https://lucide.dev/), [jsPDF](https://github.com/parallax/jsPDF) (PDF exports), [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti).
- **Zero Build Configuration**: Ready to run with any static server or directly open `index.html`.

```
CampusCoin/
├── index.html              # Main single-page web app
├── vercel.json             # Static deploy configuration for Vercel
├── README.md               # Documentation & setup guide
├── css/
│   ├── style.css           # Design tokens, neon accents, dark theme, glassmorphism
│   └── responsive.css      # Mobile breakpoints & print styles
└── js/
    ├── state.js            # State management, localStorage sync, JSON backup/restore
    ├── calculator.js       # Safe-to-Spend math, traffic lights, balances
    ├── insights.js         # Dynamic student spending AI coach
    ├── notifications.js    # Browser notifications & Web Audio chime
    ├── export.js           # CSV & PDF export engine
    ├── charts.js           # Chart.js visualizations
    └── app.js              # DOM orchestrator & event listeners
```

---

## 🚀 Deployment Instructions

### Deploy to Vercel (1-Click)
1. Push this repository to GitHub / GitLab.
2. Import the project into [Vercel](https://vercel.com).
3. The included `vercel.json` will automatically configure it as a static deployment.

### Deploy to Replit
1. Create a new **HTML/CSS/JS** repl on [Replit](https://replit.com).
2. Upload the repository files.
3. Click **Run** to preview immediately.

### Local Development
To run locally using Python or Node.js:
```bash
# Python 3
python -m http.server 8080

# Or Node.js
npx serve .
```
Open `http://localhost:8080` in your web browser.
