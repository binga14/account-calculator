# Binga — Commerce Forecast

A responsive static ecommerce working-capital calculator with an **actual day-by-day cash ledger** and weekly summaries. No backend, login, or external services.

## Run locally

```sh
python3 -m http.server 3000
# Browse http://localhost:3000
```

The application consists of `index.html`, `styles.css`, `app.js`, and `model.mjs`. Deploy the repository root as a static Vercel project with no build command or output directory. No runtime dependencies are needed.

Run the finance model tests with Node.js 20+:

```sh
node --test
```

## Inputs

- Starting working capital, payout delay in **whole calendar days**, and protected cash reserve.
- Product/shipping, Meta advertising, overhead/staff, and gateway costs as **percentages of gross sales**.
- Share of gross sales to **retain as working capital** when settled profit allows it. Remaining settled profit is withdrawn.
- Optional new capital, starting in a chosen week and recurring every N weeks.
- Forecast horizon and selected week. Inputs are saved in local browser storage.

## Daily cash model

The old `weeklySales = workingCapital / upfrontRate * 7 / payoutDays` shortcut has been **removed**.

The simulator runs once per day, for 7 days in each displayed week:

1. At the beginning of day 1 of any contribution week, inject the new personal capital.
2. Pay any sale payouts due on that day. A sale on Day 1 with a 7-day delay settles **at the start of Day 8**; with a 5-day delay it settles **at the start of Day 6**.
3. A payout brings back the sale revenue **minus payment gateway fees**. At the same time, subtract allocated overhead (e.g. tools and staff) and withdraw eligible profit. Only the rest is available to recycle.
4. Set a planned daily **upfront spending** budget: `max(0, contributedCapital + settledRetainedProfit) × (1 − reserve%) / payoutDays`. Spend no more than the cash *actually available in the bank above the protected reserve*. This paces initial usable capital evenly over the first cash cycle and increases the pace when profits are realized.
5. Gross order sales for that day equal `upfrontSpend / (product% + advertising%)`. The product and advertising portions are paid **today**, not again on payout.
6. Schedule the associated payout for `day + payoutDays`. Until then, it is pending and **cannot be spent**.
7. Book revenue and operating profit at the time of sale, but **reinvest or withdraw profit only on settlement**, not when the order is placed.

For each settled order, operating profit equals:

```text
gross sale − product/shipping − ads − gateway fee − overhead
```

Retained profit is the smaller of (a) positive settled operating profit and (b) `reinvestment % × sale`. Any remaining positive profit is withdrawn. If the sale made a loss, no profit is withdrawn; the loss reduces working capital.

**Working capital** on the dashboard is the *capital budget* (all owner investments plus settled retained profit/loss). **Cash in bank** is the spendable/held cash currently available. They differ because cash funding purchases is tied up waiting for payouts. The **pending payout** metric estimates incoming payment amounts after gateway fees; overhead and intended profit withdrawals still need to be deducted when those payouts settle.

### Example with default assumptions

```text
Initial capital:     $1,000
Protected reserve:     $100
Initial usable cash:   $900
Cash cycle:            7 days
Daily ad + goods spend: $900 / 7 = $128.57 (days 1–7)
Week 1 sales:          $900 / 0.73 = ~$1,233
Day 1 first payout:    Day 8, not Day 7
Profit withdrawn in Week 1: $0 (no payout has arrived)
```

With a 5-day payout delay, money from Day 1 can be reused on Day 6. This affects real cash availability, rather than applying a `7 / days` multiplier to an entire week.

## Outputs

- Selected-week sales and **actual settled profit withdrawn**.
- Cumulative booked revenue, cumulative settled cash withdrawals.
- Working capital budget, actual bank cash, unsettled payouts, and this week's payouts.
- Weekly and daily cash-ledger tables, separate downloadable CSVs, and scenario chart with/without capital injections.
- Rounded display figures; model internally uses floating-point dollars.

## Limitations

This is a **cash-flow capacity scenario, not a sales forecast**. It assumes immediate conversion at the given ROAS, proportional product/advertising spend, constant margins, and automatic daily pacing of spend. Payment holds, ad learning, demand limits, refunds, taxes, supplier invoice delays, chargebacks, currency conversion costs, and credit terms are not simulated. The 4% overhead is treated as a variable cost **paid upon settlement**; actual annual or fixed overhead needs separate modeling. A bank payout delay may differ by transaction, merchant, bank and weekends.

Source: [binga14/account-calculator](https://github.com/binga14/account-calculator).

## Calendar-month profit withdrawn

Choose a **Business start month & year** in the sidebar (the model's Day 1 is the **first day** of that calendar month). The dashboard's **View month & year** selector lets you inspect the projected actual cash withdrawn in that month. It is **not monthly recurring revenue (MRR)** and is **not** a 4-week or 4.33-week conversion.

```text
Monthly profit withdrawn = SUM(daily profit withdrawn on days falling within the selected calendar month)
```

The calendar calculation reads the existing simulated **settled daily payout ledger**, rather than recalculating profit from weekly revenue. For example, if a sale was made on October 31 and its payout delay is seven days, the resulting profit withdrawal occurs on **November 7** and is counted in November's monthly total. The report also displays sales generated in that month, net payouts received, and settled profit retained for working capital.

The month dropdown only allows months within the selected forecast horizon. If the projection ends before the end of a calendar month, the final month's figure is labelled **partial** with the number of days covered. Calendar dates use UTC internally to avoid DST/time-zone rollover errors. This affects date labels and grouping, **not the underlying payout delay or daily cash model**.

Run the included `calendar.test.mjs` with `node --test` to test month-end payout assignment, leap-year February and partial months.
