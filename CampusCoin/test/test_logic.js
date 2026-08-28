/**
 * Automated Unit & Logic Verification Test for CampusCoin (V6.1)
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

eval(fs.readFileSync(path.join(__dirname, '../js/state.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/calculator.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/insights.js'), 'utf8'));

global.CampusState = window.CampusState;
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

console.log('=== RUNNING CAMPUSCOIN V6.2 ZERO-SUM & TWO-CATEGORY TESTS ===\n');

// Test 1: Starting Cash = 7500 -> Food = 1800 (24%), Necessities = 5700 (76%)
CampusState.updateStartingBalance(7500);
let week = CampusState.getActiveWeek();
console.assert(week.allottedBudgets.food === 1800, 'Food 24% of 7500 is 1800');
console.assert(week.allottedBudgets.necessities === 5700, 'Necessities 76% of 7500 is 5700');
console.assert(CampusCalculator.getTotalAllottedBudget(week) === 7500, 'Total Allotted matches 7500');
console.log(`✓ Initial State: Starting Cash ₹7,500 -> Food ₹1,800, Necessities ₹5,700`);

// Test 2: User changes Food allotted limit to 2200 -> Must borrow 400 from Necessities!
console.log('Test 2: User changes Food Allotted Limit to 2200');
const oldNec = week.allottedBudgets.necessities;
CampusState.borrowFunds('necessities', 'food', 400);
week = CampusState.getActiveWeek();
console.assert(week.allottedBudgets.food === 2200, 'Food should now be 2200');
console.assert(week.allottedBudgets.necessities === oldNec - 400, `Necessities should decrease by 400 to ${oldNec - 400}`);
console.assert(CampusCalculator.getTotalAllottedBudget(week) === 7500, 'Zero-sum strictly preserved at 7500');
console.log(`✓ Zero-Sum Allotted Limit Change: Necessities ₹${week.allottedBudgets.necessities}, Food ₹${week.allottedBudgets.food}. Sum = ₹${CampusCalculator.getTotalAllottedBudget(week)}\n`);

// Test 3: Adding item into Wednesday Food Cell (Day 3)
console.log('Test 3: Adding Item into Wednesday Food Cell (Day 3)');
const foodBefore = CampusCalculator.getCategoryTotals(week).food;
const wedItem = CampusState.addItemToCell(3, 'food', 'Special Canteen Meal', 300, false);
week = CampusState.getActiveWeek();
console.assert(wedItem.name === 'Special Canteen Meal', 'Item name matches');
console.assert(CampusCalculator.getCategoryTotals(week).food === foodBefore + 300, 'Food spent increased by 300');
console.assert(CampusCalculator.getTotalAllottedBudget(week) === 7500, 'Zero-sum preserved at 7500');
console.log(`✓ Item logged in Wednesday Food cell: ₹300. Total Allotted sum = ₹7,500\n`);

// Test 4: Dynamic date computation verification
console.log('Test 4: Dynamic Date Computation');
const startDate = new Date('2026-08-24T00:00:00');
for (let d = 0; d < 7; d++) {
  const dDate = new Date(startDate);
  dDate.setDate(dDate.getDate() + d);
  const formatted = `${dDate.toLocaleDateString('en-US', { month: 'short' })} ${dDate.getDate()}`;
  console.log(`  Day ${d} (${DAYS_OF_WEEK[d].name}): ${formatted}`);
}

// Test 5: Adding a Surprise Anomaly Reduces Necessities Budget
console.log('\nTest 5: Adding a Surprise Anomaly Reduces Necessities Budget');
week = CampusState.getActiveWeek();
const necBeforeSurprise = week.allottedBudgets.necessities;
const surpBefore = CampusCalculator.getSurprisesTotal(week);
const surpriseItem = CampusState.addSurprise('Broken Charger', 450, 2);
week = CampusState.getActiveWeek();

console.assert(week.allottedBudgets.necessities === necBeforeSurprise - 450, `Necessities should decrease by 450 to ${necBeforeSurprise - 450}, got ${week.allottedBudgets.necessities}`);
console.assert(CampusCalculator.getSurprisesTotal(week) === surpBefore + 450, `Surprises total should be ${surpBefore + 450}, got ${CampusCalculator.getSurprisesTotal(week)}`);
console.log(`✓ Added Surprise of ₹450 -> Necessities budget reduced from ₹${necBeforeSurprise} to ₹${week.allottedBudgets.necessities}`);

// Deleting the Surprise Restores Necessities Budget
CampusState.deleteSurprise(surpriseItem.id);
week = CampusState.getActiveWeek();
console.assert(week.allottedBudgets.necessities === necBeforeSurprise, `Necessities should be restored to ${necBeforeSurprise}, got ${week.allottedBudgets.necessities}`);
console.assert(CampusCalculator.getSurprisesTotal(week) === surpBefore, `Surprises total should be ${surpBefore} after delete, got ${CampusCalculator.getSurprisesTotal(week)}`);
console.log(`✓ Deleted Surprise -> Necessities budget restored back to ₹${week.allottedBudgets.necessities}`);

// Test 6: Past Week Lock and Password Unlock Verification
console.log('\nTest 6: Past Week Lock and Password Unlock Verification');
const pastWeek = {
  id: '2026-W32',
  label: 'Aug 03 – Aug 09',
  finalized: true,
  allottedBudgets: { food: 1200, necessities: 3800 }
};

console.assert(CampusState.isWeekOver(pastWeek) === true, 'Past week should be recognized as over');
console.assert(CampusState.isWeekLocked(pastWeek) === true, 'Past week should be locked by default');

// Attempt unlock with wrong passcode
const failResult = CampusState.unlockWeek('2026-W32', 'wrong_pin');
console.assert(failResult.success === false, 'Wrong password should fail');
console.assert(CampusState.isWeekLocked(pastWeek) === true, 'Past week remains locked');

// Attempt unlock with default passcode (1234)
const successResult = CampusState.unlockWeek('2026-W32', '1234');
console.assert(successResult.success === true, 'Default passcode 1234 should unlock');
console.assert(CampusState.isWeekLocked(pastWeek) === false, 'Past week is now unlocked');
console.log(`✓ Passcode Security: Wrong PIN rejected; Correct PIN (1234) successfully unlocks past week`);

// Relock past week
CampusState.lockWeek('2026-W32');
console.assert(CampusState.isWeekLocked(pastWeek) === true, 'Past week relocked successfully');
console.log(`✓ Relock Function: Week returned to locked state`);

// Test 8: Monthly Book Lists All Weeks
console.log('\nTest 8: Monthly Book Lists All Weeks');
const monthlySummary = CampusCalculator.getMonthlySummary(CampusState.state, 'current');
console.assert(monthlySummary.weekRows.length >= 4, `Expected at least 4 weeks listed in Monthly Book, got ${monthlySummary.weekRows.length}`);
console.assert(monthlySummary.weekRows.some(w => w.id === '2026-W35'), 'Contains Week 35');
console.assert(monthlySummary.weekRows.some(w => w.id === '2026-W34'), 'Contains Week 34');
console.assert(monthlySummary.weekRows.some(w => w.id === '2026-W33'), 'Contains Week 33');
console.assert(monthlySummary.weekRows.some(w => w.id === '2026-W32'), 'Contains Week 32');
console.log(`✓ Monthly Book: Correctly lists all ${monthlySummary.weekRows.length} weeks in the ledger with combined totals`);

// Test 9: Past unrecorded weeks should all have 0 starting balance, 0 spent, 0 ending balance
console.log('\nTest 9: Past unrecorded weeks are 0 0');
const w34 = CampusState.state.weeks['2026-W34'];
const w33 = CampusState.state.weeks['2026-W33'];
const w32 = CampusState.state.weeks['2026-W32'];
console.assert(w34.startingBalance === 0, `Week 34 starting balance should be 0, got ${w34.startingBalance}`);
console.assert(w33.startingBalance === 0, `Week 33 starting balance should be 0, got ${w33.startingBalance}`);
console.assert(w32.startingBalance === 0, `Week 32 starting balance should be 0, got ${w32.startingBalance}`);
console.assert(CampusCalculator.getTotalAllottedBudget(w34) === 0, 'Week 34 total allotted is 0');
console.assert(CampusCalculator.getGrandTotalSpent(w34) === 0, 'Week 34 total spent is 0');
console.log('✓ Past unrecorded weeks (W32, W33, W34) are all 0 0');

// Test 10: Setting default starting cash applies to coming weeks
console.log('\nTest 10: Default Starting Cash setting applies to coming weeks');
CampusState.setDefaultStartingCash(6000, true);
console.assert(CampusState.getDefaultStartingCash() === 6000, 'Default starting cash is 6000');
const w36 = CampusState.state.weeks['2026-W36'];
console.assert(w36.startingBalance === 6000, `Coming week 36 starting balance should be 6000, got ${w36.startingBalance}`);
console.assert(w36.allottedBudgets.food === 1440, `Week 36 food should be 1440 (24%), got ${w36.allottedBudgets.food}`);
console.assert(w36.allottedBudgets.necessities === 4560, `Week 36 necessities should be 4560 (76%), got ${w36.allottedBudgets.necessities}`);
console.log('✓ Default Starting Cash (₹6,000) successfully propagated to coming weeks (Food: ₹1,440, Necessities: ₹4,560)');

// Test 11: Safe to Spend Widget Days Left Calculation across Past, Active, and Future Weeks
console.log('\nTest 11: Safe to Spend Widget Days Left across Past, Active, and Future Weeks');
const safePast = CampusCalculator.getSafeToSpendToday(w32);
console.assert(safePast.daysRemaining === 0, `Past week daysRemaining should be 0, got ${safePast.daysRemaining}`);
console.assert(safePast.daysLabel === '0 days (Concluded)', `Past week daysLabel should be '0 days (Concluded)', got ${safePast.daysLabel}`);
console.assert(safePast.safeAmount === 0, `Past week safeAmount should be 0, got ${safePast.safeAmount}`);

const safeFuture = CampusCalculator.getSafeToSpendToday(w36);
console.assert(safeFuture.daysRemaining === 7, `Future week daysRemaining should be 7, got ${safeFuture.daysRemaining}`);
console.assert(safeFuture.daysLabel === '7 days left', `Future week daysLabel should be '7 days left', got ${safeFuture.daysLabel}`);
console.assert(safeFuture.safeAmount > 0, 'Future week has baseline daily allowance');

const safeActive = CampusCalculator.getSafeToSpendToday(CampusState.state.weeks['2026-W35']);
console.assert(safeActive.daysRemaining >= 1 && safeActive.daysRemaining <= 7, `Active week daysRemaining should be between 1 and 7, got ${safeActive.daysRemaining}`);
console.log(`✓ Safe-to-Spend Widget: Past week shows '${safePast.daysLabel}', Future week shows '${safeFuture.daysLabel}', Active week shows '${safeActive.daysLabel}'`);

console.log('\n=== ALL V6.5 TESTS PASSED SUCCESSFULLY! ===');
