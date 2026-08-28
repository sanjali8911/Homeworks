/**
 * CampusCoin Export & Report Generator
 * Exports CSV with text notes and generates printable PDF summaries in INR (₹).
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

        doc.setFillColor(241, 245, 249);
        doc.rect(15, startY, 180, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Day', 20, startY + 5);
        doc.text('Food (24%)', 65, startY + 5);
        doc.text('Necessities (76%)', 115, startY + 5);
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
  }
};

window.CampusExport = CampusExport;
