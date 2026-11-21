export const FORMULAS = {
  thisMonth: 'if(empty(prop("Date")), false, formatDate(prop("Date"), "YYYY-MM") == formatDate(now(), "YYYY-MM"))',
  amountThisMonth: 'if(prop("This Month"), prop("Amount (৳)"), 0)',
  monthlyCost: 'if(!prop("Active"), 0, if(prop("Billing") == "Yearly", prop("Price (৳)") / 12, prop("Price (৳)")))',
  progress: 'if(prop("Target (৳)") > 0, min(prop("Saved (৳)") / prop("Target (৳)"), 1), 0)',
  budgetLeft: 'prop("Monthly Budget (৳)") - prop("Spent This Month (৳)")',
  overBudget: 'if(prop("Monthly Budget (৳)") > 0, prop("Spent This Month (৳)") > prop("Monthly Budget (৳)"), false)',
  leftToSpend: 'prop("Income This Month (৳)") - prop("Spent This Month (৳)")',
};

const title = () => ({ title: {} });
const money = () => ({ number: { format: 'number_with_commas' } });
const date = () => ({ date: {} });
const select = (...names) => ({ select: { options: names.map((name) => ({ name })) } });
export const formula = (expression) => ({ formula: { expression } });

export const baseProperties = {
  wallet: {
    Name: title(),
  },
  categories: {
    Name: title(),
    'Monthly Budget (৳)': money(),
  },
  expenses: {
    Name: title(),
    'Amount (৳)': money(),
    Date: date(),
    'Paid With': select('Cash', 'bKash', 'Card'),
    'This Month': formula(FORMULAS.thisMonth),
    'Amount This Month': formula(FORMULAS.amountThisMonth),
  },
  income: {
    Name: title(),
    'Amount (৳)': money(),
    Date: date(),
    Source: select('Pocket Money', 'Tuition', 'Gift', 'Other'),
    'This Month': formula(FORMULAS.thisMonth),
    'Amount This Month': formula(FORMULAS.amountThisMonth),
  },
  subscriptions: {
    Name: title(),
    'Price (৳)': money(),
    Billing: select('Monthly', 'Yearly'),
    'Next Renewal': date(),
    Active: { checkbox: {} },
    'Monthly Cost': formula(FORMULAS.monthlyCost),
  },
  goals: {
    Name: title(),
    'Target (৳)': money(),
    'Saved (৳)': money(),
    Deadline: date(),
    Progress: formula(FORMULAS.progress),
  },
};

export function relationProp(targetDataSourceId, dual = true) {
  return {
    relation: dual
      ? { data_source_id: targetDataSourceId, type: 'dual_property', dual_property: {} }
      : { data_source_id: targetDataSourceId, type: 'single_property', single_property: {} },
  };
}

export function rollupSum(relationName, rollupPropName) {
  return {
    rollup: { relation_property_name: relationName, rollup_property_name: rollupPropName, function: 'sum' },
  };
}
