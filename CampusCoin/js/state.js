/**
 * CampusCoin State Management & LocalStorage Persistence (V6 - Complete Zero-Sum Model)
 * - Supreme Lord: Starting Cash dictates the entire pool.
 * - 24% to Food, 76% (remainder) to Necessities.
 * - Clothes, Recreation, Other ALL default to 0 allotted and are collapsible.
 * - Zero-sum borrowing from Necessities for Food, Clothes, Recreation, and Other.
 * - Borrowed items rendered in red with ⚡ Borrowed badge.
 */

const STORAGE_KEY = 'campuscoin_student_finance_v6';

const CATEGORIES = [
  { id: 'food', name: 'Food', emoji: '🍛', defaultPct: 0.24 },
  { id: 'necessities', name: 'Necessities', emoji: '🧼', defaultPct: 0.76 }
];

const DAYS_OF_WEEK = [
  { index: 0, name: 'Sunday', short: 'Sun' },
  { index: 1, name: 'Monday', short: 'Mon' },
  { index: 2, name: 'Tuesday', short: 'Tue' },
  { index: 3, name: 'Wednesday', short: 'Wed' },
  { index: 4, name: 'Thursday', short: 'Thu' },
  { index: 5, name: 'Friday', short: 'Fri' },
  { index: 6, name: 'Saturday', short: 'Sat' }
];

function getWeekDateInfo(weekId) {
  if (!weekId || !weekId.includes('-W')) {
    return {
      startDate: '2026-08-23',
      fullLabel: weekId || 'Current Week'
    };
  }
  const parts = weekId.split('-W');
  const year = parseInt(parts[0], 10);
  const weekNum = parseInt(parts[1], 10);

  const firstSun = new Date(year, 0, 1);
  firstSun.setDate(1 - firstSun.getDay());

  const targetSun = new Date(firstSun);
  targetSun.setDate(firstSun.getDate() + (weekNum - 1) * 7);

  const targetSat = new Date(targetSun);
  targetSat.setDate(targetSun.getDate() + 6);

  const startMonth = targetSun.toLocaleDateString('en-US', { month: 'short' });
  const startDay = String(targetSun.getDate()).padStart(2, '0');
  const endMonth = targetSat.toLocaleDateString('en-US', { month: 'short' });
  const endDay = String(targetSat.getDate()).padStart(2, '0');

  const dateRangeStr = (startMonth === endMonth)
    ? `${startMonth} ${startDay} – ${startMonth} ${endDay}`
    : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;

  const y = targetSun.getFullYear();
  const m = String(targetSun.getMonth() + 1).padStart(2, '0');
  const d = String(targetSun.getDate()).padStart(2, '0');
  const startDateStr = `${y}-${m}-${d}`;

  return {
    weekNum,
    year,
    startDate: startDateStr,
    dateRangeStr,
    fullLabel: `Week ${weekNum} (${dateRangeStr})`
  };
}

if (typeof window !== 'undefined') window.getWeekDateInfo = getWeekDateInfo;
if (typeof global !== 'undefined') global.getWeekDateInfo = getWeekDateInfo;

function createEmptyWeek(weekId, label, startDate, startingBalance = null) {
  const dateInfo = getWeekDateInfo(weekId);
  const currentCalWeekId = getWeekIdentifier(new Date());
  const dailyMatrix = {};
  for (let d = 0; d < 7; d++) {
    dailyMatrix[d] = {
      food: { items: [] },
      necessities: { items: [] }
    };
  }

  let defaultCash = 7500;
  if (typeof window !== 'undefined' && window.CampusState && typeof window.CampusState.getDefaultStartingCash === 'function') {
    defaultCash = window.CampusState.getDefaultStartingCash();
  }

  let startVal = 0;
  if (startingBalance !== null && startingBalance !== undefined) {
    startVal = parseFloat(startingBalance) || 0;
  } else if (weekId >= currentCalWeekId) {
    startVal = defaultCash;
  } else {
    startVal = 0; // Past unrecorded weeks default to 0 0
  }

  const foodBudget = Math.round(startVal * 0.24);
  const necessitiesBudget = Math.max(0, startVal - foodBudget);

  const allottedBudgets = {
    food: foodBudget,
    necessities: necessitiesBudget
  };

  const isPast = weekId < currentCalWeekId;

  return {
    id: weekId,
    label: (label && label.includes('(')) ? label : dateInfo.fullLabel,
    startDate: startDate || dateInfo.startDate,
    startingBalance: startVal,
    allottedBudgets,
    dailySpends: dailyMatrix,
    surprises: [],
    finalized: isPast,
    finalizedAt: isPast ? `${startDate || dateInfo.startDate}T23:59:59Z` : null
  };
}

function getSampleState() {
  const currentWeekId = getWeekIdentifier(new Date());
  let defaultCash = 7500;
  if (typeof window !== 'undefined' && window.CampusState && typeof window.CampusState.getDefaultStartingCash === 'function') {
    defaultCash = window.CampusState.getDefaultStartingCash();
  }
  const initialWeek = createEmptyWeek(currentWeekId, 'Week 35 (Aug 23 – Aug 29)', '2026-08-23', defaultCash);

  // Sunday Aug 23
  initialWeek.dailySpends[0] = {
    food: { items: [{ id: '101', name: 'Kurkure & Snacks', amount: 20, isBorrowed: false }, { id: '102', name: 'Cafeteria Lunch', amount: 160, isBorrowed: false }, { id: '103', name: 'Evening Chai', amount: 20, isBorrowed: false }] },
    necessities: { items: [{ id: '104', name: 'Laundry Detergent', amount: 150, isBorrowed: false }] }
  };

  // Monday Aug 24
  initialWeek.dailySpends[1] = {
    food: { items: [{ id: '201', name: 'Lunch Thali', amount: 180, isBorrowed: false }, { id: '202', name: 'Fruit Juice', amount: 60, isBorrowed: false }] },
    necessities: { items: [] }
  };

  // Tuesday Aug 25
  initialWeek.dailySpends[2] = {
    food: { items: [{ id: '301', name: 'Hostel Breakfast', amount: 80, isBorrowed: false }, { id: '302', name: 'Evening Tea', amount: 20, isBorrowed: false }] },
    necessities: { items: [{ id: '303', name: 'Pharmacy supplies', amount: 220, isBorrowed: false }] }
  };

  // Wednesday Aug 26
  initialWeek.dailySpends[3] = {
    food: { items: [{ id: '401', name: 'Kurkure & Biscuits', amount: 30, isBorrowed: false }, { id: '402', name: 'Canteen Coffee', amount: 40, isBorrowed: false }] },
    necessities: { items: [] }
  };

  // Saturday Aug 29 (Today in IST)
  initialWeek.dailySpends[6] = {
    food: { items: [] },
    necessities: { items: [] }
  };

  // Surprises
  initialWeek.surprises = [
    { id: 'surp-1', desc: 'Department Fest Registration & ID badge', amount: 300.00, day: 1, date: new Date().toISOString() }
  ];

  // Sample To-Dos
  const sampleTodos = [
    { id: 'todo-1', text: 'Pay Mess dues before Friday', completed: false, date: '2026-08-29' },
    { id: 'todo-2', text: 'Buy exam stationery & notebook', completed: true, date: '2026-08-29' },
    { id: 'todo-3', text: 'Check campus library reserve copy for Physics', completed: false, date: '2026-08-29' }
  ];

  // Past weeks (with no data recorded, all 0 0)
  const pastWeek1 = createEmptyWeek('2026-W32', 'Week 32 (Aug 02 – Aug 08)', '2026-08-02', 0);
  const pastWeek2 = createEmptyWeek('2026-W33', 'Week 33 (Aug 09 – Aug 15)', '2026-08-09', 0);
  const pastWeek3 = createEmptyWeek('2026-W34', 'Week 34 (Aug 16 – Aug 22)', '2026-08-16', 0);

  // Upcoming week (Week 36) inherits defaultCash
  const nextWeek = createEmptyWeek('2026-W36', 'Week 36 (Aug 30 – Sep 05)', '2026-08-30', defaultCash);

  return {
    version: 6,
    activeWeekId: currentWeekId,
    weeks: {
      [currentWeekId]: initialWeek,
      '2026-W36': nextWeek,
      '2026-W34': pastWeek3,
      '2026-W33': pastWeek2,
      '2026-W32': pastWeek1
    },
    todos: sampleTodos,
    settings: {
      currency: '₹',
      defaultStartingCash: defaultCash,
      reminderTime: '21:00',
      notificationsEnabled: true,
      soundEnabled: true,
      theme: 'calm',
      unlockPasscode: '1234',
      lastReminderPromptDate: null
    },
    monthlyArchives: [
      {
        monthId: '2026-08',
        monthLabel: 'August 2026',
        weekIds: ['2026-W36', '2026-W35', '2026-W34', '2026-W33', '2026-W32']
      }
    ]
  };
}

function getWeekIdentifier(d = new Date()) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const year = date.getFullYear();
  const firstSun = new Date(year, 0, 1);
  firstSun.setDate(1 - firstSun.getDay());
  const diffDays = Math.floor((date.getTime() - firstSun.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.floor(diffDays / 7) + 1;
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

class StateManager {
  constructor() {
    this.listeners = [];
    this.unlockedWeekIds = new Set();
    this.state = this.loadState();
  }

  loadState() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        const initial = getSampleState();
        this.saveToStorage(initial);
        return initial;
      }
      const parsed = JSON.parse(serialized);
      const currentCalWeekId = getWeekIdentifier(new Date());
      if (!parsed.weeks || !parsed.activeWeekId || !parsed.weeks[parsed.activeWeekId]) {
        parsed.activeWeekId = currentCalWeekId;
        if (!parsed.weeks[currentCalWeekId]) {
          parsed.weeks[currentCalWeekId] = createEmptyWeek(currentCalWeekId);
        }
      }

      if (!parsed.settings) parsed.settings = {};
      if (parsed.settings.defaultStartingCash === undefined) parsed.settings.defaultStartingCash = 7500;
      if (!parsed.settings.currency) parsed.settings.currency = '₹';
      if (!parsed.settings.unlockPasscode) parsed.settings.unlockPasscode = '1234';
      if (!parsed.todos) parsed.todos = [];

      // If active week in storage was set to a future week (e.g. Week 36), reset active week to current calendar week (Week 35)
      if (parsed.activeWeekId > currentCalWeekId) {
        parsed.activeWeekId = currentCalWeekId;
      }

      // Merge sample historical weeks if missing
      const sample = getSampleState();
      Object.keys(sample.weeks).forEach(wId => {
        if (!parsed.weeks[wId]) {
          parsed.weeks[wId] = sample.weeks[wId];
        }
      });

      // Ensure all weeks have exact Sunday-to-Saturday date ranges in their labels and startDates
      Object.keys(parsed.weeks).forEach(wId => {
        const w = parsed.weeks[wId];
        if (w) {
          const info = getWeekDateInfo(wId);
          w.label = info.fullLabel;
          w.startDate = info.startDate;
          // Current calendar week should not be finalized
          if (wId === currentCalWeekId && w.finalized) {
            w.finalized = false;
          }
          // Past unrecorded weeks with no user items should be 0 0
          if (wId < currentCalWeekId) {
            const hasUserItems = Object.values(w.dailySpends || {}).some(d => (d.food?.items?.length > 0) || (d.necessities?.items?.length > 0));
            if (!hasUserItems && (w.startingBalance === 7500 || w.startingBalance === 8000)) {
              w.startingBalance = 0;
              w.allottedBudgets = { food: 0, necessities: 0 };
              w.surprises = [];
            }
          }
        }
      });

      if (!parsed.settings) parsed.settings = {};
      if (!parsed.settings.currency) parsed.settings.currency = '₹';
      if (!parsed.settings.unlockPasscode) parsed.settings.unlockPasscode = '1234';
      if (!parsed.todos) parsed.todos = [];

      return parsed;
    } catch (e) {
      console.error('Error loading state:', e);
      const fallback = getSampleState();
      this.saveToStorage(fallback);
      return fallback;
    }
  }

  saveToStorage(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.notifyListeners();
    } catch (e) {
      console.error('Error saving state:', e);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(fn => {
      try { fn(this.state); } catch (err) { console.error('Listener error:', err); }
    });
  }

  getActiveWeek() {
    if (!this.state.weeks[this.state.activeWeekId]) {
      this.state.weeks[this.state.activeWeekId] = createEmptyWeek(this.state.activeWeekId);
    }
    return this.state.weeks[this.state.activeWeekId];
  }

  setActiveWeek(weekId) {
    if (!this.state.weeks[weekId]) {
      this.state.weeks[weekId] = createEmptyWeek(weekId);
    }
    this.state.activeWeekId = weekId;
    this.saveToStorage(this.state);
  }

  navigateWeek(offset) {
    const parts = this.state.activeWeekId.split('-W');
    const year = parseInt(parts[0], 10);
    const weekNum = parseInt(parts[1], 10);

    let newWeekNum = weekNum + offset;
    let newYear = year;
    if (newWeekNum < 1) {
      newYear -= 1;
      newWeekNum = 52;
    } else if (newWeekNum > 52) {
      newYear += 1;
      newWeekNum = 1;
    }

    const newWeekId = `${newYear}-W${String(newWeekNum).padStart(2, '0')}`;
    this.setActiveWeek(newWeekId);
    return newWeekId;
  }

  updateStartingBalance(amount) {
    const week = this.getActiveWeek();
    const val = Math.max(0, parseFloat(amount) || 0);
    week.startingBalance = val;

    const foodBudget = Math.round(val * 0.24);
    const necessitiesBudget = Math.max(0, val - foodBudget);

    if (!week.allottedBudgets) week.allottedBudgets = {};
    week.allottedBudgets.food = foodBudget;
    week.allottedBudgets.necessities = necessitiesBudget;

    // Apply baseline to coming weeks as well
    this.setDefaultStartingCash(val, true);
  }

  updateBudget(category, amount) {
    const week = this.getActiveWeek();
    if (!week.allottedBudgets) week.allottedBudgets = {};
    week.allottedBudgets[category] = parseFloat(amount) || 0;
    this.saveToStorage(this.state);
  }

  borrowFunds(fromCategory, toCategory, amount) {
    const week = this.getActiveWeek();
    if (!week.allottedBudgets) week.allottedBudgets = {};
    
    const amt = parseFloat(amount) || 0;
    const fromCurrent = parseFloat(week.allottedBudgets[fromCategory]) || 0;
    const toCurrent = parseFloat(week.allottedBudgets[toCategory]) || 0;

    week.allottedBudgets[fromCategory] = Math.max(0, fromCurrent - amt);
    week.allottedBudgets[toCategory] = toCurrent + amt;

    this.saveToStorage(this.state);
  }

  toggleColumnCollapse(category) {
    const week = this.getActiveWeek();
    if (!week.collapsedColumns) week.collapsedColumns = {};
    week.collapsedColumns[category] = !week.collapsedColumns[category];
    this.saveToStorage(this.state);
  }

  addItemToCell(dayIndex, category, name, amount, isBorrowed = false) {
    const week = this.getActiveWeek();
    if (!week.dailySpends[dayIndex]) week.dailySpends[dayIndex] = {};
    if (!week.dailySpends[dayIndex][category]) {
      week.dailySpends[dayIndex][category] = { items: [] };
    }

    const cellObj = week.dailySpends[dayIndex][category];
    if (!Array.isArray(cellObj.items)) {
      cellObj.items = [];
    }

    const item = {
      id: 'item-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: (name || '').trim() || 'Expense item',
      amount: parseFloat(amount) || 0,
      isBorrowed: !!isBorrowed,
      timestamp: new Date().toISOString()
    };

    cellObj.items.push(item);
    this.saveToStorage(this.state);
    return item;
  }

  removeItemFromCell(dayIndex, category, itemId) {
    const week = this.getActiveWeek();
    if (!week.dailySpends[dayIndex] || !week.dailySpends[dayIndex][category]) return;
    const cellObj = week.dailySpends[dayIndex][category];
    if (Array.isArray(cellObj.items)) {
      cellObj.items = cellObj.items.filter(it => it.id !== itemId);
      this.saveToStorage(this.state);
    }
  }

  addSurprise(desc, amount, dayIndex) {
    const week = this.getActiveWeek();
    if (!week.surprises) week.surprises = [];
    const surpAmount = parseFloat(amount) || 0;
    const surpriseItem = {
      id: 'surp-' + Date.now(),
      desc: desc.trim() || 'Unexpected Expense',
      amount: surpAmount,
      day: parseInt(dayIndex, 10) || 0,
      timestamp: new Date().toISOString()
    };
    week.surprises.push(surpriseItem);

    // Zero-Sum Rule: Deduct surprise unbudgeted cost from Necessities allotted limit
    if (week.allottedBudgets) {
      const currentNec = parseFloat(week.allottedBudgets.necessities) || 0;
      week.allottedBudgets.necessities = Math.max(0, parseFloat((currentNec - surpAmount).toFixed(2)));
    }

    this.saveToStorage(this.state);
    return surpriseItem;
  }

  deleteSurprise(surpriseId) {
    const week = this.getActiveWeek();
    if (!week.surprises) return;
    const surpItem = week.surprises.find(s => s.id === surpriseId);
    if (surpItem && week.allottedBudgets) {
      const refundedAmt = parseFloat(surpItem.amount) || 0;
      const currentNec = parseFloat(week.allottedBudgets.necessities) || 0;
      week.allottedBudgets.necessities = parseFloat((currentNec + refundedAmt).toFixed(2));
    }
    week.surprises = week.surprises.filter(s => s.id !== surpriseId);
    this.saveToStorage(this.state);
  }

  addTodo(text) {
    if (!this.state.todos) this.state.todos = [];
    const newTodo = {
      id: 'todo-' + Date.now(),
      text: text.trim(),
      completed: false,
      date: new Date().toISOString().split('T')[0]
    };
    this.state.todos.unshift(newTodo);
    this.saveToStorage(this.state);
    return newTodo;
  }

  toggleTodo(id) {
    if (!this.state.todos) return;
    const item = this.state.todos.find(t => t.id === id);
    if (item) {
      item.completed = !item.completed;
      this.saveToStorage(this.state);
    }
  }

  deleteTodo(id) {
    if (!this.state.todos) return;
    this.state.todos = this.state.todos.filter(t => t.id !== id);
    this.saveToStorage(this.state);
  }

  resetCurrentWeek() {
    const currentId = this.state.activeWeekId;
    const currentBal = this.getActiveWeek().startingBalance || 7500;
    this.state.weeks[currentId] = createEmptyWeek(currentId, null, null, currentBal);
    this.saveToStorage(this.state);
  }

  archiveActiveWeek() {
    const week = this.getActiveWeek();
    week.finalized = true;
    week.finalizedAt = new Date().toISOString();

    const monthKey = week.startDate ? week.startDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
    if (!this.state.monthlyArchives) this.state.monthlyArchives = [];
    
    let monthEntry = this.state.monthlyArchives.find(m => m.monthId === monthKey);
    if (!monthEntry) {
      const monthDate = new Date();
      const monthLabel = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      monthEntry = {
        monthId: monthKey,
        monthLabel: monthLabel,
        weekIds: []
      };
      this.state.monthlyArchives.push(monthEntry);
    }

    if (!monthEntry.weekIds.includes(week.id)) {
      monthEntry.weekIds.push(week.id);
    }

    this.saveToStorage(this.state);
  }

  exportBackupJSON() {
    return JSON.stringify(this.state, null, 2);
  }

  importBackupJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.weeks || typeof parsed.weeks !== 'object') {
        throw new Error('Invalid backup file: missing weeks structure');
      }
      this.state = parsed;
      this.saveToStorage(this.state);
      return { success: true, message: 'Backup successfully restored!' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    const cleanState = {
      version: 6,
      activeWeekId: getWeekIdentifier(new Date()),
      weeks: {},
      todos: [],
      settings: {
        currency: '₹',
        reminderTime: '21:00',
        notificationsEnabled: true,
        soundEnabled: true,
        lastReminderPromptDate: null
      },
      monthlyArchives: []
    };
    cleanState.weeks[cleanState.activeWeekId] = createEmptyWeek(cleanState.activeWeekId);
    this.state = cleanState;
    this.saveToStorage(this.state);
  }

  loadSampleStarterData() {
    const sample = getSampleState();
    this.state = sample;
    this.saveToStorage(this.state);
  }

  getDefaultStartingCash() {
    return (this.state.settings && this.state.settings.defaultStartingCash !== undefined)
      ? parseFloat(this.state.settings.defaultStartingCash)
      : 7500;
  }

  setDefaultStartingCash(amount, applyToComingWeeks = true) {
    const val = Math.max(0, parseFloat(amount) || 0);
    if (!this.state.settings) this.state.settings = {};
    this.state.settings.defaultStartingCash = val;

    if (applyToComingWeeks) {
      const currentCalWeekId = getWeekIdentifier(new Date());
      Object.keys(this.state.weeks).forEach(wId => {
        if (wId >= currentCalWeekId) {
          const w = this.state.weeks[wId];
          if (w) {
            const hasUserSpends = Object.values(w.dailySpends || {}).some(d => (d.food?.items?.length > 0) || (d.necessities?.items?.length > 0));
            if (!hasUserSpends || wId === this.state.activeWeekId) {
              w.startingBalance = val;
              if (!w.allottedBudgets) w.allottedBudgets = {};
              w.allottedBudgets.food = Math.round(val * 0.24);
              w.allottedBudgets.necessities = Math.max(0, val - w.allottedBudgets.food);
            }
          }
        }
      });
    }

    this.saveToStorage(this.state);
  }

  getSettings() {
    return this.state.settings || { currency: '₹', reminderTime: '21:00', defaultStartingCash: 7500, notificationsEnabled: true, soundEnabled: true };
  }

  updateSettings(newSettings) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.saveToStorage(this.state);
  }

  getCurrency() {
    return (this.state.settings && this.state.settings.currency) ? this.state.settings.currency : '₹';
  }

  getUnlockPasscode() {
    return (this.state.settings && this.state.settings.unlockPasscode) ? this.state.settings.unlockPasscode : '1234';
  }

  isWeekOver(week) {
    if (!week) return false;
    const currentWeekId = getWeekIdentifier(new Date());
    if (week.finalized) return true;
    if (week.id < currentWeekId) return true;
    return false;
  }

  isWeekLocked(week) {
    if (!week) return false;
    if (!this.isWeekOver(week)) return false;
    return !this.unlockedWeekIds.has(week.id);
  }

  unlockWeek(weekId, passcode) {
    const requiredPasscode = this.getUnlockPasscode();
    if (String(passcode || '').trim() === String(requiredPasscode).trim()) {
      this.unlockedWeekIds.add(weekId);
      this.notifyListeners();
      return { success: true };
    }
    return { success: false, message: 'Incorrect passcode. Please try again.' };
  }

  lockWeek(weekId) {
    this.unlockedWeekIds.delete(weekId);
    this.notifyListeners();
  }

  setUnlockPasscode(newCode) {
    if (!this.state.settings) this.state.settings = {};
    this.state.settings.unlockPasscode = (newCode || '1234').trim();
    this.saveToStorage(this.state);
  }
}

window.CampusState = new StateManager();
