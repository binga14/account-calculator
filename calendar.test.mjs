import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, simulate } from './model.mjs';
import { parseMonth, summarizeCalendarMonths, getWeekDateRange } from './calendar.mjs';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`Expected ${a} close to ${b}`);

test('start month is required and validated',()=>{
 assert.deepEqual(parseMonth('2026-10'),{year:2026,monthNumber:10});
 assert.throws(()=>parseMonth('2026-00'));
 assert.throws(()=>parseMonth('2026-13'));
 assert.throws(()=>parseMonth('not-a-month'));
});

test('monthly realized withdrawals aggregate ledger cash by calendar month',()=>{
 const days=simulate({...DEFAULTS,contributionsEnabled:false,horizon:16,cashCycleDays:7}).days;
 const months=summarizeCalendarMonths(days,'2026-10');
 assert.equal(months[0].month,'2026-10');
 assert.equal(months[0].daysCovered,31);
 assert.equal(months[0].partial,false);
 close(months[0].profitWithdrawn,days.slice(0,31).reduce((s,d)=>s+d.withdrawn,0));
 close(months[1].profitWithdrawn,days.slice(31,61).reduce((s,d)=>s+d.withdrawn,0));
 close(months.reduce((s,m)=>s+m.profitWithdrawn,0),days.reduce((s,d)=>s+d.withdrawn,0));
});

test('month-end sales only generate cash withdrawals in next month after payout',()=>{
 const days=simulate({...DEFAULTS,contributionsEnabled:false,horizon:8,cashCycleDays:7}).days;
 const monthly=summarizeCalendarMonths(days,'2026-10');
 const october=monthly.find(m=>m.month==='2026-10');
 const november=monthly.find(m=>m.month==='2026-11');
 const oct31=days[30];
 assert.ok(oct31.revenue>0);
 assert.equal(days[37].day,38);
 close(days[37].dueGross,oct31.revenue);
 close(november.grossSalesSettled,days.slice(31,56).reduce((s,d)=>s+d.dueGross,0));
 assert.ok(november.profitWithdrawn>0);
 assert.ok(october.profitWithdrawn>0);
});

test('leap year February has 29 days and March is properly grouped',()=>{
 const days=simulate({...DEFAULTS,contributionsEnabled:false,horizon:5,cashCycleDays:7}).days;
 const months=summarizeCalendarMonths(days,'2028-02');
 assert.equal(months[0].month,'2028-02');
 assert.equal(months[0].daysInMonth,29);
 assert.equal(months[0].daysCovered,29);
 assert.equal(months[0].partial,false);
 assert.equal(months[1].month,'2028-03');
 assert.equal(months[1].daysCovered,6);
 assert.equal(months[1].partial,true);
});

test('52-week horizon marks the final month as partial',()=>{
 const days=simulate({...DEFAULTS,contributionsEnabled:false,horizon:52}).days;
 const months=summarizeCalendarMonths(days,'2026-10');
 assert.equal(months[0].label,'October 2026');
 const last=months.at(-1);
 assert.equal(last.month,'2027-09');
 assert.equal(last.daysCovered,29);
 assert.equal(last.daysInMonth,30);
 assert.equal(last.partial,true);
});

test('zero payout in first seven days of a seven-day delay',()=>{
 const days=simulate({...DEFAULTS,contributionsEnabled:false,horizon:5,cashCycleDays:7}).days;
 const summary=summarizeCalendarMonths(days,'2026-10');
 assert.ok(days.slice(0,7).every(d=>d.withdrawn===0));
 assert.ok(summary[0].profitWithdrawn>0);
});

test('week dates start on business launch date and include 7 calendar days',()=>{
 assert.equal(getWeekDateRange('2026-10',1).label,'01.10.26 – 07.10.26');
 assert.equal(getWeekDateRange('2026-10',5).label,'29.10.26 – 04.11.26');
 assert.equal(getWeekDateRange('2026-10',36).label,'03.06.27 – 09.06.27');
 assert.equal(getWeekDateRange('2026-10',52).label,'23.09.27 – 29.09.27');
});

test('week date ranges cross leap day, month ends and year ends',()=>{
 assert.equal(getWeekDateRange('2028-02',5).label,'29.02.28 – 06.03.28');
 assert.equal(getWeekDateRange('2026-12',5).label,'29.12.26 – 04.01.27');
 assert.equal(getWeekDateRange('2027-01',1).label,'01.01.27 – 07.01.27');
});

test('week date range inputs must be valid whole forecast weeks',()=>{
 assert.throws(()=>getWeekDateRange('2026-10',0));
 assert.throws(()=>getWeekDateRange('2026-10',3.5));
 assert.throws(()=>getWeekDateRange('2026-13',1));
});
