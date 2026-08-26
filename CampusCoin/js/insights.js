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

    // 1. Entertainment/Recreation Analysis
    const entSpent = catTotals.entertainment || 0;
    const entBudget = parseFloat(budgets.entertainment) || 1;
    const entRatio = (entSpent / entBudget) * 100;

    if (entRatio >= 90) {
      insights.push({
        id: 'ent-critical',
        type: 'urgent',
        badge: '🚨 Recreation Alert',
        title: `Entertainment/Recreation Reaching Limit (${Math.round(entRatio)}%)`,
        body: 'Recreation expenses are high this week. Check out free campus movie screenings, sports complex events, and hostel game nights this weekend!',
        category: 'entertainment',
        priority: 1
      });
    } else if (entRatio >= 70 && isApproachingWeekend) {
      insights.push({
        id: 'ent-weekend',
        type: 'weekend',
        badge: '🍿 Weekend Caution',
        title: 'Pace Weekend Recreation',
        body: `You have ${currency}${(entBudget - entSpent).toFixed(0)} left for entertainment. Plan pocket-friendly campus outings to avoid exceeding your target.`,
        category: 'entertainment',
        priority: 2
      });
    } else if (entRatio < 40 && currentDay >= 3) {
      insights.push({
        id: 'ent-good',
        type: 'savings',
        badge: '🏆 Smart Pacing',
        title: 'Recreation Well Under Budget',
        body: 'Great discipline keeping outings and recreational spending controlled mid-week! Room for weekend fun.',
        category: 'entertainment',
        priority: 3
      });
    }

    // 2. Food Analysis
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

    // 3. Clothes & Necessities
    const clothSpent = catTotals.clothes || 0;
    const clothBudget = parseFloat(budgets.clothes) || 1;
    if (clothSpent > clothBudget) {
      insights.push({
        id: 'cloth-over',
        type: 'urgent',
        badge: '👕 Wardrobe Spending Alert',
        title: 'Clothes Over Allotted Limit',
        body: `Clothing purchases exceeded allotment by ${currency}${(clothSpent - clothBudget).toFixed(0)}. Hold off on further shopping until next week's reset.`,
        category: 'clothes',
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
