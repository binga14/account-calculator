// Calendar-month reports derived from the exact daily cash ledger.
// The business starts on the FIRST day of the chosen start month.
// All calendar arithmetic uses UTC to avoid DST/time-zone month shifts.
export function parseMonth(month) {
  if (typeof month !== 'string' || !/^(20\d{2}|21\d{2})-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('Choose a valid business start month and year (2000–2199).');
  }
  const [year, monthNumber] = month.split('-').map(Number);
  return { year, monthNumber };
}

export function summarizeCalendarMonths(days, startMonth) {
  const { year, monthNumber } = parseMonth(startMonth);
  const firstDayMs = Date.UTC(year, monthNumber - 1, 1);
  const oneDayMs = 86400000;
  const summaries = new Map();
  const monthFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
  for (const day of days) {
    if (!Number.isInteger(day.day) || day.day < 1) throw new Error('Invalid ledger day');
    const date = new Date(firstDayMs + (day.day - 1) * oneDayMs);
    const dateYear = date.getUTCFullYear();
    const dateMonth = date.getUTCMonth() + 1;
    const key = String(dateYear).padStart(4, '0') + '-' + String(dateMonth).padStart(2, '0');
    if (!summaries.has(key)) {
      const count = new Date(Date.UTC(dateYear, dateMonth, 0)).getUTCDate();
      summaries.set(key, {
        month: key,
        label: monthFormatter.format(date),
        daysCovered: 0,
        daysInMonth: count,
        partial: false,
        grossSales: 0,
        grossSalesSettled: 0,
        payoutsReceived: 0,
        operatingProfitEarned: 0,
        profitWithdrawn: 0,
        workingCapitalReinvested: 0,
        upfrontSpent: 0
      });
    }
    const row = summaries.get(key);
    row.daysCovered++;
    row.grossSales += day.revenue;
    row.grossSalesSettled += day.dueGross;
    row.payoutsReceived += day.payoutsReceived;
    row.operatingProfitEarned += day.netOperatingProfit;
    row.profitWithdrawn += day.withdrawn;
    row.workingCapitalReinvested += day.reinvested;
    row.upfrontSpent += day.upfrontSpent;
  }
  for (const row of summaries.values()) row.partial = row.daysCovered < row.daysInMonth;
  return [...summaries.values()];
}
