/**
 * CampusCoin Main UI Controller & Application Orchestrator (V6.1 - Complete Zero-Sum & Dynamic Dates)
 * - Supreme Lord: Starting Cash dictates the entire zero-sum pool
 * - 24% auto-allotted to Food, 76% (remainder) auto-allotted to Necessities
 * - Clothes, Recreation, and Other ALL default to 0 allotted and are collapsible
 * - Budget input changes enforce Zero-Sum by reallocating to/from Necessities
 * - Zero-Sum Borrowing from Necessities for Food, Clothes, Recreation, and Other
 * - Borrowed items listed in bright RED with ⚡ Borrowed badge
 * - 100% Dynamic Dates (no static days, auto-calculated for every day of the active week)
 */

let activeCellModalDay = 0;
let activeCellModalCat = 'food';
let calPickerYear = new Date().getFullYear();
let calPickerMonth = new Date().getMonth(); // 0-indexed
let pendingBorrowing = null;
let pendingBudgetChange = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  CampusNotifications.init();
  initApp();
});

function initApp() {
  renderAll();

  CampusState.subscribe(() => {
    renderAll();
  });

  setupTableEventListeners();
  setupNavigation();
  setupModals();
  setupExportActions();
  setupSettingsActions();
  setupTodoWidget();
  setupCampusAIDrawer();
  setupCalendarPopover();
  setupColumnCollapsers();
  setupBorrowingModal();
}

/**
 * Master Render Pipeline
 */
function renderAll() {
  const week = CampusState.getActiveWeek();
  const state = CampusState.state;
  const currency = CampusState.getCurrency();

  // 1. Dynamic Dates & Header Labels
  updateWeekNavLabel(week);
  renderDynamicDatesAndTodayBadge(week);

  // 2. Starting Cash & Balance Cushion Strip
  renderStartingBalanceCard(week, currency);

  // 3. Right Sidebar Widgets
  renderSafeToSpendWidget(week, currency);
  renderBudgetVelocityMeter(week, currency);
  renderTodoList();

  // 4. Main Weekly Table with Live Balance Row & Collapsible Columns (Clothes, Recreation, Other)
  renderWeeklyTable(week, currency);

  // 5. Monthly Book Tab
  renderMonthlyBook(state, currency);

  // 6. Interactive Charts
  CampusCharts.updateCharts(week, state);

  if (window.lucide) lucide.createIcons();
}

/**
 * 1. Dynamic Dates & Day Header Labels (100% Dynamic - No Hardcoding!)
 */
function renderDynamicDatesAndTodayBadge(week) {
  const today = new Date();
  const todayDayIndex = today.getDay();
  const todayDayName = today.toLocaleDateString('en-US', { weekday: 'long' });

  // Update Right Sidebar Safe-to-Spend Day Badge
  const todayBadgeEl = document.getElementById('today-day-badge');
  if (todayBadgeEl) {
    todayBadgeEl.textContent = todayDayName;
  }

  // Parse active week startDate
  const startStr = week.startDate || today.toISOString().split('T')[0];
  const startDate = new Date(startStr + 'T00:00:00');

  // Check if active week is the current calendar week
  const currentWeekId = getWeekIdentifier(today);
  const isCurrentCalendarWeek = (week.id === currentWeekId);

  // Render day dates for day 0 (Sunday) to day 6 (Saturday)
  for (let d = 0; d < 7; d++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + d);

    const monthShort = dayDate.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = dayDate.getDate();

    const dateSubEl = document.getElementById(`date-day-${d}`);
    if (dateSubEl) {
      dateSubEl.textContent = `${monthShort} ${dayNum}`;
    }

    const rowEl = document.getElementById(`row-day-${d}`);
    if (rowEl) {
      if (isCurrentCalendarWeek && d === todayDayIndex) {
        rowEl.classList.add('is-today');
      } else {
        rowEl.classList.remove('is-today');
      }
    }
  }
}

function updateWeekNavLabel(week) {
  const labelEl = document.getElementById('current-week-label');
  if (labelEl) {
    labelEl.textContent = week.label || `Week ${week.id}`;
  }

  const badgeEl = document.getElementById('week-status-badge');
  if (badgeEl) {
    if (week.finalized) {
      badgeEl.textContent = 'Archived';
      badgeEl.className = 'pill-badge';
    } else {
      badgeEl.textContent = 'Active';
      badgeEl.className = 'pill-badge badge-active';
    }
  }
}

/**
 * 2. Starting Balance & Cash Flow Cushion Strip
 */
function renderStartingBalanceCard(week, currency) {
  const startInput = document.getElementById('starting-balance-input');
  if (startInput && document.activeElement !== startInput) {
    startInput.value = (parseFloat(week.startingBalance) || 0).toFixed(0);
  }

  const grandSpent = CampusCalculator.getGrandTotalSpent(week);
  const endingVal = CampusCalculator.getEndingBalance(week);

  const totalSpentEl = document.getElementById('header-total-spent');
  const cashCushionEl = document.getElementById('header-cash-cushion');
  const endingDisplay = document.getElementById('ending-balance-display');

  if (totalSpentEl) totalSpentEl.textContent = `${currency}${grandSpent.toFixed(0)}`;
  
  if (cashCushionEl) {
    cashCushionEl.textContent = `${currency}${endingVal.toFixed(0)}`;
    if (endingVal < 0) {
      cashCushionEl.className = 'start-bal-val text-rose font-bold';
    } else {
      cashCushionEl.className = 'start-bal-val text-green font-bold';
    }
  }

  if (endingDisplay) {
    endingDisplay.textContent = `${currency}${endingVal.toFixed(0)}`;
    if (endingVal < 0) {
      endingDisplay.className = 'ending-amt text-rose';
    } else {
      endingDisplay.className = 'ending-amt text-green';
    }
  }
}

/**
 * 3. Safe to Spend Today Widget
 */
function renderSafeToSpendWidget(week, currency) {
  const safeData = CampusCalculator.getSafeToSpendToday(week);

  const amountEl = document.getElementById('safe-to-spend-amount');
  const daysEl = document.getElementById('days-remaining-count');
  const poolEl = document.getElementById('pool-remaining-amount');
  const todaySpentEl = document.getElementById('today-spent-amount');
  const noteEl = document.getElementById('safe-spend-status-text');
  const pacingFill = document.getElementById('safe-pacing-fill');

  if (amountEl) amountEl.textContent = safeData.safeAmount.toLocaleString('en-IN');
  if (daysEl) daysEl.textContent = `${safeData.daysRemaining} days left`;
  if (poolEl) poolEl.textContent = `${currency}${safeData.remainingPool.toFixed(0)}`;
  if (todaySpentEl) todaySpentEl.textContent = `${currency}${safeData.todaySpent.toFixed(0)}`;
  if (noteEl) noteEl.textContent = safeData.paceMessage;

  if (pacingFill) {
    const pct = Math.max(0, Math.min(100, 100 - safeData.percentUsed));
    pacingFill.style.width = `${pct}%`;
    if (safeData.paceStatus === 'overbudget') {
      pacingFill.style.background = 'var(--google-red)';
    } else if (safeData.paceStatus === 'tight') {
      pacingFill.style.background = 'var(--google-amber)';
    } else {
      pacingFill.style.background = 'var(--google-blue)';
    }
  }

  // Category Breakdown Rows
  const foodStatus = CampusCalculator.getCategoryBudgetStatus(week, 'food');
  const foodTextEl = document.getElementById('safe-food-text');
  const foodBarEl = document.getElementById('safe-food-bar');

  if (foodTextEl) {
    foodTextEl.textContent = `${currency}${foodStatus.positiveRemaining.toFixed(0)} / ${currency}${foodStatus.allotted.toFixed(0)} left`;
    if (foodStatus.isOver) foodTextEl.className = 'safe-cat-val text-rose font-bold';
    else foodTextEl.className = 'safe-cat-val text-green';
  }
  if (foodBarEl) {
    foodBarEl.style.width = `${foodStatus.pctRemaining}%`;
    if (foodStatus.isOver) foodBarEl.style.background = 'var(--google-red)';
    else foodBarEl.style.background = 'var(--google-green)';
  }

  const necStatus = CampusCalculator.getCategoryBudgetStatus(week, 'necessities');
  const necDisplayEl = document.getElementById('safe-necessities-text');
  const necBarEl = document.getElementById('safe-necessities-bar');

  if (necDisplayEl) {
    necDisplayEl.textContent = `${currency}${necStatus.positiveRemaining.toFixed(0)} / ${currency}${necStatus.allotted.toFixed(0)} left`;
    if (necStatus.isOver) necDisplayEl.className = 'safe-cat-val text-rose font-bold';
    else necDisplayEl.className = 'safe-cat-val text-blue';
  }
  if (necBarEl) {
    necBarEl.style.width = `${necStatus.pctRemaining}%`;
    if (necStatus.isOver) necBarEl.style.background = 'var(--google-red)';
    else necBarEl.style.background = 'var(--google-blue)';
  }
}

/**
 * Budget Velocity Meter
 */
function renderBudgetVelocityMeter(week, currency) {
  const totalSpent = CampusCalculator.getGrandTotalSpent(week);
  const startingCash = parseFloat(week.startingBalance) || 0;

  const spentEl = document.getElementById('total-week-spent');
  const allottedEl = document.getElementById('total-week-allotted');
  const barFill = document.getElementById('overall-budget-bar');
  const pillEl = document.getElementById('overall-status-pill');

  if (spentEl) spentEl.textContent = `${currency}${totalSpent.toFixed(0)}`;
  if (allottedEl) allottedEl.textContent = `${currency}${startingCash.toFixed(0)}`;

  const traffic = CampusCalculator.getTrafficLight(totalSpent, startingCash);

  if (barFill) {
    const widthPct = startingCash > 0 ? Math.min(100, Math.round((totalSpent / startingCash) * 100)) : 0;
    barFill.style.width = `${widthPct}%`;

    if (traffic.status === 'red') barFill.style.background = 'var(--google-red)';
    else if (traffic.status === 'yellow') barFill.style.background = 'var(--google-amber)';
    else barFill.style.background = 'var(--google-green)';
  }

  if (pillEl) {
    pillEl.textContent = traffic.label;
    if (traffic.status === 'red') pillEl.className = 'pill-badge badge-red';
    else if (traffic.status === 'yellow') pillEl.className = 'pill-badge badge-yellow';
    else pillEl.className = 'pill-badge badge-green';
  }
}

/**
 * 4. Main Weekly Table with Live Balance Row & Collapsible Columns (Clothes, Recreation, Other)
 */
function renderWeeklyTable(week, currency) {
  const collapsedState = week.collapsedColumns || { clothes: true, entertainment: true, other: true };

  // Apply column collapse classes to headers
  ['clothes', 'entertainment', 'other'].forEach(catId => {
    const th = document.getElementById(`th-cat-${catId}`);
    const toggleBtn = document.getElementById(`toggle-col-${catId}`);
    const isColCollapsed = collapsedState[catId] === true;

    if (th) {
      if (isColCollapsed) th.classList.add('col-collapsed');
      else th.classList.remove('col-collapsed');
    }
    if (toggleBtn) {
      toggleBtn.textContent = isColCollapsed ? '+' : '−';
    }
  });

  // 1. Budget Inputs (Top Row)
  CATEGORIES.forEach(cat => {
    const input = document.querySelector(`.budget-input[data-cat="${cat.id}"]`);
    if (input && document.activeElement !== input) {
      input.value = (parseFloat(week.allottedBudgets[cat.id]) || 0).toFixed(0);
    }

    const budgetCell = document.querySelector(`.cell-col-${cat.id}`);
    if (budgetCell) {
      if (collapsedState[cat.id]) budgetCell.classList.add('cell-col-collapsed');
      else budgetCell.classList.remove('cell-col-collapsed');
    }
  });

  const sumAllottedEl = document.getElementById('budget-sum-allotted');
  if (sumAllottedEl) {
    sumAllottedEl.textContent = CampusCalculator.getTotalAllottedBudget(week).toFixed(0);
  }

  // 2. LIVE CATEGORY BALANCE ROW (Allotted − Spent)
  const balances = CampusCalculator.getCategoryBalances(week);
  CATEGORIES.forEach(cat => {
    const balVal = balances[cat.id] || 0;
    const balEl = document.getElementById(`bal-${cat.id}`);
    const balCell = document.querySelector(`.cell-balance-cat.cell-col-${cat.id}`);

    if (balCell) {
      if (collapsedState[cat.id]) balCell.classList.add('cell-col-collapsed');
      else balCell.classList.remove('cell-col-collapsed');
    }

    if (balEl) {
      if (balVal >= 0) {
        balEl.textContent = `+${currency}${balVal.toFixed(0)}`;
        balEl.className = 'bal-badge pos';
      } else {
        balEl.textContent = `-${currency}${Math.abs(balVal).toFixed(0)}`;
        balEl.className = 'bal-badge neg';
      }
    }
  });

  const totalBalEl = document.getElementById('bal-total-sum');
  if (totalBalEl) {
    const totVal = balances.total || 0;
    if (totVal >= 0) {
      totalBalEl.textContent = `+${currency}${totVal.toFixed(0)}`;
      totalBalEl.className = 'bal-badge-total pos';
    } else {
      totalBalEl.textContent = `-${currency}${Math.abs(totVal).toFixed(0)}`;
      totalBalEl.className = 'bal-badge-total neg';
    }
  }

  // 3. Daily Spend Cells (Sunday through Saturday)
  const dailyTotals = CampusCalculator.getDailyTotals(week);
  for (let d = 0; d < 7; d++) {
    const dayData = week.dailySpends[d] || {};
    CATEGORIES.forEach(cat => {
      const cell = document.querySelector(`.cell-spend[data-day="${d}"][data-cat="${cat.id}"]`);
      if (!cell) return;

      const isCollapsed = collapsedState[cat.id] === true;
      const cellObj = dayData[cat.id];
      const items = CampusCalculator.getSpendItems(cellObj);
      const totalAmt = CampusCalculator.getSpendAmount(cellObj);

      if (isCollapsed) {
        cell.classList.add('cell-col-collapsed');
        cell.innerHTML = `
          <div class="cell-collapsed-tag" data-day="${d}" data-cat="${cat.id}" title="${cat.name}: ${currency}${totalAmt}. Click to manage.">
            <span>${totalAmt > 0 ? `${currency}${totalAmt.toFixed(0)}` : '+'}</span>
          </div>
        `;
      } else {
        cell.classList.remove('cell-col-collapsed');
        let tagsHtml = '';
        if (items.length > 0) {
          tagsHtml = items.map(it => `
            <span class="cell-tag-item ${it.isBorrowed ? 'borrowed-item' : ''}" title="${it.isBorrowed ? 'Funded via borrowing from Necessities' : ''}">
              ${it.name}: ${currency}${it.amount}${it.isBorrowed ? ' ⚡' : ''}
            </span>
          `).join('');
        }

        cell.innerHTML = `
          <div class="cell-itemized-box" data-day="${d}" data-cat="${cat.id}" title="Click to manage items in this cell">
            <div class="cell-sum-header">
              <span class="cell-total-text">${currency}${totalAmt > 0 ? totalAmt.toFixed(0) : '0'}</span>
              <span class="cell-item-count">${items.length > 0 ? `${items.length} items` : ''}</span>
            </div>
            <div class="cell-items-tag-cloud">${tagsHtml}</div>
            <button class="cell-add-btn-mini" data-day="${d}" data-cat="${cat.id}">+ Add item</button>
          </div>
        `;
      }
    });

    const dailyTotalEl = document.getElementById(`daily-total-${d}`);
    if (dailyTotalEl) {
      dailyTotalEl.textContent = `${currency}${dailyTotals[d].toFixed(0)}`;
    }
  }

  // Attach click listeners to itemized cell boxes & collapsed tags
  document.querySelectorAll('.cell-itemized-box, .cell-add-btn-mini, .cell-collapsed-tag').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const day = parseInt(el.getAttribute('data-day'), 10);
      const cat = el.getAttribute('data-cat');
      openCellItemsModal(day, cat);
    });
  });

  // Surprises Row
  renderSurprisesList(week, currency);

  // Category Total Spent Summary Row
  const catTotals = CampusCalculator.getCategoryTotals(week);
  const grandSpent = CampusCalculator.getGrandTotalSpent(week);
  const budgets = week.allottedBudgets || {};

  CATEGORIES.forEach(cat => {
    const totalSpent = catTotals[cat.id] || 0;
    const budget = parseFloat(budgets[cat.id]) || 0;
    const traffic = CampusCalculator.getTrafficLight(totalSpent, budget);

    const totalEl = document.getElementById(`col-total-${cat.id}`);
    const pctEl = document.getElementById(`pct-${cat.id}`);
    const boxEl = document.getElementById(`sum-box-${cat.id}`);
    const summaryCell = document.querySelector(`.cell-summary-cat.cell-col-${cat.id}`);

    if (summaryCell) {
      if (collapsedState[cat.id]) summaryCell.classList.add('cell-col-collapsed');
      else summaryCell.classList.remove('cell-col-collapsed');
    }

    if (totalEl) totalEl.textContent = `${currency}${totalSpent.toFixed(0)}`;
    if (pctEl) pctEl.textContent = `${traffic.pct}%`;

    if (boxEl) {
      boxEl.className = `cat-stat-chip ${traffic.class}`;
    }

    const remVal = budget - totalSpent;
    const remEl = document.getElementById(`rem-${cat.id}`);
    const remCell = document.querySelector(`.cell-rem-cat.cell-col-${cat.id}`);

    if (remCell) {
      if (collapsedState[cat.id]) remCell.classList.add('cell-col-collapsed');
      else remCell.classList.remove('cell-col-collapsed');
    }

    if (remEl) {
      if (remVal >= 0) {
        remEl.textContent = `+${currency}${remVal.toFixed(0)}`;
        remEl.className = 'rem-badge pos';
      } else {
        remEl.textContent = `-${currency}${Math.abs(remVal).toFixed(0)}`;
        remEl.className = 'rem-badge neg';
      }
    }
  });

  const grandSpentEl = document.getElementById('grand-total-spent');
  if (grandSpentEl) grandSpentEl.textContent = `${currency}${grandSpent.toFixed(0)}`;

  const totalAllotted = CampusCalculator.getTotalAllottedBudget(week);
  const grandRem = totalAllotted - grandSpent;
  const grandRemEl = document.getElementById('grand-total-remaining');
  if (grandRemEl) {
    if (grandRem >= 0) {
      grandRemEl.textContent = `+${currency}${grandRem.toFixed(0)}`;
      grandRemEl.className = 'grand-rem-badge pos';
    } else {
      grandRemEl.textContent = `-${currency}${Math.abs(grandRem).toFixed(0)}`;
      grandRemEl.className = 'grand-rem-badge neg';
    }
  }
}

/**
 * Setup Column Expand / Collapse buttons for Clothes, Recreation, and Other
 */
function setupColumnCollapsers() {
  ['clothes', 'entertainment', 'other'].forEach(catId => {
    const toggleBtn = document.getElementById(`toggle-col-${catId}`);
    const th = document.getElementById(`th-cat-${catId}`);

    const toggleAction = (e) => {
      e.stopPropagation();
      CampusState.toggleColumnCollapse(catId);
    };

    if (toggleBtn) toggleBtn.addEventListener('click', toggleAction);
    if (th) th.addEventListener('click', toggleAction);
  });
}

/**
 * Surprises List rendering
 */
function renderSurprisesList(week, currency) {
  const container = document.getElementById('surprise-tags-container');
  const sumEl = document.getElementById('surprise-sum-total');
  const total = CampusCalculator.getSurprisesTotal(week);

  if (sumEl) sumEl.textContent = total.toFixed(0);
  if (!container) return;

  if (!week.surprises || week.surprises.length === 0) {
    container.innerHTML = `<span class="empty-hint">No surprise anomalies logged. Click + to add.</span>`;
    return;
  }

  container.innerHTML = '';
  week.surprises.forEach(s => {
    const pill = document.createElement('div');
    pill.className = 'surprise-pill';
    pill.innerHTML = `
      <span>${s.desc}</span>
      <strong>${currency}${parseFloat(s.amount).toFixed(0)}</strong>
      <button class="surprise-remove-btn" data-id="${s.id}" title="Remove anomaly">&times;</button>
    `;
    container.appendChild(pill);
  });

  container.querySelectorAll('.surprise-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      CampusState.deleteSurprise(id);
      CampusNotifications.showToast('Surprise anomaly removed. Refunded funds back to Necessities budget.', 'info');
    });
  });
}

/**
 * 5. Cell Item Manager Modal (With Red Borrowed Tagging)
 */
function openCellItemsModal(dayIndex, category) {
  activeCellModalDay = dayIndex;
  activeCellModalCat = category;

  const daySelect = document.getElementById('cell-modal-day-select');
  const catSelect = document.getElementById('cell-modal-cat-select');
  if (daySelect) daySelect.value = String(dayIndex);
  if (catSelect) catSelect.value = category;

  const dayName = DAYS_OF_WEEK[dayIndex] ? DAYS_OF_WEEK[dayIndex].name : '';
  const catObj = CATEGORIES.find(c => c.id === category);
  const catName = catObj ? catObj.name : category;
  const titleEl = document.getElementById('cell-modal-title');
  if (titleEl) {
    titleEl.textContent = `Log Expense – ${dayName} (${catName})`;
  }

  const nameInput = document.getElementById('modal-item-name');
  const amtInput = document.getElementById('modal-item-amount');
  if (nameInput) nameInput.value = '';
  if (amtInput) amtInput.value = '';

  const currency = CampusState.getCurrency();
  document.querySelectorAll('#cell-items-modal .curr-prefix, #cell-items-modal .curr-label').forEach(el => {
    el.textContent = currency;
  });

  renderCellModalItems();
  openModal('cell-items-modal');
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    document.getElementById('modal-item-name')?.focus();
  }, 100);
}

function renderCellModalItems() {
  const week = CampusState.getActiveWeek();
  const currency = CampusState.getCurrency();
  const cellObj = (week.dailySpends[activeCellModalDay] && week.dailySpends[activeCellModalDay][activeCellModalCat]) || {};
  const items = CampusCalculator.getSpendItems(cellObj);
  const totalAmt = CampusCalculator.getSpendAmount(cellObj);

  const listContainer = document.getElementById('cell-modal-items-list');
  const totalDisplay = document.getElementById('cell-modal-total-amt');

  if (totalDisplay) totalDisplay.textContent = `${currency}${totalAmt.toFixed(0)}`;
  if (!listContainer) return;

  if (items.length === 0) {
    listContainer.innerHTML = `<p class="cell-empty-hint">No items in this cell yet. Fill form above to add.</p>`;
    return;
  }

  listContainer.innerHTML = '';
  items.forEach(it => {
    const row = document.createElement('div');
    row.className = `cell-item-row-modal ${it.isBorrowed ? 'borrowed-item' : ''}`;
    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.4rem;">
        <span style="font-weight: 500;">${it.name}</span>
        ${it.isBorrowed ? '<span class="borrowed-badge">Borrowed</span>' : ''}
      </div>
      <div style="display: flex; align-items: center; gap: 0.65rem;">
        <strong>${currency}${it.amount}</strong>
        <button class="cell-item-del-btn" data-id="${it.id}" title="Delete item">&times;</button>
      </div>
    `;
    listContainer.appendChild(row);
  });

  listContainer.querySelectorAll('.cell-item-del-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      CampusState.removeItemFromCell(activeCellModalDay, activeCellModalCat, id);
      renderCellModalItems();
      CampusNotifications.showToast('Item removed from cell', 'info');
    });
  });
}

/**
 * 6. Zero-Sum Borrowing Confirmation Modal
 */
function setupBorrowingModal() {
  const confirmBtn = document.getElementById('reallocate-confirm-btn');

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      // 1. Handle Budget Input manual change borrowing
      if (pendingBudgetChange) {
        const { cat, delta, newVal } = pendingBudgetChange;
        CampusState.borrowFunds('necessities', cat, delta);
        CampusNotifications.showToast(`Transferred ₹${delta} from Necessities to ${cat}!`, 'success');
        CampusNotifications.playChime('coin');
        pendingBudgetChange = null;
        closeModal('reallocate-modal');
        return;
      }

      // 2. Handle Item Add borrowing
      if (pendingBorrowing) {
        const { day, cat, name, amt, deficit } = pendingBorrowing;
        
        // Zero-Sum Borrowing: Deduct deficit from Necessities, Add deficit to Category
        CampusState.borrowFunds('necessities', cat, deficit);
        // Add item tagged as isBorrowed: true (rendered in RED)
        CampusState.addItemToCell(day, cat, name, amt, true);

        CampusNotifications.showToast(`Borrowed ₹${deficit} from Necessities for ${name}!`, 'success');
        CampusNotifications.playChime('coin');
        
        pendingBorrowing = null;
        closeModal('reallocate-modal');
        renderCellModalItems();
      }
    });
  }

  const cancelBtn = document.getElementById('reallocate-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (pendingBudgetChange) {
        // Revert budget input to active state
        renderAll();
        pendingBudgetChange = null;
      }
      pendingBorrowing = null;
    });
  }
}

/**
 * 7. To-Do Tasks Widget & Tab Handlers
 */
function setupTodoWidget() {
  const widgetForm = document.getElementById('todo-add-form');
  const tabForm = document.getElementById('todo-tab-add-form');
  const viewAllBtn = document.getElementById('widget-view-all-todos');

  if (widgetForm) {
    widgetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('todo-text-input');
      const text = input.value.trim();
      if (text) {
        CampusState.addTodo(text);
        input.value = '';
        renderTodoList();
        CampusNotifications.showToast('Task added!', 'info');
      }
    });
  }

  if (tabForm) {
    tabForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('todo-tab-text-input');
      const text = input.value.trim();
      if (text) {
        CampusState.addTodo(text);
        input.value = '';
        renderTodoList();
        CampusNotifications.showToast('Task added to list!', 'info');
      }
    });
  }

  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => switchTab('todos-tab'));
  }
}

function renderTodoList() {
  const widgetList = document.getElementById('todo-items-list');
  const tabList = document.getElementById('todo-tab-items-list');
  const sidebarCount = document.getElementById('sidebar-todo-count');

  const todos = CampusState.state.todos || [];
  const activeCount = todos.filter(t => !t.completed).length;

  if (sidebarCount) sidebarCount.textContent = `${activeCount}`;

  const buildListHTML = (listEl, isEmptyMsg) => {
    if (!listEl) return;
    if (todos.length === 0) {
      listEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 1rem 0;">${isEmptyMsg}</p>`;
      return;
    }

    listEl.innerHTML = '';
    todos.forEach(t => {
      const item = document.createElement('div');
      item.className = `todo-item-row ${t.completed ? 'completed' : ''}`;
      item.innerHTML = `
        <input type="checkbox" class="todo-check" data-id="${t.id}" ${t.completed ? 'checked' : ''} />
        <span class="todo-text">${t.text}</span>
        <button class="todo-del-btn" data-id="${t.id}" title="Delete task">&times;</button>
      `;
      listEl.appendChild(item);
    });

    listEl.querySelectorAll('.todo-check').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.getAttribute('data-id');
        CampusState.toggleTodo(id);
        renderTodoList();
      });
    });

    listEl.querySelectorAll('.todo-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        CampusState.deleteTodo(id);
        renderTodoList();
      });
    });
  };

  buildListHTML(widgetList, 'No active tasks for today.');
  buildListHTML(tabList, 'No study tasks or reminders logged. Add tasks above.');
}

/**
 * 8. Campus AI Advisor Drawer
 */
function setupCampusAIDrawer() {
  const aiBtn = document.getElementById('nav-campus-ai-btn');
  const aiDrawer = document.getElementById('campus-ai-drawer');
  const closeAiBtn = document.getElementById('close-campus-ai-btn');
  const chatForm = document.getElementById('campus-ai-chat-form');

  if (aiBtn) {
    aiBtn.addEventListener('click', () => {
      if (aiDrawer) aiDrawer.classList.remove('hidden');
    });
  }

  if (closeAiBtn && aiDrawer) {
    closeAiBtn.addEventListener('click', () => aiDrawer.classList.add('hidden'));
    aiDrawer.addEventListener('click', (e) => {
      if (e.target === aiDrawer) aiDrawer.classList.add('hidden');
    });
  }

  document.querySelectorAll('.grok-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const queryType = chip.getAttribute('data-query');
      handleCampusAIQuery(queryType);
    });
  });

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('campus-ai-input-text');
      const text = input.value.trim();
      if (text) {
        appendCampusAIUserMessage(text);
        input.value = '';
        setTimeout(() => {
          generateCampusAIResponse(text);
        }, 400);
      }
    });
  }
}

function handleCampusAIQuery(type) {
  const week = CampusState.getActiveWeek();
  const currency = CampusState.getCurrency();
  const safeData = CampusCalculator.getSafeToSpendToday(week);
  const catTotals = CampusCalculator.getCategoryTotals(week);
  const foodStatus = CampusCalculator.getCategoryBudgetStatus(week, 'food');

  if (type === 'audit') {
    appendCampusAIUserMessage('Audit my weekly spending');
    setTimeout(() => {
      const msg = `📊 <strong>Zero-Sum Audit:</strong><br>• Starting Cash: ${currency}${week.startingBalance}<br>• Food Spent: ${currency}${catTotals.food} (${currency}${foodStatus.positiveRemaining} left from 24% limit)<br>• Safe Daily Spend: ${currency}${safeData.safeAmount}/day across ${safeData.daysRemaining} remaining days.<br>• Zone: <strong>${safeData.paceStatus.toUpperCase()}</strong>.`;
      appendCampusAIBotMessage(msg);
    }, 300);
  } else if (type === 'save') {
    appendCampusAIUserMessage('How can I save ₹1,000 this week?');
    setTimeout(() => {
      const msg = `💡 <strong>3 High-Impact Student Savings Moves:</strong><br>1. Stick to campus meal plan flex meals for lunch (-₹400).<br>2. Reallocate unused recreation funds straight into your cash cushion (-₹350).<br>3. Split dorm laundry & essentials with roommates (-₹250).`;
      appendCampusAIBotMessage(msg);
    }, 300);
  } else if (type === 'weekend') {
    appendCampusAIUserMessage('Weekend survival spending plan');
    setTimeout(() => {
      const msg = `🍿 <strong>Weekend Strategy:</strong><br>You have ${safeData.daysRemaining} days remaining with ${currency}${safeData.remainingPool} total cash cushion. Allocate ${currency}${Math.round(safeData.safeAmount * 1.4)} for Saturday recreation and keep Sunday light.`;
      appendCampusAIBotMessage(msg);
    }, 300);
  }
}

function appendCampusAIUserMessage(text) {
  const stream = document.getElementById('campus-ai-chat-stream');
  if (!stream) return;
  const div = document.createElement('div');
  div.className = 'grok-msg grok-user';
  div.innerHTML = `<div class="msg-bubble">${text}</div>`;
  stream.appendChild(div);
  stream.scrollTop = stream.scrollHeight;
}

function appendCampusAIBotMessage(html) {
  const stream = document.getElementById('campus-ai-chat-stream');
  if (!stream) return;
  const div = document.createElement('div');
  div.className = 'grok-msg grok-bot';
  div.innerHTML = `<div class="msg-bubble">${html}</div>`;
  stream.appendChild(div);
  stream.scrollTop = stream.scrollHeight;
}

function generateCampusAIResponse(userQuery) {
  const week = CampusState.getActiveWeek();
  const currency = CampusState.getCurrency();
  const safeData = CampusCalculator.getSafeToSpendToday(week);
  const text = userQuery.toLowerCase();

  let reply = `Based on your starting cash of ${currency}${week.startingBalance}, your safe daily spend is ${currency}${safeData.safeAmount}/day. Unspent amounts roll over dynamically to future days!`;

  if (text.includes('food') || text.includes('mess') || text.includes('canteen')) {
    reply = `🍕 Your 24% Food target is ${currency}${week.allottedBudgets.food}. Utilizing hostel dining options keeps your daily spend well within limits!`;
  } else if (text.includes('clothes') || text.includes('recreation') || text.includes('other')) {
    reply = `👕 Clothes, Recreation, and Other start with ₹0 allotted budget. Use the zero-sum fund borrowing prompt to borrow surplus from Necessities when making a purchase!`;
  }

  appendCampusAIBotMessage(reply);
}

/**
 * 9. Google Calendar Month Picker Popover
 */
function setupCalendarPopover() {
  const trigger = document.getElementById('week-calendar-trigger');
  const popover = document.getElementById('calendar-popover');
  const closeBtn = document.getElementById('cal-close-btn');
  const jumpTodayBtn = document.getElementById('cal-jump-today');
  const prevMonthBtn = document.getElementById('cal-prev-month');
  const nextMonthBtn = document.getElementById('cal-next-month');

  if (trigger && popover) {
    trigger.addEventListener('click', () => {
      renderCalendarMonthGrid(calPickerYear, calPickerMonth);
      popover.classList.remove('hidden');
    });
  }

  if (closeBtn && popover) {
    closeBtn.addEventListener('click', () => popover.classList.add('hidden'));
    popover.addEventListener('click', (e) => {
      if (e.target === popover) popover.classList.add('hidden');
    });
  }

  if (jumpTodayBtn) {
    jumpTodayBtn.addEventListener('click', () => {
      const today = new Date();
      calPickerYear = today.getFullYear();
      calPickerMonth = today.getMonth();
      const currentId = getWeekIdentifier(today);
      CampusState.setActiveWeek(currentId);
      popover.classList.add('hidden');
      CampusNotifications.showToast('Jumped to current week', 'info');
    });
  }

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      calPickerMonth -= 1;
      if (calPickerMonth < 0) {
        calPickerMonth = 11;
        calPickerYear -= 1;
      }
      renderCalendarMonthGrid(calPickerYear, calPickerMonth);
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      calPickerMonth += 1;
      if (calPickerMonth > 11) {
        calPickerMonth = 0;
        calPickerYear += 1;
      }
      renderCalendarMonthGrid(calPickerYear, calPickerMonth);
    });
  }
}

function renderCalendarMonthGrid(year, month) {
  const titleEl = document.getElementById('cal-month-title');
  const gridEl = document.getElementById('cal-grid-cells');
  if (!gridEl) return;

  const dateObj = new Date(year, month, 1);
  const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
  if (titleEl) titleEl.textContent = monthName;

  gridEl.innerHTML = '';

  const firstDayIndex = dateObj.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  for (let p = firstDayIndex - 1; p >= 0; p--) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month';
    cell.textContent = prevMonthTotalDays - p;
    gridEl.appendChild(cell);
  }

  const today = new Date();
  for (let d = 1; d <= totalDays; d++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    cell.textContent = d;

    if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) {
      cell.classList.add('selected-day');
    }

    cell.addEventListener('click', () => {
      const selectedDate = new Date(year, month, d);
      const weekId = getWeekIdentifier(selectedDate);
      
      if (!CampusState.state.weeks[weekId]) {
        const dStart = new Date(selectedDate);
        dStart.setDate(dStart.getDate() - dStart.getDay());
        const label = `Week ${weekId.split('-W')[1]} (${dStart.toLocaleString('default', { month: 'short' })} ${dStart.getDate()})`;
        CampusState.state.weeks[weekId] = createEmptyWeek(weekId, label, dStart.toISOString().split('T')[0]);
      }

      CampusState.setActiveWeek(weekId);
      document.getElementById('calendar-popover')?.classList.add('hidden');
      switchTab('weekly-tab');
      CampusNotifications.showToast(`Opened ${weekId} Logbook!`, 'info');
    });

    gridEl.appendChild(cell);
  }
}

/**
 * 10. Table Event Listeners & Zero-Sum Limit Checkers
 */
function setupTableEventListeners() {
  // Starting Cash Input: PROMPT CONFIRMATION POPUP BEFORE ACCEPTING NEW LIMIT
  const startingInput = document.getElementById('starting-balance-input');
  if (startingInput) {
    startingInput.addEventListener('change', (e) => {
      const activeWeek = CampusState.getActiveWeek();
      const currentBal = parseFloat(activeWeek.startingBalance) || 0;
      const requestedBal = parseFloat(e.target.value);
      const currency = CampusState.getCurrency();

      if (isNaN(requestedBal) || requestedBal <= 0) {
        CampusNotifications.showToast('Please enter a valid starting cash amount > 0', 'warning');
        startingInput.value = currentBal.toFixed(0);
        return;
      }

      if (requestedBal === currentBal) {
        return;
      }

      // Revert displayed input to current value while waiting for confirmation
      startingInput.value = currentBal.toFixed(0);

      const foodTarget = Math.round(requestedBal * 0.24);
      const necTarget = Math.round(requestedBal * 0.76);

      showConfirmModal(
        'Change Starting Cash?',
        `Do you really want to change the starting cash from <strong>${currency}${currentBal.toLocaleString('en-IN')}</strong> to <strong>${currency}${requestedBal.toLocaleString('en-IN')}</strong>?<br><br>
        <div style="background: #f8fafc; padding: 0.65rem 0.85rem; border-radius: 6px; font-size: 0.82rem; border-left: 3px solid var(--google-blue); color: var(--text-main); margin-top: 0.25rem;">
          <strong>Zero-Sum Rule Impact:</strong><br>
          • Food (24% limit): <strong>${currency}${foodTarget.toLocaleString('en-IN')}</strong><br>
          • Necessities (76% limit): <strong>${currency}${necTarget.toLocaleString('en-IN')}</strong><br>
          • Safe-to-spend daily allowance will be updated accordingly.
        </div>`,
        () => {
          CampusState.updateStartingBalance(requestedBal);
          startingInput.value = requestedBal.toFixed(0);
          CampusNotifications.showToast(`Starting cash updated to ${currency}${requestedBal.toLocaleString('en-IN')}`, 'success');
          CampusNotifications.playChime('coin');
          renderStartingBalanceCard(CampusState.getActiveWeek(), currency);
          renderAllBudgets();
          renderSafeToSpendWidget(CampusState.getActiveWeek(), currency);
          renderCategoryPillProgress();
        },
        () => {
          startingInput.value = currentBal.toFixed(0);
          CampusNotifications.showToast('Starting cash limit kept unchanged', 'info');
        },
        { confirmText: 'Yes, Change Starting Cash', cancelText: 'Cancel', isDanger: false }
      );
    });

    startingInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        startingInput.blur();
      } else if (e.key === 'Escape') {
        const currentBal = parseFloat(CampusState.getActiveWeek().startingBalance) || 0;
        startingInput.value = currentBal.toFixed(0);
        startingInput.blur();
      }
    });
  }

  // Budget Inputs: ZERO-SUM REALLOCATION ON MANUAL INPUT EDIT
  document.querySelectorAll('.budget-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const cat = e.target.getAttribute('data-cat');
      const week = CampusState.getActiveWeek();
      const oldVal = parseFloat(week.allottedBudgets[cat]) || 0;
      const newVal = Math.max(0, parseFloat(e.target.value) || 0);
      const delta = newVal - oldVal;

      if (delta === 0) return;

      if (cat === 'necessities') {
        // Direct edit to Necessities
        CampusState.updateBudget('necessities', newVal);
        return;
      }

      if (delta > 0) {
        // User wants to increase budget of cat: must borrow delta from Necessities!
        const necCurrent = parseFloat(week.allottedBudgets.necessities) || 0;
        const catObj = CATEGORIES.find(c => c.id === cat);
        const catName = catObj ? catObj.name : cat;

        if (delta > necCurrent) {
          CampusNotifications.showToast(`Cannot increase ${catName} by ₹${delta}! Necessities only has ₹${necCurrent}.`, 'warning');
          e.target.value = oldVal.toFixed(0);
          return;
        }

        pendingBudgetChange = { cat, delta, newVal, oldVal };
        const promptEl = document.getElementById('reallocate-prompt-text');
        if (promptEl) {
          promptEl.innerHTML = `
            <strong>Transfer Funds from Necessities?</strong><br><br>
            You are setting <strong>${catName}</strong> allotted limit to <strong>₹${newVal}</strong> (+₹${delta}).<br><br>
            Do you want to transfer <strong>₹${delta}</strong> from <strong>Necessities</strong> to ${catName}?
            (Necessities will decrease from ₹${necCurrent} to ₹${necCurrent - delta}).
          `;
        }
        openModal('reallocate-modal');
      } else {
        // User decreased budget: return surplus back to Necessities!
        const surplus = Math.abs(delta);
        CampusState.borrowFunds(cat, 'necessities', surplus);
        CampusNotifications.showToast(`Returned ₹${surplus} surplus back to Necessities!`, 'info');
      }
    });
  });

  // Cell Modal Day & Category selectors dynamic switch
  const cellDaySelect = document.getElementById('cell-modal-day-select');
  const cellCatSelect = document.getElementById('cell-modal-cat-select');

  const updateCellModalContext = () => {
    if (cellDaySelect) activeCellModalDay = parseInt(cellDaySelect.value, 10);
    if (cellCatSelect) activeCellModalCat = cellCatSelect.value;

    const dayName = DAYS_OF_WEEK[activeCellModalDay] ? DAYS_OF_WEEK[activeCellModalDay].name : '';
    const catObj = CATEGORIES.find(c => c.id === activeCellModalCat);
    const catName = catObj ? catObj.name : activeCellModalCat;
    const titleEl = document.getElementById('cell-modal-title');
    if (titleEl) {
      titleEl.textContent = `Log Expense – ${dayName} (${catName})`;
    }
    renderCellModalItems();
  };

  if (cellDaySelect) cellDaySelect.addEventListener('change', updateCellModalContext);
  if (cellCatSelect) cellCatSelect.addEventListener('change', updateCellModalContext);

  // Cell Add Item Form Modal submit with ZERO-SUM BORROWING TRIGGER
  const cellAddForm = document.getElementById('cell-add-item-form');
  if (cellAddForm) {
    cellAddForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const day = cellDaySelect ? parseInt(cellDaySelect.value, 10) : activeCellModalDay;
      const cat = cellCatSelect ? cellCatSelect.value : activeCellModalCat;

      const nameInput = document.getElementById('modal-item-name');
      const amtInput = document.getElementById('modal-item-amount');
      const name = nameInput ? nameInput.value.trim() : '';
      const amt = parseFloat(amtInput ? amtInput.value : 0) || 0;

      if (!name) {
        CampusNotifications.showToast('Please enter an item name', 'warning');
        return;
      }

      if (amt <= 0) {
        CampusNotifications.showToast('Please enter an amount > 0', 'warning');
        return;
      }

      const week = CampusState.getActiveWeek();
      const avail = CampusCalculator.checkBudgetAvailability(week, cat, amt);

      // If item exceeds remaining category budget, trigger Zero-Sum Borrowing modal
      if (!avail.fits) {
        pendingBorrowing = {
          day: day,
          cat: cat,
          name: name,
          amt: amt,
          deficit: avail.deficit
        };

        const promptEl = document.getElementById('reallocate-prompt-text');
        const catObj = CATEGORIES.find(c => c.id === cat);
        const catName = catObj ? catObj.name : cat;

        if (promptEl) {
          promptEl.innerHTML = `
            <strong>${catName} limit reached!</strong><br>
            Remaining in ${catName}: <strong>₹${avail.currentRemaining}</strong>.<br>
            You are adding <strong>${name} (₹${amt})</strong>.<br><br>
            Do you want to borrow <strong>₹${avail.deficit}</strong> from <strong>Necessities</strong>?
            (Necessities limit will decrease by ₹${avail.deficit}, and this item will be listed in <span style="color: #dc2626; font-weight: bold;">RED</span>).
          `;
        }

        if (nameInput) nameInput.value = '';
        if (amtInput) amtInput.value = '';
        closeModal('cell-items-modal');
        openModal('reallocate-modal');
        return;
      }

      // Normal direct add within budget
      CampusState.addItemToCell(day, cat, name, amt, false);
      const currency = CampusState.getCurrency();
      const dayName = DAYS_OF_WEEK[day] ? DAYS_OF_WEEK[day].name : '';
      const catObj = CATEGORIES.find(c => c.id === cat);
      const catName = catObj ? catObj.name : cat;

      if (nameInput) nameInput.value = '';
      if (amtInput) amtInput.value = '';
      closeModal('cell-items-modal');
      CampusNotifications.playChime('coin');
      CampusNotifications.showToast(`Logged ${name} (${currency}${amt}) in ${dayName} ${catName}!`, 'success');
    });
  }

  // Surprises buttons
  const addSurpriseBtn = document.getElementById('add-surprise-quick-btn');
  const addSurpriseRowBtn = document.getElementById('add-surprise-row-btn');
  if (addSurpriseBtn) addSurpriseBtn.addEventListener('click', openSurpriseModal);
  if (addSurpriseRowBtn) addSurpriseRowBtn.addEventListener('click', openSurpriseModal);

  // Reset Week
  const resetWeekBtn = document.getElementById('reset-week-btn');
  if (resetWeekBtn) {
    resetWeekBtn.addEventListener('click', () => {
      showConfirmModal(
        'Reset Current Week?',
        'This will clear all daily spends and items for this active week. Your starting cash, 24% food, and 76% necessities targets will remain.',
        () => {
          CampusState.resetCurrentWeek();
          CampusNotifications.showToast('Current week reset', 'info');
        }
      );
    });
  }

  // Finalize & Archive
  const finalizeBtn = document.getElementById('finalize-week-btn');
  const addCurrentMonthlyBtn = document.getElementById('add-current-to-monthly-btn');
  const doFinalize = () => {
    CampusState.archiveActiveWeek();
    CampusNotifications.showToast('Week archived to Monthly Book!', 'success');
    if (window.confetti) {
      window.confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    }
  };
  if (finalizeBtn) finalizeBtn.addEventListener('click', doFinalize);
  if (addCurrentMonthlyBtn) addCurrentMonthlyBtn.addEventListener('click', doFinalize);
}

/**
 * 11. Navigation & Tab Switches
 */
function setupNavigation() {
  const prevBtn = document.getElementById('prev-week-btn');
  const nextBtn = document.getElementById('next-week-btn');

  if (prevBtn) prevBtn.addEventListener('click', () => CampusState.navigateWeek(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => CampusState.navigateWeek(1));

  document.querySelectorAll('.side-nav .nav-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  const sidebarNotifBtn = document.getElementById('nav-notifications-btn');
  if (sidebarNotifBtn) {
    sidebarNotifBtn.addEventListener('click', () => openModal('notification-modal'));
  }

  const sidebarSettingsBtn = document.getElementById('nav-settings-btn');
  if (sidebarSettingsBtn) {
    sidebarSettingsBtn.addEventListener('click', () => openModal('settings-modal'));
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.side-nav .nav-item').forEach(b => b.classList.remove('active'));

  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');

  const activeNavBtn = document.querySelector(`.side-nav .nav-item[data-tab="${tabId}"]`);
  if (activeNavBtn) activeNavBtn.classList.add('active');

  if (tabId === 'monthly-tab') {
    renderMonthlyBook(CampusState.state, CampusState.getCurrency());
  } else if (tabId === 'todos-tab') {
    renderTodoList();
  }

  if (tabId === 'monthly-tab' || tabId === 'analytics-tab') {
    setTimeout(() => {
      CampusCharts.updateCharts();
    }, 100);
  }
}

/**
 * 12. Modals & Forms (Dynamically populates Day selects with today's date!)
 */
function setupModals() {
  document.querySelectorAll('.modal-close-btn, [data-modal]').forEach(el => {
    el.addEventListener('click', () => {
      const modalId = el.getAttribute('data-modal');
      if (modalId) closeModal(modalId);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });

  // Quick Add Modal
  const sidebarQuickAdd = document.getElementById('sidebar-quick-add-btn');
  const openQuickAdd = () => {
    const todayIndex = new Date().getDay();
    const daySelect = document.getElementById('quick-day-select');
    if (daySelect) {
      daySelect.value = String(todayIndex);
    }
    openModal('quick-add-modal');
    setTimeout(() => {
      document.getElementById('quick-name-input')?.focus();
    }, 100);
  };
  if (sidebarQuickAdd) sidebarQuickAdd.addEventListener('click', openQuickAdd);

  const quickAddForm = document.getElementById('quick-add-form');
  if (quickAddForm) {
    quickAddForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const day = parseInt(document.getElementById('quick-day-select').value, 10);
      const cat = document.getElementById('quick-cat-select').value;
      const name = document.getElementById('quick-name-input').value.trim();
      const amount = parseFloat(document.getElementById('quick-amount-input').value) || 0;

      if (amount <= 0) {
        CampusNotifications.showToast('Please enter an amount > 0', 'warning');
        return;
      }

      const week = CampusState.getActiveWeek();
      const avail = CampusCalculator.checkBudgetAvailability(week, cat, amount);

      if (!avail.fits) {
        pendingBorrowing = { day, cat, name, amt: amount, deficit: avail.deficit };
        const promptEl = document.getElementById('reallocate-prompt-text');
        const catObj = CATEGORIES.find(c => c.id === cat);
        const catName = catObj ? catObj.name : cat;

        if (promptEl) {
          promptEl.innerHTML = `
            <strong>${catName} limit reached!</strong><br>
            Remaining: <strong>₹${avail.currentRemaining}</strong>.<br>
            You want to add <strong>${name} (₹${amount})</strong>.<br><br>
            Do you want to borrow <strong>₹${avail.deficit}</strong> from <strong>Necessities</strong>?
          `;
        }
        quickAddForm.reset();
        closeModal('quick-add-modal');
        openModal('reallocate-modal');
        return;
      }

      CampusState.addItemToCell(day, cat, name, amount, false);
      const currency = CampusState.getCurrency();
      CampusNotifications.playChime('coin');
      CampusNotifications.showToast(`Logged ${name} (${currency}${amount}) in ${cat}!`, 'success');
      quickAddForm.reset();
      closeModal('quick-add-modal');
    });
  }

  // Surprise Modal
  const surpriseForm = document.getElementById('surprise-form');
  if (surpriseForm) {
    surpriseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const desc = document.getElementById('surprise-desc-input').value;
      const amount = parseFloat(document.getElementById('surprise-amount-input').value) || 0;
      const day = parseInt(document.getElementById('surprise-day-select').value, 10);

      if (amount <= 0) {
        CampusNotifications.showToast('Please enter a valid amount', 'warning');
        return;
      }

      const currency = CampusState.getCurrency();
      CampusState.addSurprise(desc, amount, day);
      CampusNotifications.playChime('coin');
      CampusNotifications.showToast(`Surprise of ${currency}${amount} logged! Deducted ${currency}${amount} from Necessities budget.`, 'warning');
      surpriseForm.reset();
      closeModal('surprise-modal');
    });
  }
}

function openSurpriseModal() {
  const todayIndex = new Date().getDay();
  const daySelect = document.getElementById('surprise-day-select');
  if (daySelect) daySelect.value = String(todayIndex);
  openModal('surprise-modal');
  setTimeout(() => {
    document.getElementById('surprise-desc-input')?.focus();
  }, 100);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

/**
 * 13. Export Actions
 */
function setupExportActions() {
  const exportDropBtn = document.getElementById('export-dropdown-btn');
  const exportMenu = document.getElementById('export-menu');

  if (exportDropBtn && exportMenu) {
    exportDropBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      exportMenu.classList.add('hidden');
    });
  }

  const exportCsvBtn = document.getElementById('export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      CampusExport.exportWeeklyCSV(CampusState.getActiveWeek());
    });
  }

  const exportPdfBtn = document.getElementById('export-pdf-btn');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      CampusExport.exportWeeklyPDF(CampusState.getActiveWeek());
    });
  }

  const printViewBtn = document.getElementById('print-view-btn');
  if (printViewBtn) {
    printViewBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

/**
 * 14. Settings & Backups
 */
function setupSettingsActions() {
  const exportBackupBtn = document.getElementById('export-backup-btn');
  if (exportBackupBtn) {
    exportBackupBtn.addEventListener('click', () => {
      const jsonStr = CampusState.exportBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      CampusNotifications.showToast('Backup budget_data.json exported!', 'success');
    });
  }

  const importFileInput = document.getElementById('import-backup-file');
  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = CampusState.importBackupJSON(event.target.result);
        if (result.success) {
          CampusNotifications.showToast(result.message, 'success');
          CampusNotifications.playChime('success');
          closeModal('settings-modal');
        } else {
          CampusNotifications.showToast(`Import failed: ${result.message}`, 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  const currencySelect = document.getElementById('currency-select');
  if (currencySelect) {
    currencySelect.value = CampusState.getCurrency();
    currencySelect.addEventListener('change', (e) => {
      CampusState.updateSettings({ currency: e.target.value });
      CampusNotifications.showToast(`Currency set to ${e.target.value}`, 'info');
    });
  }

  const soundToggle = document.getElementById('sound-toggle');
  if (soundToggle) {
    soundToggle.checked = CampusState.getSettings().soundEnabled;
    soundToggle.addEventListener('change', (e) => {
      CampusState.updateSettings({ soundEnabled: e.target.checked });
    });
  }

  const reminderInput = document.getElementById('reminder-time-input');
  if (reminderInput) {
    reminderInput.value = CampusState.getSettings().reminderTime || '21:00';
    reminderInput.addEventListener('change', (e) => {
      CampusState.updateSettings({ reminderTime: e.target.value });
      CampusNotifications.showToast(`Reminder set to ${e.target.value}`, 'info');
    });
  }

  const loadSampleBtn = document.getElementById('load-sample-btn');
  if (loadSampleBtn) {
    loadSampleBtn.addEventListener('click', () => {
      showConfirmModal(
        'Load Sample Student Data?',
        'This will populate your account with sample zero-sum items and budgets.',
        () => {
          CampusState.loadSampleStarterData();
          CampusNotifications.showToast('Sample student data loaded!', 'success');
          closeModal('settings-modal');
        }
      );
    });
  }

  const clearAllBtn = document.getElementById('clear-all-data-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      showConfirmModal(
        'HARD RESET: Clear All Data?',
        'WARNING: This will permanently delete all weekly budgets, items, and archives.',
        () => {
          CampusState.clearAllData();
          CampusNotifications.showToast('All data cleared.', 'warning');
          closeModal('settings-modal');
        }
      );
    });
  }

  const enableNotifBtn = document.getElementById('enable-notif-btn');
  if (enableNotifBtn) {
    enableNotifBtn.addEventListener('click', async () => {
      const granted = await CampusNotifications.requestPermission();
      if (granted) closeModal('notification-modal');
    });
  }

  const testNotifBtn = document.getElementById('test-notif-btn');
  if (testNotifBtn) {
    testNotifBtn.addEventListener('click', () => {
      CampusNotifications.sendNotification(
        'CampusCoin Daily Check-in',
        'Time to update your daily spends! Keep your streak.'
      );
    });
  }
}

/**
 * 15. Monthly Book Tab Render
 */
function renderMonthlyBook(state, currency) {
  const summary = CampusCalculator.getMonthlySummary(state, 'current');

  const allottedEl = document.getElementById('monthly-total-allotted');
  const spentEl = document.getElementById('monthly-total-spent');
  const savingsEl = document.getElementById('monthly-total-savings');
  const surprisesEl = document.getElementById('monthly-total-surprises');
  const spendPctEl = document.getElementById('monthly-spend-pct');
  const savingsRateEl = document.getElementById('monthly-savings-rate');

  if (allottedEl) allottedEl.textContent = `${currency}${summary.totalAllotted.toFixed(0)}`;
  if (spentEl) spentEl.textContent = `${currency}${summary.totalSpent.toFixed(0)}`;
  if (surprisesEl) surprisesEl.textContent = `${currency}${summary.totalSurprises.toFixed(0)}`;
  if (spendPctEl) spendPctEl.textContent = `${summary.spendPct}% of budget`;
  if (savingsRateEl) savingsRateEl.textContent = `${summary.savingsRate}% Savings Rate`;

  if (savingsEl) {
    if (summary.netSavings >= 0) {
      savingsEl.textContent = `+${currency}${summary.netSavings.toFixed(0)}`;
      savingsEl.className = 'kpi-number text-green';
    } else {
      savingsEl.textContent = `-${currency}${Math.abs(summary.netSavings).toFixed(0)}`;
      savingsEl.className = 'kpi-number text-rose';
    }
  }

  const tbody = document.getElementById('monthly-ledger-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (summary.weekRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 1.5rem; color: var(--text-muted);">No finalized weeks yet.</td></tr>`;
    return;
  }

  summary.weekRows.forEach(w => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${w.label}</strong></td>
      <td>${currency}${w.allotted.toFixed(0)}</td>
      <td>${currency}${w.spent.toFixed(0)}</td>
      <td class="text-rose">${currency}${w.surprises.toFixed(0)}</td>
      <td class="${w.endingBalance >= 0 ? 'text-green' : 'text-rose'}"><strong>${currency}${w.endingBalance.toFixed(0)}</strong></td>
      <td><span class="pill-badge ${w.finalized ? '' : 'badge-active'}">${w.finalized ? 'Archived' : 'Active'}</span></td>
      <td><button class="btn-subtle view-week-btn" data-id="${w.id}">Open Logbook</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.view-week-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      CampusState.setActiveWeek(id);
      switchTab('weekly-tab');
      CampusNotifications.showToast(`Switched to ${id}`, 'info');
    });
  });
}

function showConfirmModal(title, message, onConfirm, onCancel, options = {}) {
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-modal-title');
  const msgEl = document.getElementById('confirm-modal-msg');
  const proceedBtn = document.getElementById('confirm-proceed-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');

  if (!modal) return;
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.innerHTML = message;

  const confirmText = options.confirmText || 'Confirm';
  const cancelText = options.cancelText || 'Cancel';
  const isDanger = options.isDanger !== undefined ? options.isDanger : true;

  if (proceedBtn) {
    proceedBtn.textContent = confirmText;
    proceedBtn.className = isDanger ? 'btn-danger-pill' : 'btn-primary-pill';
  }
  if (cancelBtn) {
    cancelBtn.textContent = cancelText;
  }

  let resolved = false;

  const cleanup = () => {
    modal.classList.add('hidden');
    proceedBtn?.removeEventListener('click', handleProceed);
    cancelBtn?.removeEventListener('click', handleCancel);
    modal.removeEventListener('click', handleOverlayClick);
    document.removeEventListener('keydown', handleEscapeKey);
  };

  const handleProceed = () => {
    if (resolved) return;
    resolved = true;
    cleanup();
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    if (resolved) return;
    resolved = true;
    cleanup();
    if (onCancel) onCancel();
  };

  const handleOverlayClick = (e) => {
    if (e.target === modal) {
      handleCancel();
    }
  };

  const handleEscapeKey = (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      handleCancel();
    }
  };

  proceedBtn?.addEventListener('click', handleProceed);
  cancelBtn?.addEventListener('click', handleCancel);
  modal.addEventListener('click', handleOverlayClick);
  document.addEventListener('keydown', handleEscapeKey);

  modal.classList.remove('hidden');
}
