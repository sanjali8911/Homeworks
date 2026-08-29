/**
 * CampusCoin Interactive Analytics & Chart Visualizations
 * Styled with Google Calendar-inspired pastel palettes and soft borders.
 */

const CampusCharts = {
  dailyChart: null,
  budgetVsActualChart: null,
  monthlyCategoryChart: null,

  updateCharts(week, state, targetMonthId = 'current') {
    if (!window.Chart) return;
    if (!week) week = CampusState.getActiveWeek();
    if (!state) state = CampusState.state;

    this.renderDailySpendingChart(week);
    this.renderBudgetVsActualChart(week);
    this.renderMonthlyCategoryChart(state, targetMonthId);

    if (this.dailyChart) this.dailyChart.resize();
    if (this.budgetVsActualChart) this.budgetVsActualChart.resize();
    if (this.monthlyCategoryChart) this.monthlyCategoryChart.resize();
  },

  /**
   * Daily Spending Bar Chart
   */
  renderDailySpendingChart(week) {
    const canvas = document.getElementById('daily-spending-chart');
    if (!canvas) return;

    const dailyTotals = CampusCalculator.getDailyTotals(week);
    const labels = DAYS_OF_WEEK.map(d => d.name);

    if (this.dailyChart) {
      this.dailyChart.data.datasets[0].data = dailyTotals;
      this.dailyChart.update();
      return;
    }

    const ctx = canvas.getContext('2d');
    this.dailyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Daily Spend (₹)',
          data: dailyTotals,
          backgroundColor: '#4285f4', // Google Cal Blue
          borderColor: '#1a73e8',
          borderWidth: 1,
          borderRadius: 6,
          hoverBackgroundColor: '#1a73e8'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { family: 'Outfit', size: 12 },
            bodyFont: { family: 'JetBrains Mono', size: 12 },
            callbacks: {
              label: (context) => ` Spent: ₹${context.raw.toFixed(2)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { family: 'Outfit', size: 11 } }
          },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 11 },
              callback: (value) => `₹${value}`
            },
            beginAtZero: true
          }
        }
      }
    });
  },

  /**
   * Budget vs Actual Spending Comparison Chart
   */
  renderBudgetVsActualChart(week) {
    const canvas = document.getElementById('budget-vs-actual-chart');
    if (!canvas) return;

    const catTotals = CampusCalculator.getCategoryTotals(week);
    const budgets = week.allottedBudgets || {};

    const labels = CATEGORIES.map(c => c.name);
    const budgetData = CATEGORIES.map(c => parseFloat(budgets[c.id]) || 0);
    const spentData = CATEGORIES.map(c => catTotals[c.id] || 0);

    if (this.budgetVsActualChart) {
      this.budgetVsActualChart.data.datasets[0].data = budgetData;
      this.budgetVsActualChart.data.datasets[1].data = spentData;
      this.budgetVsActualChart.update();
      return;
    }

    const ctx = canvas.getContext('2d');
    this.budgetVsActualChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Allotted Limit',
            data: budgetData,
            backgroundColor: '#e2e8f0',
            borderColor: '#cbd5e1',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'Actual Spent',
            data: spentData,
            backgroundColor: '#34a853', // Google Cal Sage/Green
            borderColor: '#1e8e3e',
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#334155', font: { family: 'Outfit', size: 12 } }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { family: 'Outfit' },
            bodyFont: { family: 'JetBrains Mono' }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { family: 'Outfit', size: 10 } }
          },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 11 },
              callback: (value) => `₹${value}`
            },
            beginAtZero: true
          }
        }
      }
    });
  },

  /**
   * Monthly Category Distribution Donut Chart
   */
  renderMonthlyCategoryChart(state, targetMonthId = 'current') {
    const canvas = document.getElementById('monthly-category-chart');
    if (!canvas) return;

    const summary = CampusCalculator.getMonthlySummary(state, targetMonthId);
    const catTotals = summary.categoryTotals;
    const labels = CATEGORIES.map(c => c.name);
    const data = CATEGORIES.map(c => catTotals[c.id] || 0);

    // Google Calendar soft event palette for Food & Necessities
    const colors = [
      '#4285f4', // Food (Blue)
      '#34a853'  // Necessities (Green)
    ];

    if (this.monthlyCategoryChart) {
      this.monthlyCategoryChart.data.datasets[0].data = data;
      this.monthlyCategoryChart.update();
      return;
    }

    const ctx = canvas.getContext('2d');
    this.monthlyCategoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#475569',
              font: { family: 'Outfit', size: 11 },
              boxWidth: 12
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { family: 'Outfit' },
            bodyFont: { family: 'JetBrains Mono' },
            callbacks: {
              label: (context) => ` ${context.label}: ₹${context.raw.toFixed(2)}`
            }
          }
        }
      }
    });
  }
};

window.CampusCharts = CampusCharts;
