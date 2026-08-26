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
    const headers = ['Day / Category', 'Food', 'Necessities', 'Clothes', 'Entertainment/Recreation', 'Other', 'Daily Total'];
    csvContent += headers.map(h => `"${h}"`).join(',') + '\r\n';

    // Budget Limit Row
    const budgetRow = [
      'Allotted Limit',
      (week.allottedBudgets.food || 0).toFixed(2),
      (week.allottedBudgets.necessities || 0).toFixed(2),
      (week.allottedBudgets.clothes || 0).toFixed(2),
      (week.allottedBudgets.entertainment || 0).toFixed(2),
      (week.allottedBudgets.other || 0).toFixed(2),
      allottedTotal.toFixed(2)
    ];
    csvContent += budgetRow.map(v => `"${v}"`).join(',') + '\r\n';

    // 7 Daily Rows with notes
    for (let d = 0; d < 7; d++) {
      const dayData = week.dailySpends[d] || {};
      const formatCell = (catId) => {
        const item = dayData[catId];
        const amt = CampusCalculator.getSpendAmount(item);
        const note = CampusCalculator.getSpendNote(item);
        if (amt === 0) return '0.00';
        return note ? `${amt.toFixed(2)} (${note})` : `${amt.toFixed(2)}`;
      };

      const row = [
        DAYS_OF_WEEK[d].name,
        formatCell('food'),
        formatCell('necessities'),
        formatCell('clothes'),
        formatCell('entertainment'),
        formatCell('other'),
        dailyTotals[d].toFixed(2)
      ];
      csvContent += row.map(v => `"${v}"`).join(',') + '\r\n';
    }

    // Category Total Spent Row
    const totalSpentRow = [
      'Total Spent',
      catTotals.food.toFixed(2),
      catTotals.necessities.toFixed(2),
      catTotals.clothes.toFixed(2),
      catTotals.entertainment.toFixed(2),
      catTotals.other.toFixed(2),
      (grandSpent - surprises).toFixed(2)
    ];
    csvContent += totalSpentRow.map(v => `"${v}"`).join(',') + '\r\n';

    // Category Remaining Row
    const remData = CampusCalculator.getCategoryRemaining(week);
    const remRow = [
      'Remaining Allowance',
      remData.food.toFixed(2),
      remData.necessities.toFixed(2),
      remData.clothes.toFixed(2),
      remData.entertainment.toFixed(2),
      remData.other.toFixed(2),
      (allottedTotal - (grandSpent - surprises)).toFixed(2)
    ];
    csvContent += remRow.map(v => `"${v}"`).join(',') + '\r\n\r\n';

    // Surprises Breakdown
    csvContent += `"Surprises & Unexpected Expenses"\r\n`;
    csvContent += `"Description","Amount (${currency})","Day Incurred"\r\n`;
    if (week.surprises && week.surprises.length > 0) {
      week.surprises.forEach(s => {
        const dayName = DAYS_OF_WEEK[s.day] ? DAYS_OF_WEEK[s.day].name : 'N/A';
        csvContent += `"${s.desc}","${s.amount.toFixed(2)}","${dayName}"\r\n`;
      });
      csvContent += `"Total Surprises","${surprises.toFixed(2)}",""\r\n`;
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

    CampusNotifications.showToast('CSV Export downloaded successfully!', 'success');
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

        // Header Background (Google Calendar soft blue)
        doc.setFillColor(26, 115, 232);
        doc.rect(0, 0, 210, 36, 'F');

        // Brand Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('CampusCoin', 15, 18);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Student Finance & Weekly Expense Statement', 15, 26);
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
        doc.setTextColor(24, 128, 56);
        doc.text(`${currency}${endingBalance.toFixed(2)}`, 145, 60);

        // Safe To Spend Banner
        doc.setFillColor(232, 240, 254);
        doc.roundedRect(15, 70, 180, 10, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(26, 115, 232);
        doc.text(`Safe to Spend Allowance: ${currency}${safeData.safeAmount}/day (${safeData.daysRemaining} days remaining in week)`, 20, 77);

        // Table
        let startY = 88;
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);

        doc.setFillColor(241, 245, 249);
        doc.rect(15, startY, 180, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Day', 18, startY + 5);
        doc.text('Food', 45, startY + 5);
        doc.text('Necess.', 75, startY + 5);
        doc.text('Clothes', 105, startY + 5);
        doc.text('Entertain.', 135, startY + 5);
        doc.text('Other', 165, startY + 5);
        doc.text('Daily Total', 180, startY + 5);

        doc.setFont('helvetica', 'normal');
        startY += 8;

        for (let d = 0; d < 7; d++) {
          const dayData = week.dailySpends[d] || {};
          if (d % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(15, startY - 1, 180, 6, 'F');
          }
          doc.text(DAYS_OF_WEEK[d].short, 18, startY + 4);
          doc.text(`${CampusCalculator.getSpendAmount(dayData.food).toFixed(0)}`, 45, startY + 4);
          doc.text(`${CampusCalculator.getSpendAmount(dayData.necessities).toFixed(0)}`, 75, startY + 4);
          doc.text(`${CampusCalculator.getSpendAmount(dayData.clothes).toFixed(0)}`, 105, startY + 4);
          doc.text(`${CampusCalculator.getSpendAmount(dayData.entertainment).toFixed(0)}`, 135, startY + 4);
          doc.text(`${CampusCalculator.getSpendAmount(dayData.other).toFixed(0)}`, 165, startY + 4);
          doc.setFont('helvetica', 'bold');
          doc.text(`${dailyTotals[d].toFixed(0)}`, 180, startY + 4);
          doc.setFont('helvetica', 'normal');
          startY += 6.5;
        }

        // Totals
        startY += 2;
        doc.setFillColor(241, 245, 249);
        doc.rect(15, startY, 180, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Totals', 18, startY + 5);
        doc.text(`${catTotals.food.toFixed(0)}`, 45, startY + 5);
        doc.text(`${catTotals.necessities.toFixed(0)}`, 75, startY + 5);
        doc.text(`${catTotals.clothes.toFixed(0)}`, 105, startY + 5);
        doc.text(`${catTotals.entertainment.toFixed(0)}`, 135, startY + 5);
        doc.text(`${catTotals.other.toFixed(0)}`, 165, startY + 5);
        doc.text(`${currency}${grandSpent.toFixed(2)}`, 178, startY + 5);

        // Surprises
        startY += 14;
        doc.setFontSize(9.5);
        doc.text('Surprises & Unexpected Expenses:', 15, startY);
        startY += 5;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');

        if (week.surprises && week.surprises.length > 0) {
          week.surprises.forEach(s => {
            doc.text(`• ${s.desc} - ${currency}${s.amount.toFixed(2)}`, 20, startY);
            startY += 4.5;
          });
        } else {
          doc.text('• None recorded this week.', 20, startY);
          startY += 4.5;
        }

        // Footer
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('CampusCoin • Personal Finance Web App for College Students', 15, 285);

        doc.save(`campuscoin_${week.id || 'statement'}.pdf`);
        CampusNotifications.showToast('PDF Statement downloaded successfully!', 'success');
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
