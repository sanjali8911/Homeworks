/**
 * CampusCoin Financial Calculator Engine (V6.5 - Dynamic Calendar & Zero-Sum)
 * - Supreme Lord: Starting Cash dictates total pool
 * - Category Balances = Allotted - Spent for Food & Necessities
 * - Budget availability and borrowing deficit checker
 * - Dynamic Monthly Summary with Wednesday-based Month Filtering
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
      necessities: 0
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
    const currentCalWeekId = (typeof getWeekIdentifier === 'function') ? getWeekIdentifier(now) : null;
    const isPast = currentCalWeekId ? (week.id < currentCalWeekId) : false;
    const isFuture = currentCalWeekId ? (week.id > currentCalWeekId) : false;

    let daysRemaining = 0;
    let daysLabel = '0 days left';

    if (isPast) {
      daysRemaining = 0;
      daysLabel = '0 days (Concluded)';
    } else if (isFuture) {
      daysRemaining = 7;
      daysLabel = '7 days left';
    } else {
      daysRemaining = 7 - currentDayIndex;
      daysLabel = `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`;
    }

    const startingCash = parseFloat(week.startingBalance) || 0;
    const grandSpent = this.getGrandTotalSpent(week);
    const remainingCash = startingCash - grandSpent;

    let safeDailyAllowance = 0;
    if (isPast) {
      safeDailyAllowance = 0;
    } else if (remainingCash > 0 && daysRemaining > 0) {
      safeDailyAllowance = remainingCash / daysRemaining;
    } else {
      safeDailyAllowance = 0;
    }

    const dailyTotals = this.getDailyTotals(week);
    const todaySpent = (!isPast && !isFuture) ? (dailyTotals[currentDayIndex] || 0) : 0;

    let paceStatus = 'healthy';
    let paceMessage = '';

    if (isPast) {
      paceStatus = 'concluded';
      paceMessage = `This week has concluded. Finalized ending balance: ${currency}${remainingCash.toFixed(0)}.`;
    } else if (isFuture) {
      paceStatus = 'upcoming';
      paceMessage = `Upcoming week. Baseline allowance: ${currency}${safeDailyAllowance.toFixed(0)}/day across all 7 days.`;
    } else if (remainingCash <= 0) {
      paceStatus = 'overbudget';
      paceMessage = `Cash reserve depleted by ${currency}${Math.abs(remainingCash).toFixed(0)}. Limit all non-essential spends.`;
    } else if (safeDailyAllowance < 150) {
      paceStatus = 'tight';
      paceMessage = `Tight cash reserve (${currency}${safeDailyAllowance.toFixed(0)}/day). Stick to essentials & mess meals.`;
    } else {
      paceStatus = 'healthy';
      paceMessage = `Dynamic pace: ${currency}${safeDailyAllowance.toFixed(0)}/day remaining across ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`;
    }

    return {
      safeAmount: parseFloat(safeDailyAllowance.toFixed(0)),
      safeAmountExact: parseFloat(safeDailyAllowance.toFixed(2)),
      remainingPool: parseFloat(remainingCash.toFixed(2)),
      startingCash,
      daysRemaining,
      daysLabel,
      isPast,
      isFuture,
      currentDayIndex,
      currentDayName: DAYS_OF_WEEK[currentDayIndex].name,
      todaySpent: parseFloat(todaySpent.toFixed(2)),
      paceStatus,
      paceMessage,
      percentUsed: startingCash > 0 ? Math.min(100, Math.round((grandSpent / startingCash) * 100)) : 0
    };
  },

  /**
   * Generates a monthly summary for a specific targetMonthId (e.g. '2026-08', '2026-09', '2027-01')
   * Uses Wednesday Rule: gets all 4 (or 5) weeks where Wednesday falls in that month!
   */
  getMonthlySummary(state, targetMonthId = 'current') {
    const weeks = (state && state.weeks) ? state.weeks : {};
    const currentCalWeekId = getWeekIdentifier(new Date());

    let resolvedMonthId = targetMonthId;
    if (!resolvedMonthId || resolvedMonthId === 'current') {
      const activeWeek = (state && state.activeWeekId && weeks[state.activeWeekId]) ? weeks[state.activeWeekId] : null;
      const info = activeWeek ? getWeekDateInfo(activeWeek.id) : getWeekDateInfo(currentCalWeekId);
      resolvedMonthId = info.monthId;
    }

    const parts = resolvedMonthId.split('-');
    const year = parseInt(parts[0], 10) || new Date().getFullYear();
    const monthNum = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    const monthIndex = monthNum - 1;

    // Retrieve all weeks belonging to this month via Wednesday Rule
    const monthWeeksInfo = getWeeksForMonth(year, monthIndex);
    const monthLabel = (monthWeeksInfo.length > 0)
      ? monthWeeksInfo[0].monthLabel
      : new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    let defaultCash = 7500;
    if (typeof window !== 'undefined' && window.CampusState && typeof window.CampusState.getDefaultStartingCash === 'function') {
      defaultCash = window.CampusState.getDefaultStartingCash();
    } else if (state && state.settings && state.settings.defaultStartingCash !== undefined) {
      defaultCash = parseFloat(state.settings.defaultStartingCash) || 7500;
    }

    let totalAllotted = 0;
    let totalSpent = 0;
    let totalSurprises = 0;
    const categoryTotals = {
      food: 0,
      necessities: 0
    };

    const weekRows = [];

    monthWeeksInfo.forEach(wInfo => {
      const wId = wInfo.weekId;
      let w = weeks[wId];

      if (!w) {
        // If week doesn't exist yet in state.weeks, construct a preview week
        const startVal = (wId >= currentCalWeekId) ? defaultCash : 0;
        w = createEmptyWeek(wId, wInfo.fullLabel, wInfo.startDate, startVal);
      }

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
        label: wInfo.monthRelativeLabel || w.label || wInfo.fullLabel,
        allotted: wAllotted,
        spent: wSpent,
        surprises: wSurp,
        endingBalance: wEnd,
        finalized: w.finalized
      });
    });

    const netSavings = totalAllotted - totalSpent;
    const savingsRate = totalAllotted > 0 ? ((netSavings / totalAllotted) * 100).toFixed(1) : '0.0';
    const spendPct = totalAllotted > 0 ? ((totalSpent / totalAllotted) * 100).toFixed(1) : '0.0';

    return {
      monthId: resolvedMonthId,
      monthLabel,
      totalAllotted: parseFloat(totalAllotted.toFixed(2)),
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      totalSurprises: parseFloat(totalSurprises.toFixed(2)),
      netSavings: parseFloat(netSavings.toFixed(2)),
      savingsRate: parseFloat(savingsRate),
      spendPct: parseFloat(spendPct),
      categoryTotals,
      weekRows
    };
  },

  /**
   * Computes all-time expenses across all weeks
   */
  getAllTimeExpenses(state) {
    if (!state || !state.weeks) return 0;
    let total = 0;
    Object.values(state.weeks).forEach(w => {
      if (!w) return;
      total += this.getGrandTotalSpent(w);
    });
    return parseFloat(total.toFixed(2));
  },

  /**
   * Live Cash Balance calculation helper
   */
  getLiveCashBalance(state) {
    const incomeSources = (state && Array.isArray(state.incomeSources)) ? state.incomeSources : [];
    const totalInflow = incomeSources.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const totalOutflow = this.getAllTimeExpenses(state);
    const liveBalance = totalInflow - totalOutflow;

    return {
      totalInflow: parseFloat(totalInflow.toFixed(2)),
      totalOutflow: parseFloat(totalOutflow.toFixed(2)),
      liveBalance: parseFloat(liveBalance.toFixed(2)),
      incomeCount: incomeSources.length
    };
  }
};

window.CampusCalculator = CampusCalculator;
