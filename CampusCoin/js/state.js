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

function createEmptyWeek(weekId, label, startDate, startingBalance = 7500) {
  const dailyMatrix = {};
  for (let d = 0; d < 7; d++) {
    dailyMatrix[d] = {
      food: { items: [] },
      necessities: { items: [] }
    };
  }

  const startVal = parseFloat(startingBalance) || 0;
  const foodBudget = Math.round(startVal * 0.24);
  const necessitiesBudget = Math.max(0, startVal - foodBudget);

  const allottedBudgets = {
    food: foodBudget,
    necessities: necessitiesBudget
  };

  return {
    id: weekId,
    label: label || `Week ${weekId.split('-W')[1] || 'Current'}`,
    startDate: startDate || new Date().toISOString().split('T')[0],
    startingBalance: startVal,
    allottedBudgets,
    dailySpends: dailyMatrix,
    surprises: [],
    finalized: false,
    finalizedAt: null
  };
}

function getSampleState() {
  const currentWeekId = getWeekIdentifier(new Date());
  const initialWeek = createEmptyWeek(currentWeekId, 'Week 35 (Aug 24 – Aug 30)', '2026-08-24', 7500);

  // Sunday
  initialWeek.dailySpends[0] = {
    food: { items: [{ id: '101', name: 'Kurkure & Snacks', amount: 20, isBorrowed: false }, { id: '102', name: 'Cafeteria Lunch', amount: 160, isBorrowed: false }, { id: '103', name: 'Evening Chai', amount: 20, isBorrowed: false }] },
    necessities: { items: [{ id: '104', name: 'Laundry Detergent', amount: 150, isBorrowed: false }] }
  };

  // Monday
  initialWeek.dailySpends[1] = {
    food: { items: [{ id: '201', name: 'Lunch Thali', amount: 180, isBorrowed: false }, { id: '202', name: 'Fruit Juice', amount: 60, isBorrowed: false }] },
    necessities: { items: [] }
  };

  // Tuesday
  initialWeek.dailySpends[2] = {
    food: { items: [{ id: '301', name: 'Hostel Breakfast', amount: 80, isBorrowed: false }, { id: '302', name: 'Evening Tea', amount: 20, isBorrowed: false }] },
    necessities: { items: [{ id: '303', name: 'Pharmacy supplies', amount: 220, isBorrowed: false }] }
  };

  // Wednesday (Today)
  initialWeek.dailySpends[3] = {
    food: { items: [{ id: '401', name: 'Kurkure & Biscuits', amount: 30, isBorrowed: false }, { id: '402', name: 'Canteen Coffee', amount: 40, isBorrowed: false }] },
    necessities: { items: [] }
  };

  // Surprises
  initialWeek.surprises = [
    { id: 'surp-1', desc: 'Department Fest Registration & ID badge', amount: 300.00, day: 1, date: new Date().toISOString() }
  ];

  // Sample To-Dos
  const sampleTodos = [
    { id: 'todo-1', text: 'Pay Mess dues before Friday', completed: false, date: new Date().toISOString().split('T')[0] },
    { id: 'todo-2', text: 'Buy exam stationery & notebook', completed: true, date: new Date().toISOString().split('T')[0] },
    { id: 'todo-3', text: 'Check campus library reserve copy for Physics', completed: false, date: new Date().toISOString().split('T')[0] }
  ];

  // Past archived week
  const pastWeek1 = createEmptyWeek('2026-W32', 'Week 32 (Aug 03 – Aug 09)', '2026-08-03', 8000);
  pastWeek1.allottedBudgets.food = 1920;
  pastWeek1.allottedBudgets.necessities = 6080;
  pastWeek1.dailySpends[0] = { food: { items: [{ id: 'p1', name: 'Mess dinner', amount: 350, isBorrowed: false }] }, necessities: { items: [{ id: 'p2', name: 'Dorm supplies', amount: 300, isBorrowed: false }] } };
  pastWeek1.dailySpends[2] = { food: { items: [{ id: 'p3', name: 'Canteen lunch', amount: 240, isBorrowed: false }] }, necessities: { items: [] } };
  pastWeek1.finalized = true;
  pastWeek1.finalizedAt = '2026-08-09T23:59:59Z';

  return {
    version: 6,
    activeWeekId: currentWeekId,
    weeks: {
      [currentWeekId]: initialWeek,
      '2026-W32': pastWeek1
    },
    todos: sampleTodos,
    settings: {
      currency: '₹',
      reminderTime: '21:00',
      notificationsEnabled: true,
      soundEnabled: true,
      theme: 'calm',
      lastReminderPromptDate: null
    },
    monthlyArchives: [
      {
        monthId: '2026-08',
        monthLabel: 'August 2026',
        weekIds: ['2026-W32']
      }
    ]
  };
}

function getWeekIdentifier(d) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

class StateManager {
  constructor() {
    this.listeners = [];
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
      if (!parsed.weeks || !parsed.activeWeekId || !parsed.weeks[parsed.activeWeekId]) {
        const currentId = getWeekIdentifier(new Date());
        parsed.activeWeekId = currentId;
        if (!parsed.weeks[currentId]) {
          parsed.weeks[currentId] = createEmptyWeek(currentId);
        }
      }
      if (!parsed.settings) parsed.settings = {};
      if (!parsed.settings.currency) parsed.settings.currency = '₹';
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

    this.saveToStorage(this.state);
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

  getSettings() {
    return this.state.settings || { currency: '₹', reminderTime: '21:00', notificationsEnabled: true, soundEnabled: true };
  }

  updateSettings(newSettings) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.saveToStorage(this.state);
  }

  getCurrency() {
    return (this.state.settings && this.state.settings.currency) ? this.state.settings.currency : '₹';
  }
}

window.CampusState = new StateManager();
