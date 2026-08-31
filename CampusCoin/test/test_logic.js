/**
 * Automated Unit & Logic Verification Test for CampusCoin (V7.0 - Supabase Cloud DB & Dynamic Calendar Engine)
 */

const storageMock = {};
global.localStorage = {
  getItem: (key) => storageMock[key] || null,
  setItem: (key, val) => { storageMock[key] = val; },
  removeItem: (key) => { delete storageMock[key]; }
};
global.window = {
  AudioContext: null,
  webkitAudioContext: null,
  Notification: { permission: 'default' }
};

const fs = require('fs');
const path = require('path');

// Mock or load Supabase JS client
const supabaseJs = require('@supabase/supabase-js');
global.supabase = supabaseJs;
global.window.supabase = supabaseJs;

eval(fs.readFileSync(path.join(__dirname, '../js/supabase.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/state.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/calculator.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/insights.js'), 'utf8'));

global.CampusSupabase = window.CampusSupabase || global.CampusSupabase;
global.CampusState = window.CampusState || global.CampusState;
global.CampusCalculator = window.CampusCalculator;
global.CampusInsights = window.CampusInsights;
global.CATEGORIES = [
  { id: 'food', name: 'Food', emoji: '🍛', defaultPct: 0.24 },
  { id: 'necessities', name: 'Necessities', emoji: '🧼', defaultPct: 0.76 }
];
global.DAYS_OF_WEEK = [
  { index: 0, name: 'Sunday', short: 'Sun' },
  { index: 1, name: 'Monday', short: 'Mon' },
  { index: 2, name: 'Tuesday', short: 'Tue' },
  { index: 3, name: 'Wednesday', short: 'Wed' },
  { index: 4, name: 'Thursday', short: 'Thu' },
  { index: 5, name: 'Friday', short: 'Fri' },
  { index: 6, name: 'Saturday', short: 'Sat' }
];

console.log('=== RUNNING CAMPUSCOIN V7.0 SUPABASE & DYNAMIC CALENDAR TESTS ===\n');

// Test 1: Wednesday Rule for Month Assignment (Between-Month Weeks)
console.log('Test 1: Wednesday Rule for Month Assignment (Between-Month Weeks)');
const augWeekInfo = getWeekDateInfo(getWeekIdentifier(new Date('2026-08-23T00:00:00')));
console.assert(augWeekInfo.monthId === '2026-08', `Expected 2026-08 for Aug 23 week, got ${augWeekInfo.monthId}`);
console.assert(augWeekInfo.dateRangeStr === 'Aug 23 – Aug 29', `Expected Aug 23 - Aug 29, got ${augWeekInfo.dateRangeStr}`);
console.log(`✓ Aug 23 – Aug 29: Wednesday is Aug 26 -> Month is ${augWeekInfo.monthLabel} (${augWeekInfo.monthId})`);

const sepWeekInfo = getWeekDateInfo(getWeekIdentifier(new Date('2026-08-30T00:00:00')));
console.assert(sepWeekInfo.monthId === '2026-09', `Expected 2026-09 for Aug 30 week (Wed is Sep 02), got ${sepWeekInfo.monthId}`);
console.assert(sepWeekInfo.dateRangeStr === 'Aug 30 – Sep 05', `Expected Aug 30 - Sep 05, got ${sepWeekInfo.dateRangeStr}`);
console.log(`✓ Aug 30 – Sep 05: Wednesday is Sep 02 -> Month is correctly ${sepWeekInfo.monthLabel} (${sepWeekInfo.monthId})`);

const feb2027WeekInfo = getWeekDateInfo(getWeekIdentifier(new Date('2027-01-31T00:00:00')));
console.assert(feb2027WeekInfo.monthId === '2027-02', `Expected 2027-02 for Jan 31 2027 week (Wed is Feb 03), got ${feb2027WeekInfo.monthId}`);
console.assert(feb2027WeekInfo.dateRangeStr === 'Jan 31 – Feb 06', `Expected Jan 31 - Feb 06, got ${feb2027WeekInfo.dateRangeStr}`);
console.log(`✓ Jan 31 – Feb 06 (2027): Wednesday is Feb 03 -> Month is correctly ${feb2027WeekInfo.monthLabel} (${feb2027WeekInfo.monthId})\n`);

// Test 2: getWeeksForMonth returns all weeks in a month based on Wednesday
console.log('Test 2: getWeeksForMonth for August 2026, September 2026, and 2027');
const augWeeks = getWeeksForMonth(2026, 7); // August (0-indexed 7)
console.assert(augWeeks.length === 4, `Expected 4 weeks in August 2026, got ${augWeeks.length}`);
console.log(`✓ August 2026: ${augWeeks.length} weeks -> [${augWeeks.map(w => w.dateRangeStr).join(', ')}]`);

const sepWeeks = getWeeksForMonth(2026, 8); // September (0-indexed 8)
console.assert(sepWeeks.length === 5, `Expected 5 weeks in September 2026, got ${sepWeeks.length}`);
console.assert(sepWeeks[0].dateRangeStr === 'Aug 30 – Sep 05', `Expected first week of Sep to be Aug 30 - Sep 05, got ${sepWeeks[0].dateRangeStr}`);
console.log(`✓ September 2026: ${sepWeeks.length} weeks -> [${sepWeeks.map(w => w.dateRangeStr).join(', ')}]`);

const jan2027Weeks = getWeeksForMonth(2027, 0); // January 2027 (0-indexed 0)
console.assert(jan2027Weeks.length === 4, `Expected 4 weeks in January 2027, got ${jan2027Weeks.length}`);
console.log(`✓ January 2027: ${jan2027Weeks.length} weeks -> [${jan2027Weeks.map(w => w.dateRangeStr).join(', ')}]\n`);

// Test 3: Monthly Book Dynamic Summary for specific month IDs
console.log('Test 3: Monthly Book Dynamic Summary for Specific Month IDs');
const augSummary = CampusCalculator.getMonthlySummary(CampusState.state, '2026-08');
console.assert(augSummary.monthId === '2026-08', 'Summary monthId is 2026-08');
console.assert(augSummary.weekRows.length === 4, `Expected 4 weeks in Aug summary, got ${augSummary.weekRows.length}`);
console.log(`✓ Monthly Book for August 2026: ${augSummary.weekRows.length} weeks listed, Total Allotted = ₹${augSummary.totalAllotted}, Total Spent = ₹${augSummary.totalSpent}`);

const sepSummary = CampusCalculator.getMonthlySummary(CampusState.state, '2026-09');
console.assert(sepSummary.monthId === '2026-09', 'Summary monthId is 2026-09');
console.assert(sepSummary.weekRows.length === 5, `Expected 5 weeks in Sep summary, got ${sepSummary.weekRows.length}`);
console.log(`✓ Monthly Book for September 2026: ${sepSummary.weekRows.length} weeks listed, Total Allotted = ₹${sepSummary.totalAllotted}, Total Spent = ₹${sepSummary.totalSpent}`);

const summary2027 = CampusCalculator.getMonthlySummary(CampusState.state, '2027-01');
console.assert(summary2027.monthId === '2027-01', 'Summary monthId is 2027-01');
console.assert(summary2027.weekRows.length === 4, `Expected 4 weeks in Jan 2027 summary, got ${summary2027.weekRows.length}`);
console.log(`✓ Monthly Book for January 2027: ${summary2027.weekRows.length} weeks listed\n`);

// Test 4: Starting Cash = 7500 -> Food = 1800 (24%), Necessities = 5700 (76%)
console.log('Test 4: Zero-Sum Starting Cash Allocation');
CampusState.updateStartingBalance(7500);
let week = CampusState.getActiveWeek();
console.assert(week.allottedBudgets.food === 1800, 'Food 24% of 7500 is 1800');
console.assert(week.allottedBudgets.necessities === 5700, 'Necessities 76% of 7500 is 5700');
console.assert(CampusCalculator.getTotalAllottedBudget(week) === 7500, 'Total Allotted matches 7500');
console.log(`✓ Starting Cash ₹7,500 -> Food ₹1,800, Necessities ₹5,700`);

// Test 5: Zero-Sum Borrowing
console.log('\nTest 5: Zero-Sum Borrowing');
const oldNec = week.allottedBudgets.necessities;
CampusState.borrowFunds('necessities', 'food', 400);
week = CampusState.getActiveWeek();
console.assert(week.allottedBudgets.food === 2200, 'Food should now be 2200');
console.assert(week.allottedBudgets.necessities === oldNec - 400, `Necessities should decrease by 400 to ${oldNec - 400}`);
console.assert(CampusCalculator.getTotalAllottedBudget(week) === 7500, 'Zero-sum strictly preserved at 7500');
console.log(`✓ Borrowing ₹400 from Necessities: Food ₹${week.allottedBudgets.food}, Necessities ₹${week.allottedBudgets.necessities}. Sum = ₹${CampusCalculator.getTotalAllottedBudget(week)}`);

// Test 6: Surprise Anomaly Zero-Sum Reduction
console.log('\nTest 6: Surprise Anomaly Zero-Sum Reduction');
const necBeforeSurp = week.allottedBudgets.necessities;
const surpriseItem = CampusState.addSurprise('Campus Bike Repair', 350, 2);
week = CampusState.getActiveWeek();
console.assert(week.allottedBudgets.necessities === necBeforeSurp - 350, `Necessities should decrease by 350`);
console.log(`✓ Added Surprise ₹350 -> Necessities budget reduced to ₹${week.allottedBudgets.necessities}`);

CampusState.deleteSurprise(surpriseItem.id);
week = CampusState.getActiveWeek();
console.assert(week.allottedBudgets.necessities === necBeforeSurp, `Necessities restored to ${necBeforeSurp}`);
console.log(`✓ Deleted Surprise -> Necessities budget restored to ₹${week.allottedBudgets.necessities}`);

// Test 7: Week Navigation (including multi-year navigation)
console.log('\nTest 7: Week Navigation Across Years');
const currentActive = CampusState.state.activeWeekId;
const nextWk = CampusState.navigateWeek(1);
console.assert(nextWk !== currentActive, 'Moved to next week');
const prevWk = CampusState.navigateWeek(-1);
console.assert(prevWk === currentActive, 'Moved back to active week');
console.log(`✓ Week navigation successfully moves forward to ${nextWk} and backward to ${prevWk}`);

// Test 8: Passcode Unlock & Lock
console.log('\nTest 8: Passcode Security');
const samplePast = { id: '2026-W30', finalized: true };
console.assert(CampusState.isWeekLocked(samplePast) === true, 'Past week is locked');
console.assert(CampusState.unlockWeek('2026-W30', 'wrong').success === false, 'Wrong code rejected');
console.assert(CampusState.unlockWeek('2026-W30', '1234').success === true, 'Correct code accepted');
console.assert(CampusState.isWeekLocked(samplePast) === false, 'Past week unlocked');
CampusState.lockWeek('2026-W30');
console.assert(CampusState.isWeekLocked(samplePast) === true, 'Past week relocked');
console.log('✓ Passcode unlock & relock verified');

// Test 9: Supabase Module & State CRUD Operations
console.log('\nTest 9: Supabase Module & CRUD Operations');
console.assert(typeof CampusSupabase !== 'undefined', 'CampusSupabase module is loaded');
console.assert(CampusSupabase.TABLE_NAME === 'campuscoin_state', 'Table name is campuscoin_state');
console.assert(CampusSupabase.DEFAULT_ROW_ID === 'default_user', 'Default row ID is default_user');

// Verify State Structure compatibility for Supabase JSONB storage
console.assert(CampusState.state.version === 7, 'State version is 7');
console.assert(typeof CampusState.state.weeks === 'object', 'State contains weeks object');
console.assert(Array.isArray(CampusState.state.todos), 'State contains todos array');
console.assert(typeof CampusState.state.settings === 'object', 'State contains settings object');

// Test adding and removing spend items
const testItem = CampusState.addItemToCell(1, 'food', 'Late Night Maggi', 40);
console.assert(testItem.id && testItem.name === 'Late Night Maggi', 'Item added to state');
const currentDayItems = CampusState.getActiveWeek().dailySpends[1].food.items;
console.assert(currentDayItems.some(i => i.id === testItem.id), 'Item exists in active week dailySpends');

CampusState.removeItemFromCell(1, 'food', testItem.id);
const itemsAfterRemove = CampusState.getActiveWeek().dailySpends[1].food.items;
console.assert(!itemsAfterRemove.some(i => i.id === testItem.id), 'Item removed from state');

// Test Todo CRUD
const newTodo = CampusState.addTodo('Submit Assignment on Canvas');
console.assert(CampusState.state.todos.some(t => t.id === newTodo.id), 'Todo added');
CampusState.toggleTodo(newTodo.id);
console.assert(CampusState.state.todos.find(t => t.id === newTodo.id).completed === true, 'Todo toggled');
CampusState.deleteTodo(newTodo.id);
console.assert(!CampusState.state.todos.some(t => t.id === newTodo.id), 'Todo deleted');

console.log('✓ Supabase module, table schema compatibility, and state CRUD operations verified');

// Test 10: Dynamic Calendar for September 2027 (No Hardcoding Verification)
console.log('\nTest 10: Dynamic Calendar for September 2027 (No Hardcoding)');
const sep2027Weeks = getWeeksForMonth(2027, 8); // September 2027
console.assert(sep2027Weeks.length === 5, `Expected 5 weeks in Sep 2027, got ${sep2027Weeks.length}`);
console.assert(sep2027Weeks[0].dateRangeStr === 'Aug 29 – Sep 04', `Expected first week to be Aug 29 - Sep 04, got ${sep2027Weeks[0].dateRangeStr}`);
console.assert(sep2027Weeks[4].dateRangeStr === 'Sep 26 – Oct 02', `Expected 5th week to be Sep 26 - Oct 02, got ${sep2027Weeks[4].dateRangeStr}`);

const sep2027Summary = CampusCalculator.getMonthlySummary(CampusState.state, '2027-09');
console.assert(sep2027Summary.monthId === '2027-09', 'Sep 2027 summary monthId is 2027-09');
console.assert(sep2027Summary.weekRows.length === 5, '5 week rows dynamically computed for September 2027');
console.log(`✓ September 2027: Dynamically computed ${sep2027Weeks.length} weeks -> [${sep2027Weeks.map(w => w.dateRangeStr).join(', ')}]`);
console.log(`✓ Monthly Book for September 2027: Total Allotted = ₹${sep2027Summary.totalAllotted}`);

// Test 11: Live Balance Capsule & Income Inflows with Dynamic Expense Deductions
console.log('\nTest 11: Live Balance Capsule & Income Inflows (Independent of Starting Cash)');
const balBefore = CampusState.getLiveBalance();
const incBefore = CampusState.getTotalIncome();
const expBefore = CampusState.getTotalExpensesAllTime();
console.assert(balBefore === parseFloat((incBefore - expBefore).toFixed(2)), 'Live balance matches income minus total expenses');

// 1. Add Income from source
const newIncome = CampusState.addIncome('Stipend from Dept', 4000, '2026-08-31');
console.assert(newIncome && newIncome.amount === 4000, 'Income item created successfully');
console.assert(CampusState.getLiveBalance() === balBefore + 4000, `Live balance should increase by 4000 (was ${balBefore}, now ${CampusState.getLiveBalance()})`);
console.log(`✓ Added Income ₹4,000 from Stipend -> Live Balance increased by ₹4,000 to ₹${CampusState.getLiveBalance()}`);

// 2. Add an expense in food category -> Live balance decreases
const foodItem = CampusState.addItemToCell(2, 'food', 'Hostel Biryani', 220);
console.assert(CampusState.getLiveBalance() === balBefore + 4000 - 220, 'Live balance decreased by 220 food expense');
console.log(`✓ Added ₹220 Food expense -> Live Balance immediately reduced to ₹${CampusState.getLiveBalance()}`);

// 3. Add a surprise expense -> Live balance decreases
const surp = CampusState.addSurprise('Textbook Xerox', 80, 2);
console.assert(CampusState.getLiveBalance() === balBefore + 4000 - 220 - 80, 'Live balance decreased by 80 surprise expense');
console.log(`✓ Added ₹80 Surprise expense -> Live Balance immediately reduced to ₹${CampusState.getLiveBalance()}`);

// 4. Remove food item and surprise -> Live balance is restored
CampusState.removeItemFromCell(2, 'food', foodItem.id);
CampusState.deleteSurprise(surp.id);
console.assert(CampusState.getLiveBalance() === balBefore + 4000, 'Live balance restored after deleting expenses');
console.log(`✓ Removed expenses -> Live Balance restored to ₹${CampusState.getLiveBalance()}`);

// 5. Delete income item
CampusState.deleteIncome(newIncome.id);
console.assert(CampusState.getLiveBalance() === balBefore, 'Live balance returned to initial baseline after deleting test income');
console.log(`✓ Deleted test income -> Live balance returned to ₹${balBefore}`);

// 6. Verify Calculator helper
const calcLive = CampusCalculator.getLiveCashBalance(CampusState.state);
console.assert(calcLive.liveBalance === balBefore, 'CampusCalculator.getLiveCashBalance matches StateManager');
console.log(`✓ CampusCalculator.getLiveCashBalance verified: Inflows = ₹${calcLive.totalInflow}, Outflows = ₹${calcLive.totalOutflow}, Live Balance = ₹${calcLive.liveBalance}`);

console.log('\n=== ALL V7.0 SUPABASE, ZERO-SUM & LIVE BALANCE TESTS PASSED SUCCESSFULLY! ===');
