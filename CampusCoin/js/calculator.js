/**
 * CampusCoin Financial Calculator Engine (V5 - Zero-Sum & Live Balance Rows)
 * - Supreme Lord: Starting Cash dictates total pool
 * - Category Balances = Allotted - Spent for Food, Necessities, Clothes, Recreation, Other
 * - Budget availability and borrowing deficit checker
 */

const CampusCalculator = {
  getSpendAmount(cellData) {
    if (!cellData) return 0;
    if (typeof cellData === 'number') return cellData;
    
    if (typeof cellData === 'object' && Array.isArray(cellData.items)) {
      const sum = cellData.items.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0);
      return parseFloat(sum.toFixed(2));
    }

    if (typeof cellData === 'object' && cellData.amount !== undefined) {
      return parseFloat(cellData.amount) || 0;
    }
    return parseFloat(cellData) || 0;
  },

  getSpendItems(cellData) {
    if (!cellData || typeof cellData !== 'object') return [];
    if (Array.isArray(cellData.items)) return cellData.items;
    if (cellData.amount) {
      return [{ id: 'legacy-1', name: cellData.note || 'Expense', amount: cellData.amount, isBorrowed: false }];
    }
    return [];
  },

  getCategoryTotals(week) {
    const totals = {
      food: 0,
      necessities: 0,
      clothes: 0,
      entertainment: 0,
      other: 0
    };

    if (!week || !week.dailySpends) return totals;

    for (let d = 0; d < 7; d++) {
      const dayData = week.dailySpends[d] || {};
      CATEGORIES.forEach(cat => {
        totals[cat.id] += this.getSpendAmount(dayData[cat.id]);
      });
    }

    Object.keys(totals).forEach(key => {
      totals[key] = parseFloat(totals[key].toFixed(2));
    });

    return totals;
  },

  getDailyTotals(week) {
    const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
    if (!week || !week.dailySpends) return dailyTotals;

    for (let d = 0; d < 7; d++) {
      const dayData = week.dailySpends[d] || {};
      let sum = 0;
      CATEGORIES.forEach(cat => {
        sum += this.getSpendAmount(dayData[cat.id]);
      });
      dailyTotals[d] = parseFloat(sum.toFixed(2));
    }
    return dailyTotals;
  },

  getSurprisesTotal(week) {
    if (!week || !week.surprises || !Array.isArray(week.surprises)) return 0;
    const sum = week.surprises.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    return parseFloat(sum.toFixed(2));
  },

  getTotalAllottedBudget(week) {
    if (!week || !week.allottedBudgets) return 0;
    let sum = 0;
    CATEGORIES.forEach(cat => {
      sum += parseFloat(week.allottedBudgets[cat.id]) || 0;
    });
    return parseFloat(sum.toFixed(2));
  },

  getGrandTotalSpent(week) {
    const catTotals = this.getCategoryTotals(week);
    const catSum = Object.values(catTotals).reduce((a, b) => a + b, 0);
    const surprises = this.getSurprisesTotal(week);
    return parseFloat((catSum + surprises).toFixed(2));
  },

  /**
   * Live Category Balances: Allotted - Spent for each category
   */
  getCategoryBalances(week) {
    const totals = this.getCategoryTotals(week);
    const budgets = week.allottedBudgets || {};
    const balances = {};

    CATEGORIES.forEach(cat => {
      const allotted = parseFloat(budgets[cat.id]) || 0;
      const spent = totals[cat.id] || 0;
      balances[cat.id] = parseFloat((allotted - spent).toFixed(2));
    });

    const startingCash = parseFloat(week.startingBalance) || 0;
    const totalSpent = this.getGrandTotalSpent(week);
    balances.total = parseFloat((startingCash - totalSpent).toFixed(2));

    return balances;
  },

  /**
   * Check budget availability and borrowing deficit for adding a new item
   */
  checkBudgetAvailability(week, categoryId, newAmount) {
    const totals = this.getCategoryTotals(week);
    const budgets = week.allottedBudgets || {};
    const currentSpent = totals[categoryId] || 0;
    const allotted = parseFloat(budgets[categoryId]) || 0;
    const currentRemaining = allotted - currentSpent;
    const itemAmt = parseFloat(newAmount) || 0;

    const fits = itemAmt <= currentRemaining;
    const deficit = fits ? 0 : parseFloat((itemAmt - currentRemaining).toFixed(2));

    const necSpent = totals.necessities || 0;
    const necAllotted = parseFloat(budgets.necessities) || 0;
    const availableInNecessities = Math.max(0, necAllotted - necSpent);

    return {
      fits,
      allotted,
      currentSpent,
      currentRemaining: parseFloat(currentRemaining.toFixed(2)),
      deficit,
      availableInNecessities: parseFloat(availableInNecessities.toFixed(2))
    };
  },

  getEndingBalance(week) {
    const starting = parseFloat(week.startingBalance) || 0;
    const totalSpent = this.getGrandTotalSpent(week);
    return parseFloat((starting - totalSpent).toFixed(2));
  },

  getTrafficLight(spent, budget) {
    spent = parseFloat(spent) || 0;
    budget = parseFloat(budget) || 0;

    if (budget <= 0) {
      if (spent > 0) return { status: 'red', color: 'var(--traffic-red)', pct: 100, class: 'traffic-red', label: 'Over Limit' };
      return { status: 'green', color: 'var(--traffic-green)', pct: 0, class: 'traffic-green', label: 'Safe' };
    }

    const percentage = (spent / budget) * 100;

    if (percentage < 75) {
      return {
        status: 'green',
        color: 'var(--traffic-green)',
        pct: Math.round(percentage),
        class: 'traffic-green',
        label: 'Safe'
      };
    } else if (percentage < 100) {
      return {
        status: 'yellow',
        color: 'var(--traffic-yellow)',
        pct: Math.round(percentage),
        class: 'traffic-yellow',
        label: 'Caution'
      };
    } else {
      return {
        status: 'red',
        color: 'var(--traffic-red)',
        pct: Math.round(percentage),
        class: 'traffic-red',
        label: 'Limit Reached'
      };
    }
  },

  getCategoryBudgetStatus(week, categoryId) {
    const totals = this.getCategoryTotals(week);
    const budgets = week.allottedBudgets || {};
    const spent = totals[categoryId] || 0;
    const allotted = parseFloat(budgets[categoryId]) || 0;
    const remaining = Math.max(0, allotted - spent);
    const pctRemaining = allotted > 0 ? Math.max(0, Math.min(100, Math.round((remaining / allotted) * 100))) : 0;

    return {
      categoryId,
      spent: parseFloat(spent.toFixed(2)),
      allotted: parseFloat(allotted.toFixed(2)),
      remaining: parseFloat((allotted - spent).toFixed(2)),
      positiveRemaining: parseFloat(remaining.toFixed(2)),
      pctRemaining,
      isOver: spent > allotted
    };
  },

  getSafeToSpendToday(week) {
    const currency = (window.CampusState && window.CampusState.getCurrency) ? window.CampusState.getCurrency() : '₹';
    const now = new Date();
    const currentDayIndex = now.getDay();
    const daysRemaining = 7 - currentDayIndex;

    const startingCash = parseFloat(week.startingBalance) || 0;
    const grandSpent = this.getGrandTotalSpent(week);
    const remainingCash = startingCash - grandSpent;

    let safeDailyAllowance = 0;
    if (remainingCash > 0 && daysRemaining > 0) {
      safeDailyAllowance = remainingCash / daysRemaining;
    } else if (remainingCash <= 0) {
      safeDailyAllowance = 0;
    }

    const dailyTotals = this.getDailyTotals(week);
    const todaySpent = dailyTotals[currentDayIndex] || 0;

    let paceStatus = 'healthy';
    let paceMessage = `Zero-Sum: ${daysRemaining} days left in the week.`;

    if (remainingCash <= 0) {
      paceStatus = 'overbudget';
      paceMessage = `Cash reserve depleted by ${currency}${Math.abs(remainingCash).toFixed(0)}. Limit all non-essential spends.`;
    } else if (safeDailyAllowance < 150) {
      paceStatus = 'tight';
      paceMessage = `Tight cash reserve (${currency}${safeDailyAllowance.toFixed(0)}/day). Stick to essentials & mess meals.`;
    } else {
      paceStatus = 'healthy';
      paceMessage = `Dynamic pace: ${currency}${safeDailyAllowance.toFixed(0)}/day remaining across ${daysRemaining} days.`;
    }

    return {
      safeAmount: parseFloat(safeDailyAllowance.toFixed(0)),
      safeAmountExact: parseFloat(safeDailyAllowance.toFixed(2)),
      remainingPool: parseFloat(remainingCash.toFixed(2)),
      startingCash,
      daysRemaining,
      currentDayIndex,
      currentDayName: DAYS_OF_WEEK[currentDayIndex].name,
      todaySpent: parseFloat(todaySpent.toFixed(2)),
      paceStatus,
      paceMessage,
      percentUsed: startingCash > 0 ? Math.min(100, Math.round((grandSpent / startingCash) * 100)) : 0
    };
  },

  getMonthlySummary(state, targetMonthId) {
    const weeks = state.weeks || {};
    const archives = state.monthlyArchives || [];

    let activeMonthArchive = archives.find(m => m.monthId === targetMonthId);
    let includedWeekIds = activeMonthArchive ? [...activeMonthArchive.weekIds] : [];

    if (!includedWeekIds.includes(state.activeWeekId)) {
      includedWeekIds.push(state.activeWeekId);
    }

    let totalAllotted = 0;
    let totalSpent = 0;
    let totalSurprises = 0;
    const categoryTotals = {
      food: 0,
      necessities: 0,
      clothes: 0,
      entertainment: 0,
      other: 0
    };

    const weekRows = [];

    includedWeekIds.forEach(wId => {
      const w = weeks[wId];
      if (w) {
        const wAllotted = this.getTotalAllottedBudget(w);
        const wSpent = this.getGrandTotalSpent(w);
        const wSurp = this.getSurprisesTotal(w);
        const wEnd = this.getEndingBalance(w);
        const wCatTotals = this.getCategoryTotals(w);

        totalAllotted += wAllotted;
        totalSpent += wSpent;
        totalSurprises += wSurp;

        CATEGORIES.forEach(cat => {
          categoryTotals[cat.id] += (wCatTotals[cat.id] || 0);
        });

        weekRows.push({
          id: w.id,
          label: w.label || w.id,
          allotted: wAllotted,
          spent: wSpent,
          surprises: wSurp,
          endingBalance: wEnd,
          finalized: w.finalized
        });
      }
    });

    const netSavings = totalAllotted - totalSpent;
    const savingsRate = totalAllotted > 0 ? ((netSavings / totalAllotted) * 100).toFixed(1) : '0.0';
    const spendPct = totalAllotted > 0 ? ((totalSpent / totalAllotted) * 100).toFixed(1) : '0.0';

    return {
      monthId: targetMonthId,
      totalAllotted: parseFloat(totalAllotted.toFixed(2)),
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      totalSurprises: parseFloat(totalSurprises.toFixed(2)),
      netSavings: parseFloat(netSavings.toFixed(2)),
      savingsRate: parseFloat(savingsRate),
      spendPct: parseFloat(spendPct),
      categoryTotals,
      weekRows
    };
  }
};

window.CampusCalculator = CampusCalculator;
