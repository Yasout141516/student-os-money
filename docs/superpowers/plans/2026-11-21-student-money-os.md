# Student OS: Money — Implementation Plan

> **For Devin:** Work task by task, in order. Tick the checkboxes as you go. Commit after each task. If a "STOP" condition is hit, stop and report; don't invent a workaround.

**Goal:** `npm run setup` creates a "💰 Money" section (6 linked databases + sample data) inside the user's Notion Student OS page.

**Architecture:** A Node.js CLI. `schema.js` holds pure functions that return Notion property definitions. `seed.js` holds pure functions that return sample rows. `setup.js` calls the Notion API in a fixed order (create databases → relations → rollups → cross-row formulas → seed). The pure parts are unit-tested with `node:test`. The Notion calls are verified by running against a real workspace.

**Tech Stack:** Node.js 20+, ESM (`"type": "module"`), `@notionhq/client` v5+, `dotenv`, built-in `node:test`. No other dependencies.

**Spec:** `docs/superpowers/specs/2026-11-21-student-money-os-design.md`. Read it first. Section 5 is the data model.

## Global Constraints

- Notion-Version `2025-09-03` or later. Relations use `data_source_id`, not database ID. Schema changes after creation go through `PATCH /v1/data_sources/{id}` (`notion.dataSources.update`).
- Every Wallet and Category link is ONE `dual_property` relation, created from the child side. Never two one-way relations.
- The Courses link is `single_property` (it doesn't touch the user's Courses database) and is only added if `NOTION_COURSES_DB_ID` is set.
- Money fields use format `number_with_commas`, and their names end in ` (৳)`, e.g. `Amount (৳)`.
- Formulas that feed rollups always return a number, never empty.
- Left to Spend = Income This Month − Spent This Month. Subscriptions are **not** subtracted.
- Every seeded Expense, Income and Subscription row has Wallet set.
- `.env` is never committed. `.env.example` is committed.
- Total build time is about 1.5 h. If behind schedule, cut in this order: the Course relation, Paid With, the Goals seed.

## Review Focus

1. **Expense with no Date:** the "This Month" formula must return false and "Amount This Month" must return 0, not an error. Tested in Task 2.
2. **Goal with Target 0 or empty:** Progress must be 0, not divide-by-zero. Tested in Task 2.
3. **Parent page not shared with the integration (404) or missing the Insert-content capability (403):** must print a plain-English fix, not a stack trace. Tested in Task 1.
4. **Seed run late in a month** (e.g. on the 30th) or early (on the 1st): all seeded dates must still be in the current month and not in the future. Tested in Task 4.
5. **Seed totals:** Rides must be the biggest category, so the demo chart tells a story. Tested in Task 4.

---

### Task 1: Scaffold + config

**Files:**
- Create: `package.json`, `.gitignore` (`node_modules`, `.env`), `.env.example`, `src/config.js`, `src/errors.js`
- Test: `test/config.test.js`, `test/errors.test.js`

**Interfaces:**
- Produces: `loadConfig(env = process.env) -> { token: string, parentPageId: string, coursesDbId: string|null }`. Throws an `Error` whose message names the missing variable and where to get it.
- Produces: `explainNotionError(err) -> string`, a friendly message for Notion errors: 401 → bad token, 403 → "give the integration Insert content capability", 404 / `object_not_found` → "share your Student OS page with the integration: ⋯ → Connections". Anything else returns `err.message`.

- [ ] **Step 1: Write the failing tests**
  - `loadConfig({})` throws, with a message containing `NOTION_TOKEN`.
  - `loadConfig({NOTION_TOKEN:'x'})` throws, with a message containing `NOTION_PARENT_PAGE_ID`.
  - `loadConfig({NOTION_TOKEN:'x', NOTION_PARENT_PAGE_ID:'p'})` returns `{token:'x', parentPageId:'p', coursesDbId:null}`.
  - `explainNotionError({status:404, code:'object_not_found'})` contains `Connections`.
  - `explainNotionError({status:403})` contains `Insert content`.
- [ ] **Step 2: Run** `node --test`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** both functions. Write `package.json` with scripts `"setup": "node src/setup.js"`, `"check": "node src/check-rollup.js"`, `"test": "node --test"`. In `.env.example`, list the three variables with one-line comments.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: scaffold and config`

### Task 2: Schema definitions

**Files:**
- Create: `src/schema.js`
- Test: `test/schema.test.js`

**Interfaces:**
- Produces: `FORMULAS`, an object of formula expression strings:
  - `thisMonth`: `if(empty(prop("Date")), false, formatDate(prop("Date"), "YYYY-MM") == formatDate(now(), "YYYY-MM"))`
  - `amountThisMonth`: `if(prop("This Month"), prop("Amount (৳)"), 0)`
  - `monthlyCost`: `if(!prop("Active"), 0, if(prop("Billing") == "Yearly", prop("Price (৳)") / 12, prop("Price (৳)")))`
  - `progress`: `if(prop("Target (৳)") > 0, min(prop("Saved (৳)") / prop("Target (৳)"), 1), 0)`
  - `budgetLeft`: `prop("Monthly Budget (৳)") - prop("Spent This Month (৳)")`
  - `leftToSpend`: `prop("Income This Month (৳)") - prop("Spent This Month (৳)")`
- Produces: `baseProperties`, an object keyed `wallet | categories | expenses | income | subscriptions | goals`. Each value is the `properties` object for database creation: the title, plain fields and own-row formulas only (no relations, no rollups). Field names and options are exactly as in spec section 5. Categories list: 🥤 Snacks & Drinks, 🚗 Rides, 📺 Subscriptions, 🍛 Food, 📚 Study, 🎁 Other (seeded as rows, not options).
- Produces: `relationProp(targetDataSourceId, dual = true)`, which returns `{ relation: { data_source_id, type: 'dual_property' | 'single_property', ... } }`.
- Produces: `rollupSum(relationName, rollupPropName)`, which returns a rollup definition with `function: 'sum'`.

- [ ] **Step 1: Write the failing tests**
  - Every number field whose name ends in `(৳)` has `number.format === 'number_with_commas'`.
  - `baseProperties.expenses` has `This Month` and `Amount This Month` formulas equal to `FORMULAS.thisMonth` and `FORMULAS.amountThisMonth`.
  - `baseProperties.income.Source.select.options` names equal `['Pocket Money','Tuition','Gift','Other']`.
  - No `baseProperties` entry contains a `relation` or `rollup` key.
  - `relationProp('ds1').relation.type === 'dual_property'`. `relationProp('ds1', false).relation.type === 'single_property'`.
  - `FORMULAS.thisMonth` contains `empty(prop("Date"))` (Review Focus 1). `FORMULAS.progress` contains `> 0` (Review Focus 2).
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `src/schema.js`.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: notion schema definitions`

### Task 3: Feasibility check against real Notion (STOP gate)

**Files:**
- Create: `src/notion.js`, `src/check-rollup.js`

**Interfaces:**
- Produces (`src/notion.js`), thin wrappers over the SDK:
  - `client(token)`
  - `createDatabase(notion, parentPageId, title, properties) -> { databaseId, dataSourceId }`
  - `addProperties(notion, dataSourceId, properties) -> response`
  - `getSyncedName(notion, childDataSourceId, relationPropName) -> string`: reads `dual_property.synced_property_name` from the child's relation property.
  - `createRow(notion, dataSourceId, properties) -> pageId`
- `check-rollup.js`:
  1. Creates a scratch page, a mini Expenses database (with `FORMULAS.thisMonth` and `amountThisMonth`) and a mini Wallet database.
  2. Adds a dual relation Expenses → Wallet, reads the synced name, and adds `rollupSum(syncedName, 'Amount This Month')` on Wallet.
  3. Inserts 2 expenses linked to the wallet (৳40 today, ৳100 dated 2 months ago).
  4. Reads the wallet row and prints the rollup value, then archives the scratch page.

- [ ] **Step 1:** Implement `src/notion.js` and `src/check-rollup.js`. Every catch prints `explainNotionError(err)`.
- [ ] **Step 2: Run** `npm run check` with a real `.env`. Expected output: `Rollup OK: 40`.
- [ ] **STOP** if the rollup is rejected or reads anything other than 40. Report the exact error and don't continue.
- [ ] **Step 3: Commit** `feat: notion client wrappers + rollup feasibility check`

### Task 4: Sample data

**Files:**
- Create: `src/seed.js`
- Test: `test/seed.test.js`

**Interfaces:**
- Produces: `buildSeed(today: Date) -> { categories: Row[], expenses: Row[], income: Row[], subscriptions: Row[], goals: Row[] }`. Rows are plain objects such as `{ name, amount, date: 'YYYY-MM-DD', category }`. `category` is a category name, which `setup.js` resolves to a page ID.
- Content (spec section 5): about 25 expenses in the current month, including Cokes ৳40, rides ৳150–350, food, printing, and 2–3 subscription charges in 📺 Subscriptions. Also 3 income rows (Pocket Money, Tuition, Gift), 3 subscriptions with Next Renewal dates within the next 14 days, and 2 goals (New headphones, Emergency fund). Each category has a Monthly Budget.

- [ ] **Step 1: Write the failing tests**
  - For `today = 2026-11-30` and for `today = 2026-11-01`: every expense and income date is in 2026-11 and is ≤ today (Review Focus 4).
  - The 🚗 Rides total is the largest category total (Review Focus 5).
  - `expenses.length >= 20`. Every amount is a positive number.
  - `income` Source values cover all of Pocket Money, Tuition and Gift.
  - Every subscription's `nextRenewal` is from today to today + 14 days.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `buildSeed`. Spread dates by clamping day offsets into `[1, today.getDate()]`.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: sample data`

### Task 5: Setup command

**Files:**
- Create: `src/setup.js`

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Order, which is fixed:
  1. `loadConfig`.
  2. Create the "💰 Money" page under the parent.
  3. `createDatabase` for all 6 using `baseProperties`.
  4. Add the dual relations from the child side: Expenses.Wallet, Income.Wallet, Subscriptions.Wallet, Expenses.Category. If `coursesDbId` is set, retrieve it to get its data source ID and add Expenses.Course as `single_property`.
  5. `getSyncedName` for each relation, then rename the synced properties to `Expenses`, `Income`, `Subscriptions` (on Wallet) and `Expenses` (on Categories) with `addProperties`.
  6. Rollups:
     - Wallet: `Spent This Month (৳)`, `Income This Month (৳)`, `Subscriptions Monthly (৳)` (from Monthly Cost).
     - Categories: `Spent This Month (৳)`.
  7. Cross-row formulas: Wallet `Left to Spend (৳)`, Categories `Budget Left (৳)`.
  8. Unless `--no-sample` is passed: create the "My Wallet" row, then the categories, then the seed rows, each with Wallet set.
  9. Print the Money page URL and the manual-steps checklist (spec section 7).

- [ ] **Step 1:** Implement `src/setup.js`. The top-level catch prints `explainNotionError(err)` and exits with code 1.
- [ ] **Step 2: Run** `npm run setup` against the real workspace. Expected: the URL is printed.
- [ ] **Step 3: Verify in Notion:**
  - My Wallet's `Left to Spend (৳)` equals the seed's income total minus its expense total.
  - The 🚗 Rides category shows the largest `Spent This Month (৳)`.
  - Goals show Progress between 0 and 1.
  - Record the actual numbers in the commit message.
- [ ] **Step 4: Run** `npm run setup` with a bad page ID. Expected: a one-line "share your page… ⋯ → Connections" message, with no stack trace.
- [ ] **Step 5: Commit** `feat: npm run setup builds the Money section`

### Task 6: README + manual Notion steps + publish

**Files:**
- Create: `README.md`, `docs/screenshots/` (added by the human after the manual steps)

- [ ] **Step 1:** Write the README with these sections:
  - **What it does / the problem:** Coke vs rides vs subscriptions, and knowing what's actually disposable.
  - **How I used Devin Chat:** list the prompts used and what Devin built. Note that the design was brainstormed with Claude.
  - **How it uses Notion Student OS:** it extends the workshop's Student OS with a Money section, using databases, relations, rollups, formulas, views, charts and buttons, plus the optional Courses link.
  - **Setup:** create an internal integration (API token, Insert content capability), share the Student OS page, copy `.env.example` to `.env`, then run `npm install` and `npm run setup`.
  - **Manual steps:** the 7 steps from spec section 7.
  - **Testing:** `npm test`.
  - **Screenshots.**
- [ ] **Step 2: Run** `npm test`. Expected: all pass. Run `git status`. Expected: `.env` is not listed.
- [ ] **Step 3: Commit** `docs: README` and push to a **public** GitHub repo.
