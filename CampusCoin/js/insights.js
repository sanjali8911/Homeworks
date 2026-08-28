/**
 * CampusCoin AI Student Financial Insights Engine
 * Formatted for INR (₹) and 5 college spending categories.
 */

const CampusInsights = {
  generateInsights(week) {
    const currency = (window.CampusState && window.CampusState.getCurrency) ? window.CampusState.getCurrency() : '₹';
    const insights = [];
    const catTotals = CampusCalculator.getCategoryTotals(week);
    const budgets = week.allottedBudgets || {};
    const safeData = CampusCalculator.getSafeToSpendToday(week);
    const surprises = CampusCalculator.getSurprisesTotal(week);

    const now = new Date();
    const currentDay = now.getDay();
    const isApproachingWeekend = currentDay >= 4;

    // 1. Food Analysis
    const foodSpent = catTotals.food || 0;
    const foodBudget = parseFloat(budgets.food) || 1;
    const foodRatio = (foodSpent / foodBudget) * 100;

    if (foodRatio >= 85) {
      insights.push({
        id: 'food-caution',
        type: 'urgent',
        badge: '🍛 Food Budget Alert',
        title: 'High Food & Canteen Spend',
        body: `Food spending is at ${Math.round(foodRatio)}% of budget. Prioritize your hostel mess meals or quick canteen options for the next ${safeData.daysRemaining} days.`,
        category: 'food',
        priority: 1
      });
    } else if (foodRatio <= 50 && currentDay >= 4) {
      insights.push({
        id: 'food-win',
        type: 'savings',
        badge: '🥗 Meal Planner Win',
        title: 'Food Budget is Balanced',
        body: `Healthy pace with ${currency}${(foodBudget - foodSpent).toFixed(0)} left in food. Your mess and grocery choices are keeping expenses on track.`,
        category: 'food',
        priority: 4
      });
    }

    // 2. Necessities Analysis
    const necSpent = catTotals.necessities || 0;
    const necBudget = parseFloat(budgets.necessities) || 1;
    const necRatio = (necSpent / necBudget) * 100;
    if (necRatio >= 90) {
      insights.push({
        id: 'nec-alert',
        type: 'urgent',
        badge: '🧼 Necessities Budget Alert',
        title: 'Necessities Buffer Low',
        body: `Necessities spending is at ${Math.round(necRatio)}% of budget. Keep room supplies spending minimal.`,
        category: 'necessities',
        priority: 2
      });
    }

    // 4. Surprises / Anomalies
    if (surprises > 0) {
      insights.push({
        id: 'surp-impact',
        type: 'urgent',
        badge: '⚡ Surprise Anomaly',
        title: `${currency}${surprises.toFixed(0)} in Unplanned Expenses`,
        body: `Unforeseen costs adjusted your safe daily spend to ${currency}${safeData.safeAmount}/day. Moderating other spends will help balance the week.`,
        category: 'general',
        priority: 1
      });
    }

    // 5. Safe to Spend Advice
    if (safeData.safeAmount < 150 && safeData.remainingPool > 0) {
      insights.push({
        id: 'pace-tight',
        type: 'urgent',
        badge: '🛡️ Daily Cushion Alert',
        title: `Daily Allowance: ${currency}${safeData.safeAmount}/day`,
        body: `With ${safeData.daysRemaining} days left and ${currency}${safeData.remainingPool.toFixed(0)} in the pool, focus only on essential daily items.`,
        category: 'general',
        priority: 1
      });
    } else if (safeData.safeAmount >= 400) {
      insights.push({
        id: 'pace-plenty',
        type: 'savings',
        badge: '🎯 Savings Opportunity',
        title: `Generous Daily Leeway (${currency}${safeData.safeAmount}/day)`,
        body: 'You are on track to build a solid surplus this week! Any unspent funds will boost your monthly savings ledger.',
        category: 'general',
        priority: 4
      });
    }

    // 6. Campus Student Hacks
    const generalTips = [
      {
        id: 'hack-perk',
        type: 'savings',
        badge: '💡 Student Discount',
        title: 'Leverage Student ID Benefits',
        body: 'Show your college ID at local cafes, bookshops, and transport counters to claim available student discounts.',
        category: 'other',
        priority: 5
      },
      {
        id: 'hack-mess',
        type: 'savings',
        badge: '🧼 Campus Living Tip',
        title: 'Split Bulk Necessities',
        body: 'Pool together with roommates for laundry packs, cleaning supplies, and room essentials to save on individual costs.',
        category: 'necessities',
        priority: 5
      }
    ];

    if (insights.length < 3) {
      insights.push(...generalTips);
    }

    insights.sort((a, b) => a.priority - b.priority);
    return insights;
  },

  getHeroHighlightTip(week) {
    const all = this.generateInsights(week);
    return all[0] || {
      badge: '💡 Campus Coach',
      title: 'Smart Spending',
      body: 'Track your daily expenses regularly to maintain a healthy monthly savings rate.'
    };
  }
};

window.CampusInsights = CampusInsights;
