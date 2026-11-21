const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const SNACKS = '🥤 Snacks & Drinks';
const RIDES = '🚗 Rides';
const SUBS = '📺 Subscriptions';
const FOOD = '🍛 Food';
const STUDY = '📚 Study';
const OTHER = '🎁 Other';

const CATEGORIES = [
  [SNACKS, 500],
  [RIDES, 1500],
  [SUBS, 500],
  [FOOD, 2000],
  [STUDY, 600],
  [OTHER, 500],
];

// [name, amount, day of month, category, paid with]
const EXPENSES = [
  ['Coke', 40, 2, SNACKS, 'Cash'],
  ['Uber to campus', 220, 2, RIDES, 'bKash'],
  ['Spotify', 199, 3, SUBS, 'Card'],
  ['Lunch at cafeteria', 120, 3, FOOD, 'Cash'],
  ['Pathao bike ride', 150, 4, RIDES, 'bKash'],
  ['Coke', 40, 5, SNACKS, 'Cash'],
  ['Printing lab report', 60, 6, STUDY, 'Cash'],
  ['Uber home (late class)', 350, 7, RIDES, 'bKash'],
  ['Chips & Coke', 70, 8, SNACKS, 'Cash'],
  ['Biryani with friends', 250, 9, FOOD, 'bKash'],
  ['YouTube Premium', 239, 10, SUBS, 'Card'],
  ['CNG to tuition', 180, 11, RIDES, 'Cash'],
  ['Coke', 40, 12, SNACKS, 'Cash'],
  ['Photocopy CSE220 notes', 120, 13, STUDY, 'Cash'],
  ['Uber to campus', 240, 14, RIDES, 'bKash'],
  ['Tea & singara', 50, 15, FOOD, 'Cash'],
  ['Pathao bike ride', 160, 16, RIDES, 'bKash'],
  ['Lunch at cafeteria', 130, 17, FOOD, 'Cash'],
  ['Coke', 40, 18, SNACKS, 'Cash'],
  ['Birthday gift for friend', 300, 18, OTHER, 'bKash'],
  ['Uber to tuition (rain)', 320, 19, RIDES, 'bKash'],
  ['Burger', 180, 20, FOOD, 'Card'],
  ['Coke', 40, 21, SNACKS, 'Cash'],
  ['Pathao bike ride', 170, 21, RIDES, 'bKash'],
  ['Pens & notebook', 90, 21, STUDY, 'Cash'],
];

// [name, amount, day of month, source]
const INCOME = [
  ['Pocket money from parents', 5000, 1, 'Pocket Money'],
  ['Tuition fee (Class 8 student)', 4000, 5, 'Tuition'],
  ['Cash gift from uncle', 1000, 12, 'Gift'],
];

// [name, price, billing, days until renewal]
const SUBSCRIPTIONS = [
  ['Spotify', 199, 'Monthly', 3],
  ['YouTube Premium', 239, 'Monthly', 7],
  ['ChatGPT Plus', 2400, 'Monthly', 12],
];

// [name, target, saved, months until deadline]
const GOALS = [
  ['New headphones', 3500, 1200, 2],
  ['Emergency fund', 10000, 2500, 6],
];

export function buildSeed(today) {
  const dayInMonth = (day) => {
    const d = Math.min(Math.max(day, 1), today.getDate());
    return ymd(new Date(today.getFullYear(), today.getMonth(), d));
  };
  const addDays = (n) => ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
  const addMonths = (n) => ymd(new Date(today.getFullYear(), today.getMonth() + n, today.getDate()));

  return {
    categories: CATEGORIES.map(([name, budget]) => ({ name, budget })),
    expenses: EXPENSES.map(([name, amount, day, category, paidWith]) => ({
      name, amount, date: dayInMonth(day), category, paidWith,
    })),
    income: INCOME.map(([name, amount, day, source]) => ({ name, amount, date: dayInMonth(day), source })),
    subscriptions: SUBSCRIPTIONS.map(([name, price, billing, inDays]) => ({
      name, price, billing, nextRenewal: addDays(inDays), active: true,
    })),
    goals: GOALS.map(([name, target, saved, inMonths]) => ({ name, target, saved, deadline: addMonths(inMonths) })),
  };
}
