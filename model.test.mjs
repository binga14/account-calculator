import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, simulate, project, validateSettings } from './model.mjs';

const close = (a, b, tolerance = 1e-7) => assert.ok(
  Math.abs(a-b) <= tolerance, `Expected ${a} to equal ${b}`
);
const settings = { ...DEFAULTS, horizon: 16, contributionsEnabled: false };

test('week 1 uses only spendable capital and no payout for seven-day delay', () => {
  const { weeks, days } = simulate(settings);
  close(weeks[0].upfrontSpent, 900);
  close(weeks[0].revenue, 900 / 0.73);
  close(weeks[0].endingCash, 100);
  close(weeks[0].reinvested, 0);
  close(weeks[0].withdrawn, 0);
  assert.ok(days.slice(0,7).every(d => d.payoutsReceived === 0));
  close(days[7].dueGross, days[0].revenue);
  assert.ok(days[7].payoutsReceived > 0);
  assert.ok(days[7].withdrawn > 0);
});

test('five-day delay receives and recycles first payout on day 6', () => {
  const five = simulate({ ...settings, cashCycleDays: 5 });
  const seven = simulate(settings);
  assert.ok(five.days.slice(0, 5).every(d => d.payoutsReceived === 0));
  close(five.days[5].dueGross, five.days[0].revenue);
  assert.ok(five.days[5].revenue > 0);
  assert.ok(five.weeks[0].revenue > seven.weeks[0].revenue);
  assert.ok(five.weeks[0].withdrawn > 0);
});

test('payout cash and fees settle once; bank and retained-capital identities hold', () => {
  const { weeks, days } = simulate({ ...settings, cashCycleDays: 5 });
  let cash = settings.initialCapital;
  let capital = settings.initialCapital;
  for (const d of days) {
    cash += d.injection + d.payoutsReceived - d.settledOverhead - d.withdrawn - d.upfrontSpent;
    capital += d.injection + d.reinvested;
    close(d.endingCash, cash, 1e-6);
    close(d.workingCapital, capital, 1e-6);
    assert.ok(d.endingCash >= -1e-6);
    assert.ok(d.pendingGross >= -1e-6);
    close(d.netOperatingProfit, d.revenue-d.costProduct-d.adSpend-d.tools-d.fees, 1e-6);
  }
  for (const w of weeks) {
    close(w.endingWC, w.totalContributed+w.totalReinvested, 1e-6);
    close(w.totalWithdrawn, days.filter(d=>d.week<=w.week).reduce((v,d)=>v+d.withdrawn,0), 1e-5);
  }
});

test('topups occur at the beginning of weeks 10, 20 and 30 only', () => {
  const { weeks, days } = simulate({ ...DEFAULTS, horizon: 30 });
  for (let w=1;w<=30;w++) assert.equal(weeks[w-1].injection, w%10===0?1000:0);
  close(days[63].injection, 1000); // day 64 = week 10
  close(weeks[8].totalContributed,1000);
  close(weeks[9].totalContributed,2000);
  close(weeks[29].totalContributed,4000);
});

test('low margin caps retained profit; a loss never creates profit withdrawals', () => {
  const tight = simulate({...settings, productPct:50,adPct:40,toolsPct:4,gatewayPct:3,reinvestPct:10});
  assert.ok(tight.weeks[1].withdrawn < 1e-7);
  assert.ok(tight.weeks[1].reinvested > 0);
  const negative = simulate({...settings, productPct:60,adPct:50,toolsPct:4,gatewayPct:3});
  assert.ok(negative.weeks.every(w=>w.withdrawn===0));
  assert.ok(negative.weeks[1].endingWC < negative.weeks[0].endingWC);
});

test('invalid cycles, percentages and missing upfront costs are rejected', () => {
  assert.ok(validateSettings({...settings, cashCycleDays:7.5}).length);
  assert.ok(validateSettings({...settings, cashCycleDays:0}).length);
  assert.ok(validateSettings({...settings, productPct:0,adPct:0}).length);
  assert.ok(validateSettings({...settings, bufferPct:100}).length);
  assert.throws(()=>simulate({...settings,cashCycleDays:0}), /Cash cycle/);
});

test('project wrapper returns the same week summaries as simulate', () => {
  const results = simulate(settings);
  assert.deepEqual(project(settings),results.weeks);
});

test('long payout delays do not invent settlements before due date', () => {
  const r = simulate({...settings,horizon:2,cashCycleDays:30});
  assert.ok(r.days.every(d=>d.payoutsReceived===0 && d.withdrawn===0));
  assert.ok(r.weeks[1].pendingGross>0);
});
