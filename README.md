# Binga — Commerce Forecast

A responsive, browser-only calculator for ecommerce sales, operating profit, working capital and cash withdrawals by week.

## Features
- Choose any projected week (1–104 in the UI, up to 260 in the model).
- Change product cost, ad spend, operating overhead, payment fees and reinvestment percentage.
- Set your starting capital, protected cash buffer and expected sales-to-cash cycle.
- Enable/disable recurring $ investments (e.g. $1,000 at Weeks 10, 20, 30, …).
- Compare sales trajectory with or without capital injections.
- Review the complete weekly breakdown including cumulative sales and cumulative withdrawals.
- Download a CSV; settings persist locally in your browser.
- Zero dependencies, backend, API keys, or user accounts.

## Running

Serve the directory through any static HTTP server:

```sh
python3 -m http.server 3000
```

Then open http://localhost:3000. Deploy to Vercel as a **static website** with this folder as the root directory. There is no build step or output folder to configure.

## Model

In each week, any new capital is added at the **start** of the week.

```
usable cash = starting working capital * (1 - reserve %)
weekly sales = usable cash / (product % + advertising %) * 7 / cash-cycle-days
net operating profit = weekly sales * (1 - product % - ads % - overhead % - fees %)
reinvested = min(net operating profit, sales * reinvestment %)  [when profit >= 0]
withdrawn = max(0, net operating profit - reinvested)
end working capital = max(0, starting working capital + reinvested)
```

Losses reduce working capital. Reinvestment cannot exceed operating profit, so after changing costs the model avoids treating nonexistent profit as cash. The cash buffer is **unused money**, not an allowance for monetary loss. All revenues are theoretical potential under constant demand and ad performance, not actual orders or guaranteed forecasts. Taxes, chargebacks, payment holds, ad learning, and inventory bottlenecks are not modeled.

Default assumptions reproduce the earlier discussed scenario: $1,000 starting cash, 33% COGS, 40% advertising, 4% overhead, 3% fees, 10% reinvestment, 10% buffer, 7-day cycle, $1,000 top-ups at weeks 10/20/30/40/50, 52-week horizon. Disable recurring investments to compare against the no-additional-capital scenario.