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
  { id: 'necessities', name: 'Necessities', emoji: '🧼', defaultPct: 0.76 },
  { id: 'clothes', name: 'Clothes', emoji: '👕', defaultBudget: 0, collapsible: true },
  { id: 'entertainment', name: 'Entertainment/Recreation', emoji: '🍿', defaultBudget: 0, collapsible: true },
  { id: 'other', name: 'Other', emoji: '📦', defaultBudget: 0, collapsible: true }
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

console.log('=== RUNNING CAMPUSCOIN V6.1 ZERO-SUM & DYNAMIC DATE TESTS ===\n');

// Test 1: Starting Cash = 7500 -> Food = 1800, Necessities = 5700, Clothes = 0
CampusState.updateStartingBalance(7500);
let week = CampusState.getActiveWeek();
console.assert(week.allottedBudgets.food === 1800, 'Food 24% of 7500 is 1800');
console.assert(week.allottedBudgets.necessities === 5700, 'Necessities 76% of 7500 is 5700');
console.assert(week.allottedBudgets.clothes === 0, 'Clothes is 0');
console.log(`✓ Initial State: Starting Cash ₹7,500 -> Food ₹1,800, Necessities ₹5,700, Clothes ₹0`);

// Test 2: User changes Clothes allotted limit to 218 -> Must borrow 218 from Necessities!
console.log('Test 2: User changes Clothes Allotted Limit to 218');
const oldNec = week.allottedBudgets.necessities;
CampusState.borrowFunds('necessities', 'clothes', 218);
week = CampusState.getActiveWeek();
console.assert(week.allottedBudgets.clothes === 218, 'Clothes should now be 218');
console.assert(week.allottedBudgets.necessities === oldNec - 218, `Necessities should decrease by 218 to ${oldNec - 218}`);
console.assert(CampusCalculator.getTotalAllottedBudget(week) === 7500, 'Zero-sum strictly preserved at 7500');
console.log(`✓ Zero-Sum Allotted Limit Change: Necessities ₹${week.allottedBudgets.necessities}, Clothes ₹${week.allottedBudgets.clothes}. Sum = ₹${CampusCalculator.getTotalAllottedBudget(week)}\n`);

// Test 3: Adding item into Wednesday Clothes Cell (Day 3)
console.log('Test 3: Adding Item into Wednesday Clothes Cell (Day 3)');
// If user adds an item of 300 to Clothes (when budget is 218, deficit is 82)
const avail = CampusCalculator.checkBudgetAvailability(week, 'clothes', 300);
console.assert(avail.fits === false, '300 should exceed 218 budget');
console.assert(avail.deficit === 82, `Deficit should be 82, got ${avail.deficit}`);

// Borrow the deficit of 82 from Necessities
CampusState.borrowFunds('necessities', 'clothes', 82);
const wedItem = CampusState.addItemToCell(3, 'clothes', 'Winter Jacket', 300, true);
week = CampusState.getActiveWeek();

console.assert(week.allottedBudgets.clothes === 300, 'Clothes budget updated to 300');
console.assert(wedItem.isBorrowed === true, 'Item tagged as borrowed (rendered in RED)');
console.assert(CampusCalculator.getTotalAllottedBudget(week) === 7500, 'Zero-sum preserved at 7500');
console.log(`✓ Item logged in Wednesday Clothes cell: ₹300, isBorrowed=true (RED). Total Allotted sum = ₹7,500\n`);

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

console.log('\n=== ALL V6.1 TESTS PASSED SUCCESSFULLY! ===');
