/**
 * CampusCoin State Management & Supabase Database Persistence (V7.0)
 * - Supreme Lord: Starting Cash dictates the entire pool.
 * - 24% to Food, 76% (remainder) to Necessities.
 * - Wednesday Rule: A week belongs to the month/year where its Wednesday lies.
 * - Dynamic week/month calculations for any month in 2026, 2027, and beyond.
 * - Zero-sum borrowing from Necessities for Food and other categories.
 * - Direct Supabase PostgreSQL Cloud Persistence (CRUD + Realtime Sync).
 */

const DB_TABLE_NAME = 'campuscoin_state';
const DB_ROW_ID = 'default_user';

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

/**
 * Given any Date or date string, returns the Sunday Date object (00:00:00) of that week
 */
function getSundayOfWeek(d = new Date()) {
  const date = (typeof d === 'string') ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')) : new Date(d);
  const sun = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  sun.setDate(sun.getDate() - sun.getDay());
  return sun;
}

/**
 * Given a Sunday Date object, returns the Wednesday Date object (+3 days)
 */
function getWednesdayOfWeek(sundayDate) {
  const wed = new Date(sundayDate);
  wed.setDate(sundayDate.getDate() + 3);
  return wed;
}

/**
 * Given a Sunday Date object, returns the Saturday Date object (+6 days)
 */
function getSaturdayOfWeek(sundayDate) {
  const sat = new Date(sundayDate);
  sat.setDate(sundayDate.getDate() + 6);
  return sat;
}

/**
 * Given a date or weekId, calculates which month it belongs to based on the Wednesday Rule
 */
function getWeekMonthInfo(dateOrWeekId) {
  let sunday;
  if (typeof dateOrWeekId === 'string' && dateOrWeekId.includes('-W')) {
    const info = getWeekDateInfo(dateOrWeekId);
    return {
      monthId: info.monthId,
      monthLabel: info.monthLabel,
      monthIndex: info.monthIndex,
      year: info.year
    };
  } else {
    sunday = getSundayOfWeek(dateOrWeekId);
  }

  const wed = getWednesdayOfWeek(sunday);
  const year = wed.getFullYear();
  const monthIndex = wed.getMonth();
  const monthNum = String(monthIndex + 1).padStart(2, '0');
  const monthId = `${year}-${monthNum}`;
  const monthLabel = wed.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return { monthId, monthLabel, monthIndex, year };
}

/**
 * Returns the week identifier 'YYYY-Www' for any given date
 * Year and week number are determined by the Wednesday of that week.
 */
function getWeekIdentifier(d = new Date()) {
  const sun = getSundayOfWeek(d);
  const wed = getWednesdayOfWeek(sun);
  const year = wed.getFullYear();

  // Find the Sunday of the week that contains the first Wednesday of the year
  const jan1 = new Date(year, 0, 1);
  const firstWed = new Date(jan1);
  firstWed.setDate(jan1.getDate() + ((3 - jan1.getDay() + 7) % 7));
  const firstSun = new Date(firstWed);
  firstSun.setDate(firstWed.getDate() - 3);

  const diffMs = sun.getTime() - firstSun.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  const weekNum = Math.floor(diffDays / 7) + 1;

  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Returns detailed date and month information for a given weekId ('YYYY-Www')
 */
function getWeekDateInfo(weekId) {
  if (!weekId || typeof weekId !== 'string' || !weekId.includes('-W')) {
    const todaySun = getSundayOfWeek(new Date());
    const todayWed = getWednesdayOfWeek(todaySun);
    const todaySat = getSaturdayOfWeek(todaySun);
    const y = todaySun.getFullYear();
    const m = String(todaySun.getMonth() + 1).padStart(2, '0');
    const d = String(todaySun.getDate()).padStart(2, '0');
    const startMonth = todaySun.toLocaleDateString('en-US', { month: 'short' });
    const startDay = String(todaySun.getDate()).padStart(2, '0');
    const endMonth = todaySat.toLocaleDateString('en-US', { month: 'short' });
    const endDay = String(todaySat.getDate()).padStart(2, '0');
    const dateRangeStr = (startMonth === endMonth)
      ? `${startMonth} ${startDay} – ${startMonth} ${endDay}`
      : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;

    return {
      weekId: weekId || getWeekIdentifier(),
      weekNum: 1,
      year: y,
      startDate: `${y}-${m}-${d}`,
      dateRangeStr,
      monthId: `${todayWed.getFullYear()}-${String(todayWed.getMonth() + 1).padStart(2, '0')}`,
      monthLabel: todayWed.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      monthIndex: todayWed.getMonth(),
      fullLabel: `Week (${dateRangeStr})`
    };
  }

  const parts = weekId.split('-W');
  const year = parseInt(parts[0], 10);
  const weekNum = parseInt(parts[1], 10);

  // Find the first Sunday of the week with the first Wednesday in that year
  const jan1 = new Date(year, 0, 1);
  const firstWed = new Date(jan1);
  firstWed.setDate(jan1.getDate() + ((3 - jan1.getDay() + 7) % 7));
  const firstSun = new Date(firstWed);
  firstSun.setDate(firstWed.getDate() - 3);

  const targetSun = new Date(firstSun);
  targetSun.setDate(firstSun.getDate() + (weekNum - 1) * 7);

  const targetWed = getWednesdayOfWeek(targetSun);
  const targetSat = getSaturdayOfWeek(targetSun);

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

  const monthIndex = targetWed.getMonth();
  const monthId = `${targetWed.getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}`;
  const monthLabel = targetWed.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return {
    weekId,
    weekNum,
    year,
    startDate: startDateStr,
    dateRangeStr,
    monthId,
    monthLabel,
    monthIndex,
    fullLabel: `Week ${weekNum} (${dateRangeStr})`
  };
}

/**
 * Returns all weeks (typically 4 or 5) belonging to a specific month (where Wednesday lies in that month)
 */
function getWeeksForMonth(year, monthIndex) {
  const weeks = [];
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = new Date(year, monthIndex, 1);

  // Find first Wednesday in this month
  const firstWedDay = 1 + ((3 - firstDay.getDay() + 7) % 7);

  let currentWedDay = firstWedDay;
  let weekIndexInMonth = 1;

  while (currentWedDay <= daysInMonth) {
    const wed = new Date(year, monthIndex, currentWedDay);
    const sun = new Date(wed);
    sun.setDate(wed.getDate() - 3);

    const weekId = getWeekIdentifier(wed);
    const info = getWeekDateInfo(weekId);

    weeks.push({
      ...info,
      weekIndexInMonth,
      monthRelativeLabel: `Week ${weekIndexInMonth} (${info.dateRangeStr})`
    });

    currentWedDay += 7;
    weekIndexInMonth += 1;
  }

  return weeks;
}

if (typeof window !== 'undefined') {
  window.getSundayOfWeek = getSundayOfWeek;
  window.getWednesdayOfWeek = getWednesdayOfWeek;
  window.getSaturdayOfWeek = getSaturdayOfWeek;
  window.getWeekMonthInfo = getWeekMonthInfo;
  window.getWeekIdentifier = getWeekIdentifier;
  window.getWeekDateInfo = getWeekDateInfo;
  window.getWeeksForMonth = getWeeksForMonth;
}
if (typeof global !== 'undefined') {
  global.getSundayOfWeek = getSundayOfWeek;
  global.getWednesdayOfWeek = getWednesdayOfWeek;
  global.getSaturdayOfWeek = getSaturdayOfWeek;
  global.getWeekMonthInfo = getWeekMonthInfo;
  global.getWeekIdentifier = getWeekIdentifier;
  global.getWeekDateInfo = getWeekDateInfo;
  global.getWeeksForMonth = getWeeksForMonth;
}

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
    startVal = 0; // Past unrecorded weeks default to 0
  }

  let budgetPcts = { food: 24, necessities: 76 };
  if (typeof window !== 'undefined' && window.CampusState && typeof window.CampusState.getBudgetPercentages === 'function') {
    budgetPcts = window.CampusState.getBudgetPercentages();
  } else if (typeof global !== 'undefined' && global.CampusState && typeof global.CampusState.getBudgetPercentages === 'function') {
    budgetPcts = global.CampusState.getBudgetPercentages();
  }
  const foodPct = (budgetPcts.food !== undefined ? budgetPcts.food : 24) / 100;
  const foodBudget = Math.round(startVal * foodPct);
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

/**
 * Generates sample starter state dynamically for the current month and date
 * Works seamlessly whether run in August 2026, September 2026, or any month in 2027+!
 */
function getSampleState(refDate = new Date()) {
  const currentWeekId = getWeekIdentifier(refDate);
  const currentWeekInfo = getWeekDateInfo(currentWeekId);
  let defaultCash = 7500;
  if (typeof window !== 'undefined' && window.CampusState && typeof window.CampusState.getDefaultStartingCash === 'function') {
    defaultCash = window.CampusState.getDefaultStartingCash();
  }

  // Get the 4 (or 5) weeks belonging to this month via Wednesday Rule
  const monthWeeks = getWeeksForMonth(currentWeekInfo.year, currentWeekInfo.monthIndex);
  const weeksState = {};

  // Construct active week with realistic sample data
  const initialWeek = createEmptyWeek(currentWeekId, currentWeekInfo.fullLabel, currentWeekInfo.startDate, defaultCash);

  // Sample items for Sunday (Day 0)
  initialWeek.dailySpends[0] = {
    food: { items: [{ id: '101', name: 'Kurkure & Snacks', amount: 20, isBorrowed: false }, { id: '102', name: 'Cafeteria Lunch', amount: 160, isBorrowed: false }, { id: '103', name: 'Evening Chai', amount: 20, isBorrowed: false }] },
    necessities: { items: [{ id: '104', name: 'Laundry Detergent', amount: 150, isBorrowed: false }] }
  };

  // Monday (Day 1)
  initialWeek.dailySpends[1] = {
    food: { items: [{ id: '201', name: 'Lunch Thali', amount: 180, isBorrowed: false }, { id: '202', name: 'Fruit Juice', amount: 60, isBorrowed: false }] },
    necessities: { items: [] }
  };

  // Tuesday (Day 2)
  initialWeek.dailySpends[2] = {
    food: { items: [{ id: '301', name: 'Hostel Breakfast', amount: 80, isBorrowed: false }, { id: '302', name: 'Evening Tea', amount: 20, isBorrowed: false }] },
    necessities: { items: [{ id: '303', name: 'Pharmacy supplies', amount: 220, isBorrowed: false }] }
  };

  // Wednesday (Day 3)
  initialWeek.dailySpends[3] = {
    food: { items: [{ id: '401', name: 'Kurkure & Biscuits', amount: 30, isBorrowed: false }, { id: '402', name: 'Canteen Coffee', amount: 40, isBorrowed: false }] },
    necessities: { items: [] }
  };

  // Surprises
  initialWeek.surprises = [
    { id: 'surp-1', desc: 'Department Fest Registration & ID badge', amount: 300.00, day: 1, date: new Date().toISOString() }
  ];

  weeksState[currentWeekId] = initialWeek;

  // Populate other weeks in this month
  monthWeeks.forEach(w => {
    if (w.weekId === currentWeekId) return;
    if (w.weekId < currentWeekId) {
      // Past unrecorded week defaults to 0
      weeksState[w.weekId] = createEmptyWeek(w.weekId, w.fullLabel, w.startDate, 0);
    } else {
      // Future week inherits default starting cash
      weeksState[w.weekId] = createEmptyWeek(w.weekId, w.fullLabel, w.startDate, defaultCash);
    }
  });

  // Sample To-Dos with today's dynamic date
  const todayIso = new Date().toISOString().split('T')[0];
  const sampleTodos = [
    { id: 'todo-1', text: 'Pay Mess dues before Friday', completed: false, date: todayIso },
    { id: 'todo-2', text: 'Buy exam stationery & notebook', completed: true, date: todayIso },
    { id: 'todo-3', text: 'Check campus library reserve copy for Physics', completed: false, date: todayIso }
  ];

  // Also include adjacent next week if needed
  const nextSunday = new Date(currentWeekInfo.startDate + 'T00:00:00');
  nextSunday.setDate(nextSunday.getDate() + 7);
  const nextWeekId = getWeekIdentifier(nextSunday);
  if (!weeksState[nextWeekId]) {
    const nextInfo = getWeekDateInfo(nextWeekId);
    weeksState[nextWeekId] = createEmptyWeek(nextWeekId, nextInfo.fullLabel, nextInfo.startDate, defaultCash);
  }

  // Sample Inflows / Received Money with dynamic dates
  const sampleIncome = [
    { id: 'inc-1', source: 'Monthly Allowance from Parents', amount: 10000, date: todayIso, timestamp: new Date().toISOString() }
  ];

  const allMonthWeekIds = monthWeeks.map(w => w.weekId);

  return {
    version: 7,
    activeWeekId: currentWeekId,
    weeks: weeksState,
    todos: sampleTodos,
    incomeSources: sampleIncome,
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
        monthId: currentWeekInfo.monthId,
        monthLabel: currentWeekInfo.monthLabel,
        weekIds: allMonthWeekIds
      }
    ]
  };
}

class StateManager {
  constructor() {
    this.listeners = [];
    this.syncListeners = [];
    this.unlockedWeekIds = new Set();
    this.isLocallySaving = false;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncError = null;
    this.realtimeChannel = null;

    // Start with baseline sample state in memory
    this.state = getSampleState();
    this.sanitizeLoadedState();
  }

  /**
   * Initializes Supabase connection, fetches live database state, and binds realtime listeners
   */
  async init() {
    this.notifySyncStatus('connecting', 'Connecting to Supabase...');

    try {
      let client = (typeof window !== 'undefined' && window.CampusSupabase)
        ? window.CampusSupabase.getClient()
        : null;

      if (!client && typeof window !== 'undefined' && window.CampusSupabase) {
        client = await window.CampusSupabase.init();
      }

      if (!client) {
        this.notifySyncStatus('unconfigured', 'Supabase unconfigured. Running in local memory mode.');
        return;
      }

      // Read state directly from Supabase database
      this.notifySyncStatus('syncing', 'Fetching state from Supabase...');
      const { data, error } = await client
        .from(DB_TABLE_NAME)
        .select('*')
        .eq('id', DB_ROW_ID)
        .maybeSingle();

      if (error) {
        console.error('Supabase state load error:', error);
        this.syncError = error.message;
        this.notifySyncStatus('error', `Supabase query error: ${error.message}`);
      } else if (data && data.state && Object.keys(data.state).length > 0) {
        // Successfully loaded from Supabase
        this.state = data.state;
        this.sanitizeLoadedState();
        this.lastSyncTime = new Date(data.updated_at || Date.now());
        this.syncError = null;
        this.notifySyncStatus('synced', 'Synced with Supabase Cloud');
        this.notifyListeners();
      } else {
        // Record does not exist in Supabase yet, insert our initial state
        this.notifySyncStatus('syncing', 'Seeding initial state to Supabase...');
        const { error: insertError } = await client
          .from(DB_TABLE_NAME)
          .upsert({
            id: DB_ROW_ID,
            state: this.state,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Failed to seed initial state in Supabase:', insertError);
          this.notifySyncStatus('error', insertError.message);
        } else {
          this.lastSyncTime = new Date();
          this.syncError = null;
          this.notifySyncStatus('synced', 'Initial state seeded to Supabase Cloud');
        }
      }

      // Setup Supabase Realtime Channel for live multi-device synchronization
      this.setupRealtimeSubscription(client);
    } catch (e) {
      console.error('StateManager init exception:', e);
      this.syncError = e.message;
      this.notifySyncStatus('error', e.message || 'Initialization failed');
    }
  }

  /**
   * Listens for PostgreSQL database changes from Supabase Realtime
   */
  setupRealtimeSubscription(client) {
    if (!client || typeof client.channel !== 'function') return;

    try {
      if (this.realtimeChannel) {
        client.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = client
        .channel('campuscoin_state_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: DB_TABLE_NAME, filter: `id=eq.${DB_ROW_ID}` },
          (payload) => {
            if (this.isLocallySaving) return; // Skip echo of local saves

            if (payload && payload.new && payload.new.state) {
              this.state = payload.new.state;
              this.sanitizeLoadedState();
              this.lastSyncTime = new Date(payload.new.updated_at || Date.now());
              this.notifySyncStatus('synced', 'Updated in real-time from Supabase');
              this.notifyListeners();
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Could not initialize Supabase realtime channel:', e);
    }
  }

  /**
   * Sanitizes and guarantees integrity of the loaded state
   */
  sanitizeLoadedState() {
    const currentCalWeekId = getWeekIdentifier(new Date());

    if (!this.state.weeks) this.state.weeks = {};
    if (!this.state.activeWeekId || !this.state.weeks[this.state.activeWeekId]) {
      this.state.activeWeekId = currentCalWeekId;
    }

    if (!this.state.weeks[this.state.activeWeekId]) {
      this.state.weeks[this.state.activeWeekId] = createEmptyWeek(this.state.activeWeekId);
    }

    if (!this.state.settings) this.state.settings = {};
    if (this.state.settings.defaultStartingCash === undefined) this.state.settings.defaultStartingCash = 7500;
    if (!this.state.settings.currency) this.state.settings.currency = '₹';
    if (!this.state.settings.unlockPasscode) this.state.settings.unlockPasscode = '1234';
    if (!this.state.settings.budgetPercentages) {
      this.state.settings.budgetPercentages = { food: 24, necessities: 76 };
    }
    const p = this.state.settings.budgetPercentages;
    const food = (p.food !== undefined) ? Math.max(0, Math.min(100, parseFloat(p.food) || 0)) : 24;
    const nec = (p.necessities !== undefined) ? Math.max(0, Math.min(100, parseFloat(p.necessities) || 0)) : (100 - food);
    const foodCat = CATEGORIES.find(c => c.id === 'food');
    if (foodCat) foodCat.defaultPct = food / 100;
    const necCat = CATEGORIES.find(c => c.id === 'necessities');
    if (necCat) necCat.defaultPct = nec / 100;

    if (!this.state.todos) this.state.todos = [];
    if (!this.state.incomeSources) {
      this.state.incomeSources = [
        { id: 'inc-default', source: 'Initial Pocket Money / Allowance', amount: 10000, date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString() }
      ];
    }
    if (!this.state.monthlyArchives) this.state.monthlyArchives = [];

    // Ensure all weeks have exact Sunday-to-Saturday date ranges in their labels and startDates
    Object.keys(this.state.weeks).forEach(wId => {
      const w = this.state.weeks[wId];
      if (w) {
        const info = getWeekDateInfo(wId);
        w.label = info.fullLabel;
        w.startDate = info.startDate;
        if (wId === currentCalWeekId && w.finalized) {
          w.finalized = false;
        }
      }
    });
  }

  /**
   * Saves state directly to Supabase PostgreSQL database
   */
  async saveToSupabase(data = this.state) {
    this.isLocallySaving = true;
    this.isSyncing = true;
    this.notifySyncStatus('syncing', 'Saving changes to Supabase...');

    // Synchronous optimistic notification for UI rendering
    this.notifyListeners();

    try {
      let client = null;
      if (typeof window !== 'undefined' && window.CampusSupabase) {
        client = window.CampusSupabase.getClient();
      } else if (typeof global !== 'undefined' && global.CampusSupabase) {
        client = global.CampusSupabase.getClient();
      }

      if (client) {
        const { error } = await client
          .from(DB_TABLE_NAME)
          .upsert({
            id: DB_ROW_ID,
            state: data,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Supabase write error:', error);
          this.syncError = error.message;
          this.notifySyncStatus('error', `Save failed: ${error.message}`);
        } else {
          this.lastSyncTime = new Date();
          this.syncError = null;
          this.notifySyncStatus('synced', 'Saved to Supabase Cloud');
        }
      } else {
        // Supabase client not connected yet
        this.notifySyncStatus('unconfigured', 'Changes in memory (Supabase not connected)');
      }
    } catch (err) {
      console.error('Supabase write exception:', err);
      this.syncError = err.message;
      this.notifySyncStatus('error', err.message || 'Save error');
    } finally {
      this.isSyncing = false;
      setTimeout(() => {
        this.isLocallySaving = false;
      }, 300);
    }
  }

  // Alias for backward compatibility
  saveToStorage(data) {
    return this.saveToSupabase(data);
  }

  /**
   * Subscribe to state updates (UI re-renders)
   */
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

  /**
   * Subscribe to Supabase Sync Status changes
   */
  onSyncStatusChange(listener) {
    this.syncListeners.push(listener);
    listener({
      status: this.isSyncing ? 'syncing' : (this.syncError ? 'error' : 'synced'),
      lastSync: this.lastSyncTime,
      error: this.syncError
    });
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  notifySyncStatus(status, message = '') {
    this.syncListeners.forEach(fn => {
      try {
        fn({
          status,
          message,
          lastSync: this.lastSyncTime,
          error: this.syncError
        });
      } catch (err) {
        console.error('Sync listener error:', err);
      }
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
    this.saveToSupabase(this.state);
  }

  navigateWeek(offset) {
    const info = getWeekDateInfo(this.state.activeWeekId);
    const sunDate = new Date(info.startDate + 'T00:00:00');
    sunDate.setDate(sunDate.getDate() + offset * 7);

    const newWeekId = getWeekIdentifier(sunDate);
    this.setActiveWeek(newWeekId);
    return newWeekId;
  }

  updateStartingBalance(amount) {
    const week = this.getActiveWeek();
    const val = Math.max(0, parseFloat(amount) || 0);
    week.startingBalance = val;

    const pcts = this.getBudgetPercentages();
    const foodBudget = Math.round(val * (pcts.food / 100));
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
    this.saveToSupabase(this.state);
  }

  borrowFunds(fromCategory, toCategory, amount) {
    const week = this.getActiveWeek();
    if (!week.allottedBudgets) week.allottedBudgets = {};
    
    const amt = parseFloat(amount) || 0;
    const fromCurrent = parseFloat(week.allottedBudgets[fromCategory]) || 0;
    const toCurrent = parseFloat(week.allottedBudgets[toCategory]) || 0;

    week.allottedBudgets[fromCategory] = Math.max(0, fromCurrent - amt);
    week.allottedBudgets[toCategory] = toCurrent + amt;

    this.saveToSupabase(this.state);
  }

  toggleColumnCollapse(category) {
    const week = this.getActiveWeek();
    if (!week.collapsedColumns) week.collapsedColumns = {};
    week.collapsedColumns[category] = !week.collapsedColumns[category];
    this.saveToSupabase(this.state);
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
    this.saveToSupabase(this.state);
    return item;
  }

  removeItemFromCell(dayIndex, category, itemId) {
    const week = this.getActiveWeek();
    if (!week.dailySpends[dayIndex] || !week.dailySpends[dayIndex][category]) return;
    const cellObj = week.dailySpends[dayIndex][category];
    if (Array.isArray(cellObj.items)) {
      cellObj.items = cellObj.items.filter(it => it.id !== itemId);
      this.saveToSupabase(this.state);
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

    this.saveToSupabase(this.state);
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
    this.saveToSupabase(this.state);
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
    this.saveToSupabase(this.state);
    return newTodo;
  }

  toggleTodo(id) {
    if (!this.state.todos) return;
    const item = this.state.todos.find(t => t.id === id);
    if (item) {
      item.completed = !item.completed;
      this.saveToSupabase(this.state);
    }
  }

  deleteTodo(id) {
    if (!this.state.todos) return;
    this.state.todos = this.state.todos.filter(t => t.id !== id);
    this.saveToSupabase(this.state);
  }

  /* ================= INFLOW & LIVE BALANCE MANAGEMENT ================= */

  /**
   * Adds an income/funds deposit to state.incomeSources
   */
  addIncome(source, amount, date) {
    if (!this.state.incomeSources) this.state.incomeSources = [];
    const val = parseFloat(amount) || 0;
    if (val <= 0) return null;

    const newIncome = {
      id: 'inc-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      source: (source || '').trim() || 'Received Funds',
      amount: val,
      date: date || new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString()
    };

    this.state.incomeSources.unshift(newIncome);
    this.saveToSupabase(this.state);
    return newIncome;
  }

  /**
   * Deletes an income deposit by ID
   */
  deleteIncome(id) {
    if (!this.state.incomeSources) return;
    this.state.incomeSources = this.state.incomeSources.filter(i => i.id !== id);
    this.saveToSupabase(this.state);
  }

  /**
   * Calculates total income received across all sources
   */
  getTotalIncome() {
    const sources = this.state.incomeSources || [];
    const total = sources.reduce((acc, inc) => acc + (parseFloat(inc.amount) || 0), 0);
    return parseFloat(total.toFixed(2));
  }

  /**
   * Calculates total expenses across all categories and surprise expenses across all recorded weeks
   */
  getTotalExpensesAllTime() {
    let total = 0;
    const weeks = this.state.weeks || {};
    Object.values(weeks).forEach(week => {
      if (!week) return;
      if (week.dailySpends) {
        for (let d = 0; d < 7; d++) {
          const day = week.dailySpends[d];
          if (day) {
            CATEGORIES.forEach(cat => {
              const cell = day[cat.id];
              if (cell && Array.isArray(cell.items)) {
                total += cell.items.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0);
              } else if (cell && cell.amount) {
                total += parseFloat(cell.amount) || 0;
              }
            });
          }
        }
      }
      if (Array.isArray(week.surprises)) {
        total += week.surprises.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);
      }
    });
    return parseFloat(total.toFixed(2));
  }

  /**
   * Live Cash Balance: Total Inflows (Deposits) - Total Expenses across all categories & surprises
   */
  getLiveBalance() {
    const totalIncome = this.getTotalIncome();
    const totalExpenses = this.getTotalExpensesAllTime();
    return parseFloat((totalIncome - totalExpenses).toFixed(2));
  }

  /**
   * Detailed breakdown for Live Balance capsule
   */
  getLiveBalanceDetails() {
    const totalIncome = this.getTotalIncome();
    const totalExpenses = this.getTotalExpensesAllTime();
    const liveBalance = parseFloat((totalIncome - totalExpenses).toFixed(2));
    const incomeList = this.state.incomeSources || [];
    return {
      liveBalance,
      totalIncome,
      totalExpenses,
      incomeList
    };
  }

  resetCurrentWeek() {
    const currentId = this.state.activeWeekId;
    const currentBal = this.getActiveWeek().startingBalance || 7500;
    this.state.weeks[currentId] = createEmptyWeek(currentId, null, null, currentBal);
    this.saveToSupabase(this.state);
  }

  archiveActiveWeek() {
    const week = this.getActiveWeek();
    week.finalized = true;
    week.finalizedAt = new Date().toISOString();

    const info = getWeekDateInfo(week.id);
    const monthKey = info.monthId;
    if (!this.state.monthlyArchives) this.state.monthlyArchives = [];
    
    let monthEntry = this.state.monthlyArchives.find(m => m.monthId === monthKey);
    if (!monthEntry) {
      monthEntry = {
        monthId: monthKey,
        monthLabel: info.monthLabel,
        weekIds: []
      };
      this.state.monthlyArchives.push(monthEntry);
    }

    if (!monthEntry.weekIds.includes(week.id)) {
      monthEntry.weekIds.push(week.id);
    }

    this.saveToSupabase(this.state);
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
      this.sanitizeLoadedState();
      this.saveToSupabase(this.state);
      return { success: true, message: 'Backup successfully restored to Supabase Cloud!' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async clearAllData() {
    const currentWeekId = getWeekIdentifier(new Date());
    const cleanState = {
      version: 7,
      activeWeekId: currentWeekId,
      weeks: {},
      todos: [],
      incomeSources: [],
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

    // Delete or reset row in Supabase database
    try {
      const client = (typeof window !== 'undefined' && window.CampusSupabase)
        ? window.CampusSupabase.getClient()
        : null;
      if (client) {
        await client.from(DB_TABLE_NAME).delete().eq('id', DB_ROW_ID);
      }
    } catch (e) {
      console.warn('Supabase delete error during clearAllData:', e);
    }

    this.saveToSupabase(this.state);
  }

  loadSampleStarterData() {
    const sample = getSampleState();
    this.state = sample;
    this.sanitizeLoadedState();
    this.saveToSupabase(this.state);
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
      const pcts = this.getBudgetPercentages();
      Object.keys(this.state.weeks).forEach(wId => {
        if (wId >= currentCalWeekId) {
          const w = this.state.weeks[wId];
          if (w) {
            const hasUserSpends = Object.values(w.dailySpends || {}).some(d => (d.food?.items?.length > 0) || (d.necessities?.items?.length > 0));
            if (!hasUserSpends || wId === this.state.activeWeekId) {
              w.startingBalance = val;
              if (!w.allottedBudgets) w.allottedBudgets = {};
              w.allottedBudgets.food = Math.round(val * (pcts.food / 100));
              w.allottedBudgets.necessities = Math.max(0, val - w.allottedBudgets.food);
            }
          }
        }
      });
    }

    this.saveToSupabase(this.state);
  }

  getBudgetPercentages() {
    if (this.state && this.state.settings && this.state.settings.budgetPercentages) {
      const p = this.state.settings.budgetPercentages;
      const food = (p.food !== undefined) ? Math.max(0, Math.min(100, parseFloat(p.food) || 0)) : 24;
      const nec = (p.necessities !== undefined) ? Math.max(0, Math.min(100, parseFloat(p.necessities) || 0)) : (100 - food);
      return { food, necessities: nec };
    }
    return { food: 24, necessities: 76 };
  }

  setBudgetPercentages(foodPct, necessitiesPct, applyToWeeks = true) {
    let food = Math.max(0, Math.min(100, Math.round(parseFloat(foodPct) || 0)));
    let nec = Math.max(0, Math.min(100, Math.round(parseFloat(necessitiesPct) || 0)));
    if (food + nec !== 100) {
      nec = 100 - food;
    }

    if (!this.state.settings) this.state.settings = {};
    this.state.settings.budgetPercentages = { food, necessities: nec };

    // Update CATEGORIES defaultPct in-memory
    const foodCat = CATEGORIES.find(c => c.id === 'food');
    if (foodCat) foodCat.defaultPct = food / 100;
    const necCat = CATEGORIES.find(c => c.id === 'necessities');
    if (necCat) necCat.defaultPct = nec / 100;

    if (applyToWeeks) {
      const currentCalWeekId = getWeekIdentifier(new Date());
      Object.keys(this.state.weeks).forEach(wId => {
        const w = this.state.weeks[wId];
        if (w && !w.finalized && (wId >= currentCalWeekId || wId === this.state.activeWeekId)) {
          const startingVal = parseFloat(w.startingBalance) || 0;
          const foodVal = Math.round(startingVal * (food / 100));
          const necVal = Math.max(0, startingVal - foodVal);
          if (!w.allottedBudgets) w.allottedBudgets = {};
          w.allottedBudgets.food = foodVal;
          w.allottedBudgets.necessities = necVal;
        }
      });
    }

    this.saveToSupabase(this.state);
    this.notifyListeners();
  }

  getSettings() {
    return this.state.settings || { currency: '₹', reminderTime: '21:00', defaultStartingCash: 7500, notificationsEnabled: true, soundEnabled: true };
  }

  updateSettings(newSettings) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.saveToSupabase(this.state);
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
    this.saveToSupabase(this.state);
  }
}

// Instantiate singleton StateManager
const stateInstance = new StateManager();

if (typeof window !== 'undefined') {
  window.CampusState = stateInstance;
}
if (typeof global !== 'undefined') {
  global.CampusState = stateInstance;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = stateInstance;
}
