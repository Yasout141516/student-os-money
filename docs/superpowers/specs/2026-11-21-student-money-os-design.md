# Student OS: Money — Design

Date: 2026-11-21 · Hackathon: "Build a Smarter Student OS Using Devin" · Deadline 6:00 PM · Build budget ≈ 1.5 h

## 1. Intent

A student (pocket money + tutoring income + occasional cash gifts) doesn't know what is eating their money: the occasional Coca-Cola, ride-share fares, or subscriptions. Without that, they can't tell how much is actually disposable.

**Student OS: Money** adds a Money section to the Notion Student OS that answers two questions at a glance:

1. **Where is my money going?** Spending by category this month, ranked.
2. **How much do I have left to spend this month?** Income − expenses − subscriptions.

It also has savings goals and subscription-renewal reminders.

It extends the Student OS from the Notion Campus Leaders workshop (Courses, Assignments, Notes, Tasks, Views, Relations, a dashboard page) using the same building blocks, plus formulas, rollups, charts and buttons.

## 2. Goals / non-goals / anti-goals

**Goals**
- A runnable setup script (`npm run setup`) that creates the whole Money section in any Notion workspace, with sample data, so judges can reproduce it.
- A Notion dashboard showing: Left to spend, a spending-by-category chart, upcoming renewals, and goal progress bars.
- Logging a common expense takes ≤ 5 seconds (Notion buttons).
- README that covers the four hackathon questions.

**Non-goals**
- Bank, bKash or card syncing; receipt scanning; multi-currency (BDT ৳ only); user accounts; a mobile app; a custom web dashboard.

**Anti-goals** (failure even if it runs)
- Logging is slow enough that the user stops doing it.
- The "Left to spend" number is wrong or confusing, for example by counting last month's spending.
- The demo depends on something fragile at 5:55 PM, such as a hosted server.

## 3. Constraints

- About 1.5 h of build time. Built with **Devin** (free plan, limited working time), so the spec must be precise.
- Notion free personal plan must be enough. The free Education Plus plan is a bonus.
- **The Notion API cannot create** chart views, buttons, database automations or per-date reminders. Those are made by hand and documented step-by-step in the README.
- **Notion API version:** recent API versions split databases into "data sources". Use the current `@notionhq/client` and follow its current docs for creating databases and properties; don't copy outdated snippets.
- Public GitHub repo; never commit `.env`.

## 4. Approaches considered

| | Approach | Trade-off |
|---|---|---|
| A | Notion-only: Devin builds everything directly in Notion | Fastest, but the repo has nothing to run, which is weak for judging |
| **B (chosen)** | **Setup script creates the Money section in Notion, plus a few manual UI steps** | Reproducible, shows off Notion features, fits 1.5 h. Some steps are manual. |
| C | Custom web dashboard reading from Notion | Most impressive-looking, riskiest in 1.5 h, and duplicates Notion's free charts |

Chosen by the user: **B**.

## 5. Data model (Notion)

All amounts are Number properties with format `number_with_commas`, with "(৳)" in the property name. The Notion API has no BDT format.

**Relations rule (critical):** every Wallet and Category link is ONE two-way (`dual_property`) relation, created from the child side (Expenses/Income/Subscriptions → Wallet, Expenses → Categories). Never create two separate one-way relations. If you do, the Wallet side stays empty and every total reads 0. The property Notion auto-creates on the other side is returned as `dual_property.synced_property_name`. The script reads that name back and uses it as the rollup's `relation_property_name`.

**Subscriptions are counted once (Claude's call):** when a subscription is actually charged, it is logged as an Expense in the 📺 Subscriptions category. That way the chart can compare Cokes vs rides vs subscriptions, which is the user's core question. The Subscriptions database is for **tracking renewals and reminders** and is **not** subtracted in Left to Spend.

**Key trick, the "Wallet" hub:** Notion formulas can't add up across databases. Instead, a one-row **Wallet** database (row: "My Wallet") is related to every Expense, Income and Subscription. Rollups on that one row produce the month's totals, and a formula computes Left to spend.

### Wallet (1 row: "My Wallet")
- Name (title)
- Expenses (relation → Expenses), Income (relation → Income), Subscriptions (relation → Subscriptions)
- Spent This Month = rollup sum of Expenses."Amount This Month"
- Income This Month = rollup sum of Income."Amount This Month"
- Subscriptions Monthly = rollup sum of Subscriptions."Monthly Cost" (info only: "committed per month")
- **Left to Spend** = formula: Income This Month − Spent This Month

### Categories
- Name (title), e.g. 🥤 Snacks & Drinks, 🚗 Rides, 📺 Subscriptions, 🍛 Food, 📚 Study, 🎁 Other
- Monthly Budget (number)
- Expenses (relation ↔ Expenses.Category)
- Spent This Month = rollup sum of Expenses."Amount This Month"
- Budget Left = formula: Monthly Budget − Spent This Month

### Expenses
- Name (title), e.g. "Coke"
- Amount (number)
- Date (date)
- Category (relation → Categories)
- Wallet (relation → Wallet)
- Paid With (select: Cash, bKash, Card)
- Course (relation → Courses, optional). Ties spending into the core Student OS, for example printing or a textbook for CSE220. Only created if a Courses database ID is provided. Make it a **one-way** (`single_property`) relation so the user's existing Courses database isn't changed. First retrieve the database to get its data source ID.
- This Month = formula: `formatDate(prop("Date"), "YYYY-MM") == formatDate(now(), "YYYY-MM")`
- Amount This Month = formula: `if(prop("This Month"), prop("Amount"), 0)`

### Income
- Name (title), Amount, Date, Wallet (relation)
- Source (select: Pocket Money, Tuition, Gift, Other)
- This Month / Amount This Month, the same formulas as Expenses

### Subscriptions
- Name (title), Price (number), Billing (select: Monthly, Yearly)
- Next Renewal (date). This is where reminders are attached.
- Active (checkbox), Wallet (relation)
- Monthly Cost = formula: `if(!prop("Active"), 0, if(prop("Billing") == "Yearly", prop("Price") / 12, prop("Price")))`

### Goals
- Name (title), e.g. "New headphones", "Emergency fund"
- Target (number), Saved (number, updated by hand), Deadline (date)
- Progress = formula: `if(prop("Target") > 0, min(prop("Saved") / prop("Target"), 1), 0)`. Bar display is set **by hand** (see section 7), because the API can't set it.

### Sample data (seeded by the script)
About 25 expenses spread over the current month, realistic for a Dhaka student: Cokes ৳40, rides ৳150–350, food, a printing cost. Also 3 income entries (one per source), 3 subscriptions (e.g. Spotify, YouTube Premium, ChatGPT, with renewal dates in the next 2 weeks) and 2 goals. The point is that the chart shows a clear "rides are eating your money" insight on first open.

## 6. The setup script

- Node.js + `@notionhq/client` + `dotenv`. No framework.
- `.env`: `NOTION_TOKEN`, `NOTION_PARENT_PAGE_ID` (the Student OS dashboard page, shared with the integration), and optional `NOTION_COURSES_DB_ID`.
- `npm run setup`:
  1. Creates a "💰 Money" page under the parent page.
  2. Creates the 6 databases in this exact order:
     1. Create each database with plain properties and its own-row formulas (This Month, Amount This Month, Monthly Cost, Progress). Save each `data_sources[0].id`.
     2. PATCH `/v1/data_sources/{id}` to add the two-way relations.
     3. Read back the synced property names.
     4. Add the rollups.
     5. Add the Left to Spend and Budget Left formulas.
  3. Seeds sample data (flag `--no-sample` to skip). Every Expense, Income and Subscription row **must** have Wallet set.
- Use `@notionhq/client` v5+ with a Notion-Version of `2025-09-03` or later. Relations take a `data_source_id`, not a database ID.
- **Check first (2 min):** before building everything, create one rollup that sums the formula "Amount This Month" and confirm Notion accepts it. Formulas used in rollups must always return a number, never empty. If Notion refuses it, stop and report rather than inventing a workaround.
- Formula fallback: if `formatDate(prop("Date"), "YYYY-MM")` fails, compare `year()` and `month()` instead.
  4. Prints the Money page URL and a checklist of the manual steps.
- Each run creates a fresh Money page. Idempotency is not needed.
- On a missing env var, an unshared page, or a 403 error, it prints a plain-English fix: "Share your Student OS page with the integration: ⋯ → Connections", and "Make sure the integration has Insert content capability".

## 7. Manual Notion steps (README, about 10 min)

1. **Dashboard layout** on the Money page: a callout with a linked view of Wallet showing Left to Spend, then columns holding a chart and Upcoming Renewals.
2. **Chart:** Expenses → new Chart view (bar or donut), grouped by Category, sum of Amount, filtered This Month = true.
3. **Quick-add buttons:** "🥤 Coke ৳40" (adds an Expense with Amount 40, Category Snacks, Date today, Wallet set) and "🚗 Ride" (adds a Ride expense and opens it to type the fare).
4. **Default template** on Expenses and Income with Wallet = My Wallet and Date = today, so normal "New" entries are counted.
5. **Reminders:** on each subscription's Next Renewal, add a reminder for 1 day before. On Education Plus, optionally add an automation instead.
6. **Views:** Subscriptions as a calendar view, Goals as a gallery.
7. **Progress bars:** on Goals → Progress, set the formula display to "Bar", and do the same on Wallet's Left to Spend if wanted.

## 8. Repo & README

```
README.md          problem, how Devin was used, Notion Student OS tie-in, setup steps, manual steps, screenshots
package.json       "setup" script
.env.example
src/setup.js       creates the databases and seed data
src/schema.js      property definitions (one place to edit)
src/seed.js        sample data
docs/screenshots/
```

README sections required by the hackathon: **What it does / problem**, **How I used Devin Chat** (the Devin session prompts and what Devin built; note that design brainstorming was done with Claude), **How it uses Notion Student OS**, **Run / test it**.

## 9. Build order (fits 1.5 h)

1. Script: create the databases with relations, rollups and formulas, then verify in Notion (≈ 40 min)
2. Seed data (≈ 10 min)
3. Manual dashboard, chart and buttons (≈ 15 min)
4. README + screenshots, push the public repo (≈ 15 min)
5. Buffer (≈ 10 min)

**Cut first if late:** the Course relation, the Paid With property, goals seed data.
**Stretch only if done early:** a tiny quick-add web page.

## 10. Left to the builder

- Exact Notion API calls and the order needed to make rollups reference formula properties.
- Emoji and colour choices, and the exact sample entries.
- Error message wording.
