/**
 * CampusCoin Export & Report Generator
 * Exports CSV with text notes and generates printable PDF summaries in INR (₹)
 * Supports both Weekly Statements and Monthly Macro Book Statements.
 */

const CampusExport = {
  exportWeeklyCSV(week) {
    if (!week) week = CampusState.getActiveWeek();
    const currency = CampusState.getCurrency();

    const catTotals = CampusCalculator.getCategoryTotals(week);
    const dailyTotals = CampusCalculator.getDailyTotals(week);
    const grandSpent = CampusCalculator.getGrandTotalSpent(week);
    const surprises = CampusCalculator.getSurprisesTotal(week);
    const endingBalance = CampusCalculator.getEndingBalance(week);
    const allottedTotal = CampusCalculator.getTotalAllottedBudget(week);

    let csvContent = 'data:text/csv;charset=utf-8,';

    // Metadata Header
    csvContent += `CampusCoin - Student Financial Statement\r\n`;
    csvContent += `Week Period,"${week.label || week.id}"\r\n`;
    csvContent += `Starting Balance,${currency}${week.startingBalance.toFixed(2)}\r\n`;
    csvContent += `Ending Balance,${currency}${endingBalance.toFixed(2)}\r\n`;
    csvContent += `Total Allotted Budget,${currency}${allottedTotal.toFixed(2)}\r\n`;
    csvContent += `Grand Total Spent,${currency}${grandSpent.toFixed(2)}\r\n\r\n`;

    // Table Header
    const headers = ['Day / Category', 'Food', 'Necessities', 'Daily Total'];
    csvContent += headers.map(h => `"${h}"`).join(',') + '\r\n';

    // Budget Limit Row
    const budgetRow = [
      'Allotted Limit',
      (week.allottedBudgets.food || 0).toFixed(2),
      (week.allottedBudgets.necessities || 0).toFixed(2),
      allottedTotal.toFixed(2)
    ];
    csvContent += budgetRow.map(v => `"${v}"`).join(',') + '\r\n';

    // 7 Daily Rows with item labels
    for (let d = 0; d < 7; d++) {
      const dayData = week.dailySpends[d] || {};
      const formatCell = (catId) => {
        const cellObj = dayData[catId];
        const items = CampusCalculator.getSpendItems(cellObj);
        const amt = CampusCalculator.getSpendAmount(cellObj);
        if (items.length === 0) return '0.00';
        const itemStr = items.map(it => `${it.name}: ${currency}${it.amount}${it.isBorrowed ? ' [Borrowed]' : ''}`).join('; ');
        return `${currency}${amt.toFixed(2)} (${itemStr})`;
      };

      const row = [
        DAYS_OF_WEEK[d].name,
        formatCell('food'),
        formatCell('necessities'),
        dailyTotals[d].toFixed(2)
      ];
      csvContent += row.map(v => `"${v}"`).join(',') + '\r\n';
    }

    // Category Total Spent Row
    const totalSpentRow = [
      'Total Spent',
      catTotals.food.toFixed(2),
      catTotals.necessities.toFixed(2),
      (grandSpent - surprises).toFixed(2)
    ];
    csvContent += totalSpentRow.map(v => `"${v}"`).join(',') + '\r\n';

    // Category Remaining Row
    const remData = CampusCalculator.getCategoryBalances(week);
    const remRow = [
      'Remaining Allowance',
      remData.food.toFixed(2),
      remData.necessities.toFixed(2),
      (allottedTotal - (grandSpent - surprises)).toFixed(2)
    ];
    csvContent += remRow.map(v => `"${v}"`).join(',') + '\r\n\r\n';

    // Itemized Expense Breakdown with Labels
    csvContent += `"Detailed Itemized Expense Log"\r\n`;
    csvContent += `"Day","Category","Item Name / Label","Amount (${currency})","Type"\r\n`;
    let hasItems = false;
    for (let d = 0; d < 7; d++) {
      const dayData = week.dailySpends[d] || {};
      CATEGORIES.forEach(cat => {
        const items = CampusCalculator.getSpendItems(dayData[cat.id]);
        items.forEach(it => {
          hasItems = true;
          csvContent += `"${DAYS_OF_WEEK[d].name}","${cat.name}","${it.name}","${currency}${parseFloat(it.amount).toFixed(2)}","${it.isBorrowed ? 'Borrowed from Necessities' : 'Direct Allotment'}"\r\n`;
        });
      });
    }
    if (!hasItems) {
      csvContent += `"None recorded","--","--","0.00","--"\r\n`;
    }
    csvContent += `\r\n`;

    // Surprises Breakdown
    csvContent += `"Surprises & Unexpected Expenses"\r\n`;
    csvContent += `"Description","Amount (${currency})","Day Incurred"\r\n`;
    if (week.surprises && week.surprises.length > 0) {
      week.surprises.forEach(s => {
        const dayName = DAYS_OF_WEEK[s.day] ? DAYS_OF_WEEK[s.day].name : 'N/A';
        csvContent += `"${s.desc}","${currency}${parseFloat(s.amount).toFixed(2)}","${dayName}"\r\n`;
      });
      csvContent += `"Total Surprises","${currency}${surprises.toFixed(2)}",""\r\n`;
    } else {
      csvContent += `"None recorded","0.00",""\r\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campuscoin_${week.id || 'weekly_budget'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    CampusNotifications.showToast('CSV Statement with item labels downloaded!', 'success');
  },

  exportWeeklyPDF(week) {
    if (!week) week = CampusState.getActiveWeek();
    const currency = CampusState.getCurrency();

    try {
      if (window.jspdf && window.jspdf.jsPDF) {
        const doc = new window.jspdf.jsPDF();

        const catTotals = CampusCalculator.getCategoryTotals(week);
        const dailyTotals = CampusCalculator.getDailyTotals(week);
        const grandSpent = CampusCalculator.getGrandTotalSpent(week);
        const surprises = CampusCalculator.getSurprisesTotal(week);
        const endingBalance = CampusCalculator.getEndingBalance(week);
        const allottedTotal = CampusCalculator.getTotalAllottedBudget(week);
        const safeData = CampusCalculator.getSafeToSpendToday(week);

        // Header Background (Google Calendar blue)
        doc.setFillColor(26, 115, 232);
        doc.rect(0, 0, 210, 36, 'F');

        // Brand Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('CampusCoin', 15, 18);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Weekly Financial Statement • ${week.label || week.id}`, 15, 26);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 145, 26);

        // Metric Cards
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(15, 44, 55, 20, 2, 2, 'F');
        doc.roundedRect(77, 44, 55, 20, 2, 2, 'F');
        doc.roundedRect(140, 44, 55, 20, 2, 2, 'F');

        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('STARTING CASH', 20, 52);
        doc.text('TOTAL SPENT', 82, 52);
        doc.text('ENDING BALANCE', 145, 52);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${currency}${week.startingBalance.toFixed(2)}`, 20, 60);
        doc.text(`${currency}${grandSpent.toFixed(2)}`, 82, 60);
        if (endingBalance < 0) {
          doc.setTextColor(217, 48, 37);
        } else {
          doc.setTextColor(24, 128, 56);
        }
        doc.text(`${currency}${endingBalance.toFixed(2)}`, 145, 60);

        // Safe To Spend Banner
        doc.setFillColor(232, 240, 254);
        doc.roundedRect(15, 70, 180, 10, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(26, 115, 232);
        doc.text(`Safe to Spend Allowance: ${currency}${safeData.safeAmount}/day (${safeData.daysRemaining} days remaining in week)`, 20, 77);

        // Daily Summary Table
        let startY = 88;
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);

        const pcts = (typeof CampusState !== 'undefined' && typeof CampusState.getBudgetPercentages === 'function')
          ? CampusState.getBudgetPercentages()
          : { food: 24, necessities: 76 };

        doc.setFillColor(241, 245, 249);
        doc.rect(15, startY, 180, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Day', 20, startY + 5);
        doc.text(`Food (${pcts.food}%)`, 65, startY + 5);
        doc.text(`Necessities (${pcts.necessities}%)`, 115, startY + 5);
        doc.text('Daily Total', 165, startY + 5);

        doc.setFont('helvetica', 'normal');
        startY += 8;

        for (let d = 0; d < 7; d++) {
          const dayData = week.dailySpends[d] || {};
          if (d % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(15, startY - 1, 180, 6, 'F');
          }
          doc.text(DAYS_OF_WEEK[d].name, 20, startY + 4);
          doc.text(`${currency}${CampusCalculator.getSpendAmount(dayData.food).toFixed(0)}`, 65, startY + 4);
          doc.text(`${currency}${CampusCalculator.getSpendAmount(dayData.necessities).toFixed(0)}`, 115, startY + 4);
          doc.setFont('helvetica', 'bold');
          doc.text(`${currency}${dailyTotals[d].toFixed(0)}`, 165, startY + 4);
          doc.setFont('helvetica', 'normal');
          startY += 6.5;
        }

        // Totals Row
        startY += 2;
        doc.setFillColor(241, 245, 249);
        doc.rect(15, startY, 180, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Totals', 20, startY + 5);
        doc.text(`${currency}${catTotals.food.toFixed(0)}`, 65, startY + 5);
        doc.text(`${currency}${catTotals.necessities.toFixed(0)}`, 115, startY + 5);
        doc.text(`${currency}${grandSpent.toFixed(2)}`, 165, startY + 5);

        // Detailed Itemized Expense Breakdown (All Logged Labels)
        startY += 13;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Itemized Expense Ledger (All Logged Items & Labels):', 15, startY);
        startY += 6;

        doc.setFontSize(8.5);
        let itemsCount = 0;

        for (let d = 0; d < 7; d++) {
          const dayData = week.dailySpends[d] || {};
          const foodItems = CampusCalculator.getSpendItems(dayData.food);
          const necItems = CampusCalculator.getSpendItems(dayData.necessities);

          if (foodItems.length > 0 || necItems.length > 0) {
            // Check page overflow
            if (startY > 265) {
              doc.addPage();
              startY = 20;
            }

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text(`${DAYS_OF_WEEK[d].name}:`, 20, startY);
            startY += 4.5;

            doc.setFont('helvetica', 'normal');

            foodItems.forEach(it => {
              itemsCount++;
              if (startY > 270) {
                doc.addPage();
                startY = 20;
              }
              const borrowedTag = it.isBorrowed ? ' [⚡ Borrowed from Necessities]' : '';
              doc.setTextColor(it.isBorrowed ? 217 : 71, it.isBorrowed ? 48 : 85, it.isBorrowed ? 37 : 105);
              doc.text(`   • Food: ${it.name} - ${currency}${parseFloat(it.amount).toFixed(2)}${borrowedTag}`, 24, startY);
              startY += 4.5;
            });

            necItems.forEach(it => {
              itemsCount++;
              if (startY > 270) {
                doc.addPage();
                startY = 20;
              }
              doc.setTextColor(71, 85, 105);
              doc.text(`   • Necessities: ${it.name} - ${currency}${parseFloat(it.amount).toFixed(2)}`, 24, startY);
              startY += 4.5;
            });

            startY += 1.5;
          }
        }

        if (itemsCount === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 116, 139);
          doc.text('   • No itemized expenses logged this week.', 20, startY);
          startY += 5;
        }

        // Surprises Breakdown
        if (startY > 255) {
          doc.addPage();
          startY = 20;
        }

        startY += 4;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Surprise Anomalies (Unbudgeted Emergency Costs):', 15, startY);
        startY += 5.5;

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');

        if (week.surprises && week.surprises.length > 0) {
          week.surprises.forEach(s => {
            if (startY > 270) {
              doc.addPage();
              startY = 20;
            }
            const dayName = DAYS_OF_WEEK[s.day] ? DAYS_OF_WEEK[s.day].name : 'N/A';
            doc.setTextColor(217, 48, 37);
            doc.text(`   • ${s.desc}: ${currency}${parseFloat(s.amount).toFixed(2)} (Incurred on ${dayName})`, 20, startY);
            startY += 4.5;
          });
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 116, 139);
          doc.text('   • None recorded this week.', 20, startY);
          startY += 4.5;
        }

        // Footer on bottom of page
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('CampusCoin • Personal Finance Web App for College Students', 15, 285);

        doc.save(`campuscoin_${week.id || 'statement'}.pdf`);
        CampusNotifications.showToast('PDF Statement with item labels downloaded!', 'success');
      } else {
        window.print();
      }
    } catch (e) {
      console.error('PDF Generation Error:', e);
      window.print();
    }
  },

  /**
   * Generates a comprehensive Monthly PDF statement containing:
   * 1. Top Header Banner & Generation Info
   * 2. Monthly Macro KPI Summary Cards (Allotted, Spent, Net Savings, Surprises)
   * 3. Monthly 4-Week Macro Ledger Table (Week Period, Allotted, Spent, Surprises, Ending Balance, Status)
   * 4. Consolidated Weekly Breakdown & Itemized Expense Ledgers for all weeks in the month
   */
  exportMonthlyPDF(targetMonthId, state) {
    if (!targetMonthId) {
      if (typeof selectedMonthlyBookMonth !== 'undefined' && selectedMonthlyBookMonth) {
        targetMonthId = selectedMonthlyBookMonth;
      } else if (typeof window !== 'undefined' && window.selectedMonthlyBookMonth) {
        targetMonthId = window.selectedMonthlyBookMonth;
      } else {
        const activeWeek = CampusState.getActiveWeek();
        targetMonthId = (typeof getWeekDateInfo === 'function') ? getWeekDateInfo(activeWeek.id).monthId : 'current';
      }
    }

    if (!state) state = CampusState.state;
    const currency = CampusState.getCurrency();
    const summary = CampusCalculator.getMonthlySummary(state, targetMonthId);

    try {
      if (window.jspdf && window.jspdf.jsPDF) {
        const doc = new window.jspdf.jsPDF();

        // 1. Header Background (Google Calendar blue)
        doc.setFillColor(26, 115, 232);
        doc.rect(0, 0, 210, 36, 'F');

        // Brand Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('CampusCoin', 14, 18);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Monthly Financial Statement • ${summary.monthLabel}`, 14, 26);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 142, 26);

        // 2. Macro Metric Cards (4 cards across width)
        const cardY = 42;
        const cardH = 21;
        const cardW = 42.5;

        // Card 1: Allotted
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, cardY, cardW, cardH, 2, 2, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL ALLOTTED', 18, cardY + 7);
        doc.setFontSize(11.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${currency}${summary.totalAllotted.toFixed(0)}`, 18, cardY + 16);

        // Card 2: Total Spent
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(60.5, cardY, cardW, cardH, 2, 2, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL SPENT', 64.5, cardY + 7);
        doc.setFontSize(11.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${currency}${summary.totalSpent.toFixed(0)}`, 64.5, cardY + 14);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(`${summary.spendPct}% of budget`, 64.5, cardY + 19);

        // Card 3: Net Savings
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(107, cardY, cardW, cardH, 2, 2, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'bold');
        doc.text('NET SAVINGS', 111, cardY + 7);
        doc.setFontSize(11.5);
        if (summary.netSavings >= 0) {
          doc.setTextColor(24, 128, 56);
          doc.text(`+${currency}${summary.netSavings.toFixed(0)}`, 111, cardY + 14);
        } else {
          doc.setTextColor(217, 48, 37);
          doc.text(`-${currency}${Math.abs(summary.netSavings).toFixed(0)}`, 111, cardY + 14);
        }
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(`${summary.savingsRate}% Savings Rate`, 111, cardY + 19);

        // Card 4: Surprises Absorbed
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(153.5, cardY, cardW, cardH, 2, 2, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'bold');
        doc.text('SURPRISES ABSORBED', 157.5, cardY + 7);
        doc.setFontSize(11.5);
        doc.setTextColor(217, 48, 37);
        doc.text(`${currency}${summary.totalSurprises.toFixed(0)}`, 157.5, cardY + 14);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text('Unbudgeted Costs', 157.5, cardY + 19);

        // 3. Monthly Macro Table (The table on top)
        let startY = 70;
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`Monthly Book – 4-Week Macro Ledger (${summary.monthLabel})`, 14, startY);
        startY += 5;

        // Table Header
        doc.setFillColor(241, 245, 249);
        doc.rect(14, startY, 182, 7, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Week Period', 18, startY + 5);
        doc.text('Allotted', 75, startY + 5);
        doc.text('Total Spent', 102, startY + 5);
        doc.text('Surprises', 128, startY + 5);
        doc.text('Ending Balance', 152, startY + 5);
        doc.text('Status', 180, startY + 5);

        startY += 7.5;
        doc.setFont('helvetica', 'normal');

        const currentCalWeekId = (typeof getWeekIdentifier === 'function') ? getWeekIdentifier(new Date()) : null;
        const defaultCash = (typeof CampusState.getDefaultStartingCash === 'function') ? CampusState.getDefaultStartingCash() : 7500;

        summary.weekRows.forEach((w, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, startY - 1, 182, 6.5, 'F');
          }
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text(w.label, 18, startY + 4);
          doc.setFont('helvetica', 'normal');
          doc.text(`${currency}${w.allotted.toFixed(0)}`, 75, startY + 4);
          doc.text(`${currency}${w.spent.toFixed(0)}`, 102, startY + 4);

          if (w.surprises > 0) {
            doc.setTextColor(217, 48, 37);
          } else {
            doc.setTextColor(100, 116, 139);
          }
          doc.text(`${currency}${w.surprises.toFixed(0)}`, 128, startY + 4);

          if (w.endingBalance < 0) {
            doc.setTextColor(217, 48, 37);
            doc.setFont('helvetica', 'bold');
            doc.text(`-${currency}${Math.abs(w.endingBalance).toFixed(0)}`, 152, startY + 4);
          } else {
            doc.setTextColor(24, 128, 56);
            doc.setFont('helvetica', 'bold');
            doc.text(`+${currency}${w.endingBalance.toFixed(0)}`, 152, startY + 4);
          }

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          const status = (currentCalWeekId && w.id === currentCalWeekId)
            ? 'Active'
            : (currentCalWeekId && w.id > currentCalWeekId ? 'Upcoming' : (w.finalized ? 'Archived' : 'Concluded'));
          doc.text(status, 180, startY + 4);

          startY += 6.5;
        });

        // Totals Row
        startY += 1;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, startY, 182, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Monthly Totals', 18, startY + 5);
        doc.text(`${currency}${summary.totalAllotted.toFixed(0)}`, 75, startY + 5);
        doc.text(`${currency}${summary.totalSpent.toFixed(0)}`, 102, startY + 5);
        doc.setTextColor(217, 48, 37);
        doc.text(`${currency}${summary.totalSurprises.toFixed(0)}`, 128, startY + 5);
        if (summary.netSavings < 0) {
          doc.setTextColor(217, 48, 37);
          doc.text(`-${currency}${Math.abs(summary.netSavings).toFixed(0)}`, 152, startY + 5);
        } else {
          doc.setTextColor(24, 128, 56);
          doc.text(`+${currency}${summary.netSavings.toFixed(0)}`, 152, startY + 5);
        }
        doc.setTextColor(71, 85, 105);
        doc.text('Macro Total', 178, startY + 5);

        startY += 13;

        // 4. Detailed Breakdown of All Weeks in the Month
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Consolidated Weekly Expense Ledgers & Daily Matrices:', 14, startY);
        startY += 6;

        summary.weekRows.forEach((wRow) => {
          let w = (state && state.weeks) ? state.weeks[wRow.id] : null;
          if (!w) {
            const info = getWeekDateInfo(wRow.id);
            const startVal = (currentCalWeekId && wRow.id >= currentCalWeekId) ? defaultCash : 0;
            w = (typeof createEmptyWeek === 'function')
              ? createEmptyWeek(wRow.id, info.fullLabel, info.startDate, startVal)
              : { id: wRow.id, label: info.fullLabel, startingBalance: startVal, allottedBudgets: { food: startVal * 0.24, necessities: startVal * 0.76 }, dailySpends: {}, surprises: [] };
          }

          const catTotals = CampusCalculator.getCategoryTotals(w);
          const dailyTotals = CampusCalculator.getDailyTotals(w);
          const grandSpent = CampusCalculator.getGrandTotalSpent(w);

          // Check page overflow for starting a new week block
          if (startY > 220) {
            doc.addPage();
            startY = 20;
          }

          // Week Sub-Header Strip
          doc.setFillColor(238, 242, 255);
          doc.roundedRect(14, startY, 182, 8, 1.5, 1.5, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(26, 115, 232);
          doc.text(`${wRow.label} • (${w.id})`, 18, startY + 5.5);

          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text(`Starting: ${currency}${w.startingBalance.toFixed(0)}  |  Spent: ${currency}${grandSpent.toFixed(0)}  |  Ending: ${currency}${wRow.endingBalance.toFixed(0)}`, 95, startY + 5.5);
          startY += 11;

          // Daily Matrix Table for this week
          doc.setFillColor(241, 245, 249);
          doc.rect(18, startY, 174, 6, 'F');
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text('Day', 22, startY + 4.2);
          doc.text('Food (24%)', 68, startY + 4.2);
          doc.text('Necessities (76%)', 115, startY + 4.2);
          doc.text('Daily Total', 162, startY + 4.2);
          startY += 6.5;

          doc.setFont('helvetica', 'normal');
          for (let d = 0; d < 7; d++) {
            const dayData = w.dailySpends[d] || {};
            if (d % 2 === 1) {
              doc.setFillColor(248, 250, 252);
              doc.rect(18, startY - 0.8, 174, 5, 'F');
            }
            doc.text(DAYS_OF_WEEK[d].name, 22, startY + 3.5);
            doc.text(`${currency}${CampusCalculator.getSpendAmount(dayData.food).toFixed(0)}`, 68, startY + 3.5);
            doc.text(`${currency}${CampusCalculator.getSpendAmount(dayData.necessities).toFixed(0)}`, 115, startY + 3.5);
            doc.setFont('helvetica', 'bold');
            doc.text(`${currency}${dailyTotals[d].toFixed(0)}`, 162, startY + 3.5);
            doc.setFont('helvetica', 'normal');
            startY += 5.2;
          }

          // Matrix Totals
          doc.setFillColor(241, 245, 249);
          doc.rect(18, startY, 174, 5.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.text('Week Total', 22, startY + 4);
          doc.text(`${currency}${catTotals.food.toFixed(0)}`, 68, startY + 4);
          doc.text(`${currency}${catTotals.necessities.toFixed(0)}`, 115, startY + 4);
          doc.text(`${currency}${grandSpent.toFixed(0)}`, 162, startY + 4);
          startY += 8;

          // Itemized expense ledger for this week
          let weekItemCount = 0;
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text(`Itemized Expense Notes:`, 22, startY);
          startY += 4.5;
          doc.setFont('helvetica', 'normal');

          for (let d = 0; d < 7; d++) {
            const dayData = w.dailySpends[d] || {};
            const foodItems = CampusCalculator.getSpendItems(dayData.food);
            const necItems = CampusCalculator.getSpendItems(dayData.necessities);

            if (foodItems.length > 0 || necItems.length > 0) {
              if (startY > 270) {
                doc.addPage();
                startY = 20;
              }
              foodItems.forEach(it => {
                weekItemCount++;
                if (startY > 275) {
                  doc.addPage();
                  startY = 20;
                }
                const borrowed = it.isBorrowed ? ' [⚡ Borrowed from Necessities]' : '';
                doc.setTextColor(it.isBorrowed ? 217 : 71, it.isBorrowed ? 48 : 85, it.isBorrowed ? 37 : 105);
                doc.text(`   • ${DAYS_OF_WEEK[d].short} • Food: ${it.name} - ${currency}${parseFloat(it.amount).toFixed(2)}${borrowed}`, 24, startY);
                startY += 4;
              });

              necItems.forEach(it => {
                weekItemCount++;
                if (startY > 275) {
                  doc.addPage();
                  startY = 20;
                }
                doc.setTextColor(71, 85, 105);
                doc.text(`   • ${DAYS_OF_WEEK[d].short} • Necessities: ${it.name} - ${currency}${parseFloat(it.amount).toFixed(2)}`, 24, startY);
                startY += 4;
              });
            }
          }

          if (weekItemCount === 0) {
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(148, 163, 184);
            doc.text(`   • No individual items logged for this week.`, 24, startY);
            startY += 4.5;
          }

          // Surprises for this week
          if (w.surprises && w.surprises.length > 0) {
            if (startY > 265) {
              doc.addPage();
              startY = 20;
            }
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(217, 48, 37);
            doc.text(`   Surprise Anomalies:`, 22, startY);
            startY += 4;
            doc.setFont('helvetica', 'normal');
            w.surprises.forEach(s => {
              if (startY > 275) {
                doc.addPage();
                startY = 20;
              }
              const dayName = DAYS_OF_WEEK[s.day] ? DAYS_OF_WEEK[s.day].name : 'N/A';
              doc.text(`   • ${s.desc}: ${currency}${parseFloat(s.amount).toFixed(2)} (Incurred on ${dayName})`, 24, startY);
              startY += 4;
            });
          }

          startY += 5; // Space after each week block
        });

        // Page Numbers & Footers on all pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.setFont('helvetica', 'normal');
          doc.text(`CampusCoin • Monthly Financial Statement • ${summary.monthLabel}`, 14, 288);
          doc.text(`Page ${i} of ${totalPages}`, 180, 288);
        }

        doc.save(`campuscoin_${summary.monthId}_monthly_statement.pdf`);
        CampusNotifications.showToast(`Monthly PDF Statement (${summary.monthLabel}) downloaded!`, 'success');
      } else {
        window.print();
      }
    } catch (e) {
      console.error('Monthly PDF Generation Error:', e);
      window.print();
    }
  },

  /**
   * Generates a CSV export for the entire Monthly Book
   */
  exportMonthlyCSV(targetMonthId, state) {
    if (!targetMonthId) {
      if (typeof selectedMonthlyBookMonth !== 'undefined' && selectedMonthlyBookMonth) {
        targetMonthId = selectedMonthlyBookMonth;
      } else if (typeof window !== 'undefined' && window.selectedMonthlyBookMonth) {
        targetMonthId = window.selectedMonthlyBookMonth;
      } else {
        const activeWeek = CampusState.getActiveWeek();
        targetMonthId = (typeof getWeekDateInfo === 'function') ? getWeekDateInfo(activeWeek.id).monthId : 'current';
      }
    }

    if (!state) state = CampusState.state;
    const currency = CampusState.getCurrency();
    const summary = CampusCalculator.getMonthlySummary(state, targetMonthId);

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `CampusCoin - Monthly Financial Statement\r\n`;
    csvContent += `Month Period,"${summary.monthLabel}"\r\n`;
    csvContent += `Total Allotted Budget,${currency}${summary.totalAllotted.toFixed(2)}\r\n`;
    csvContent += `Total Spent,${currency}${summary.totalSpent.toFixed(2)}\r\n`;
    csvContent += `Net Savings,${currency}${summary.netSavings.toFixed(2)}\r\n`;
    csvContent += `Savings Rate,${summary.savingsRate}%\r\n`;
    csvContent += `Surprises Absorbed,${currency}${summary.totalSurprises.toFixed(2)}\r\n\r\n`;

    // Macro Table
    csvContent += `"Monthly Weeks Macro Summary"\r\n`;
    csvContent += `"Week Period","Allotted (${currency})","Total Spent (${currency})","Surprises (${currency})","Ending Balance (${currency})","Status"\r\n`;
    summary.weekRows.forEach(w => {
      csvContent += `"${w.label}","${w.allotted.toFixed(2)}","${w.spent.toFixed(2)}","${w.surprises.toFixed(2)}","${w.endingBalance.toFixed(2)}","${w.finalized ? 'Archived' : 'Active/Concluded'}"\r\n`;
    });
    csvContent += `\r\n`;

    // Detailed Weekly Ledgers
    const currentCalWeekId = (typeof getWeekIdentifier === 'function') ? getWeekIdentifier(new Date()) : null;
    const defaultCash = (typeof CampusState.getDefaultStartingCash === 'function') ? CampusState.getDefaultStartingCash() : 7500;

    summary.weekRows.forEach(wRow => {
      let w = (state && state.weeks) ? state.weeks[wRow.id] : null;
      if (!w) {
        const info = getWeekDateInfo(wRow.id);
        const startVal = (currentCalWeekId && wRow.id >= currentCalWeekId) ? defaultCash : 0;
        w = (typeof createEmptyWeek === 'function')
          ? createEmptyWeek(wRow.id, info.fullLabel, info.startDate, startVal)
          : { id: wRow.id, label: info.fullLabel, startingBalance: startVal, allottedBudgets: { food: startVal * 0.24, necessities: startVal * 0.76 }, dailySpends: {}, surprises: [] };
      }

      csvContent += `"========================================="\r\n`;
      csvContent += `"Week: ${wRow.label} (${w.id})"\r\n`;
      csvContent += `"Starting Cash",${currency}${w.startingBalance.toFixed(2)}\r\n`;
      csvContent += `"Total Spent",${currency}${wRow.spent.toFixed(2)}\r\n`;
      csvContent += `"Ending Balance",${currency}${wRow.endingBalance.toFixed(2)}\r\n\r\n`;

      csvContent += `"Itemized Expense Ledger for ${wRow.label}"\r\n`;
      csvContent += `"Day","Category","Item Name / Label","Amount (${currency})","Type"\r\n`;
      let hasItems = false;
      for (let d = 0; d < 7; d++) {
        const dayData = w.dailySpends[d] || {};
        CATEGORIES.forEach(cat => {
          const items = CampusCalculator.getSpendItems(dayData[cat.id]);
          items.forEach(it => {
            hasItems = true;
            csvContent += `"${DAYS_OF_WEEK[d].name}","${cat.name}","${it.name}","${currency}${parseFloat(it.amount).toFixed(2)}","${it.isBorrowed ? 'Borrowed from Necessities' : 'Direct Allotment'}"\r\n`;
          });
        });
      }
      if (!hasItems) {
        csvContent += `"None recorded","--","--","0.00","--"\r\n`;
      }

      if (w.surprises && w.surprises.length > 0) {
        csvContent += `\r\n"Surprises & Anomalies for ${wRow.label}"\r\n`;
        csvContent += `"Description","Amount (${currency})","Day Incurred"\r\n`;
        w.surprises.forEach(s => {
          const dayName = DAYS_OF_WEEK[s.day] ? DAYS_OF_WEEK[s.day].name : 'N/A';
          csvContent += `"${s.desc}","${currency}${parseFloat(s.amount).toFixed(2)}","${dayName}"\r\n`;
        });
      }
      csvContent += `\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campuscoin_${summary.monthId}_monthly_statement.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    CampusNotifications.showToast(`CSV Statement for ${summary.monthLabel} downloaded!`, 'success');
  }
};

window.CampusExport = CampusExport;
if (typeof global !== 'undefined') {
  global.CampusExport = CampusExport;
}
