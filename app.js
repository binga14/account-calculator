import { DEFAULTS, simulate, validateSettings } from './model.mjs';
import { parseMonth, summarizeCalendarMonths } from './calendar.mjs';
const $=id=>document.getElementById(id);
const INPUTS=['initialCapital','productPct','adPct','toolsPct','gatewayPct','reinvestPct','bufferPct','cashCycleDays','horizon','contributionAmount','firstContributionWeek','contributionEveryWeeks'];
const today=new Date();
const defaultStartMonth=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0');
let state={...DEFAULTS,startMonth:defaultStartMonth,viewMonth:defaultStartMonth},currentRows=[],currentDaily=[];
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const compact=n=>new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n);
const pct=n=>n.toFixed(1)+'%';
try{const saved=JSON.parse(localStorage.getItem('binga-ecom-forecast-v1'));if(saved&&typeof saved==='object'){for(const key of INPUTS)if(Number.isFinite(saved[key]))state[key]=saved[key];if(typeof saved.contributionsEnabled==='boolean')state.contributionsEnabled=saved.contributionsEnabled;if(Number.isFinite(saved.selectedWeek))state.selectedWeek=saved.selectedWeek;if(typeof saved.startMonth==='string'){try{parseMonth(saved.startMonth);state.startMonth=saved.startMonth;}catch{}}if(typeof saved.viewMonth==='string'){try{parseMonth(saved.viewMonth);state.viewMonth=saved.viewMonth;}catch{}}}}catch{}
function sync(){for(const key of INPUTS)$(key).value=state[key];$('startMonth').value=state.startMonth;$('contributionsEnabled').checked=state.contributionsEnabled;$('selectedWeek').value=state.selectedWeek;toggleFields();}
function toggleFields(){$('contributionFields').style.opacity=state.contributionsEnabled?'1':'.45';$('contributionFields').querySelectorAll('input').forEach(e=>e.disabled=!state.contributionsEnabled);}
function chart(rows,base){
 const root=$('chart'),W=1000,H=260,L=76,R=14,T=18,B=18,PW=W-L-R,PH=H-T-B;
 const max=Math.max(1,...rows.map(r=>r.revenue),...base.map(r=>r.revenue));
 const peak=Math.ceil(max/(10**Math.floor(Math.log10(max)))*2)/2*10**Math.floor(Math.log10(max));
 const x=i=>L+i*PW/Math.max(1,rows.length-1),y=v=>T+PH-v/peak*PH;
 const line=a=>a.map((r,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(r.revenue).toFixed(1)).join(' ');
 const grid=Array.from({length:5},(_,i)=>{const v=peak*i/4,p=y(v);return '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+p+'" y2="'+p+'" stroke="#dbe7e6" stroke-dasharray="5 5"/><text x="'+(L-12)+'" y="'+(p+4)+'" text-anchor="end" font-size="13" fill="#87989c">$'+compact(v)+'</text>';}).join('');
 const i=state.selectedWeek-1,px=x(i),py=y(rows[i].revenue);
 root.innerHTML='<svg viewBox="0 0 1000 260" preserveAspectRatio="none" role="img" aria-label="Projected weekly sales chart">'+grid+'<path d="'+line(base)+'" fill="none" stroke="#b4c3c5" stroke-width="3" stroke-dasharray="7 6" vector-effect="non-scaling-stroke"/><path d="'+line(rows)+'" fill="none" stroke="#0f9f87" stroke-width="4" vector-effect="non-scaling-stroke"/><line x1="'+px+'" x2="'+px+'" y1="'+T+'" y2="'+(T+PH)+'" stroke="#149c85" stroke-dasharray="4 5"/><circle cx="'+px+'" cy="'+py+'" r="7" fill="#0b997f" stroke="#fff" stroke-width="3"/><title>Week '+state.selectedWeek+': '+money(rows[i].revenue)+'</title></svg>';
}

function table(rows){
 const body=$('resultsBody');
 body.innerHTML=rows.map(r=>'<tr data-week="'+r.week+'" class="'+(r.week===state.selectedWeek?'selected':'')+'" tabindex="0"><td>'+r.week+'</td><td>'+(r.injection?money(r.injection):'—')+'</td><td>'+money(r.startingWC)+'</td><td>'+money(r.revenue)+'</td><td>'+money(r.adSpend)+'</td><td>'+money(r.netOperatingProfit)+'</td><td>'+money(r.payoutsReceived)+'</td><td>'+money(r.reinvested)+'</td><td>'+money(r.withdrawn)+'</td><td>'+money(r.endingCash)+'</td><td>'+money(r.pendingPayouts)+'</td><td>'+money(r.totalSales)+'</td><td>'+money(r.totalWithdrawn)+'</td></tr>').join('');
 for(const tr of body.querySelectorAll('tr')){
  const choose=()=>{state.selectedWeek=Number(tr.dataset.week);render();};
  tr.addEventListener('click',choose);
  tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});
 }
}
function dailyTable(days){
 const selected=days.filter(d=>d.week===state.selectedWeek);
 $('dailyBody').innerHTML=selected.map(d=>'<tr><td>'+d.day+'</td><td>'+money(d.upfrontSpent)+'</td><td>'+money(d.revenue)+'</td><td>'+money(d.payoutsReceived)+'</td><td>'+money(d.settledOverhead)+'</td><td>'+money(d.withdrawn)+'</td><td>'+money(d.endingCash)+'</td><td>'+money(d.pendingPayouts)+'</td></tr>').join('');
}
function render(){
 const margin=100-state.productPct-state.adPct-state.toolsPct-state.gatewayPct;
 $('roasDisplay').textContent=state.adPct>0?(100/state.adPct).toFixed(2)+'×':'—';
 $('marginDisplay').textContent=pct(margin);
 $('profitPctDisplay').textContent=pct(Math.max(0,margin-state.reinvestPct));
 const validation=validateSettings(state);
 $('alert').textContent=validation.join(' ');
 $('alert').hidden=validation.length===0;
 $('downloadBtn').disabled=validation.length>0;
 $('downloadDailyBtn').disabled=validation.length>0;
 if(validation.length)return;
 state.selectedWeek=Math.max(1,Math.min(state.horizon,Math.round(state.selectedWeek)));
 $('selectedWeek').max=state.horizon;
 $('selectedWeek').value=state.selectedWeek;
 $('chartEndWeek').textContent='WEEK '+state.horizon;
 const result=simulate(state);
 currentRows=result.weeks;currentDaily=result.days;
 const months=summarizeCalendarMonths(currentDaily,state.startMonth);
 if(!months.some(m=>m.month===state.viewMonth)){
   state.viewMonth=state.viewMonth<months[0].month?months[0].month:months[months.length-1].month;
 }
 $('viewMonth').innerHTML=months.map(m=>'<option value="'+m.month+'">'+m.label+(m.partial?' · partial':'')+'</option>').join('');
 $('viewMonth').value=state.viewMonth;
 const selectedMonth=months.find(m=>m.month===state.viewMonth);
 $('monthlyWithdrawn').textContent=money(selectedMonth.profitWithdrawn);
 $('monthlySales').textContent=money(selectedMonth.grossSales);
 $('monthlyPayouts').textContent=money(selectedMonth.payoutsReceived);
 $('monthlyReinvested').textContent=money(selectedMonth.workingCapitalReinvested);
 $('monthlyCoverage').textContent=selectedMonth.label+' · '+selectedMonth.daysCovered+'/'+selectedMonth.daysInMonth+' calendar days';
 $('monthlyPartialNotice').hidden=!selectedMonth.partial;
 const baseline=simulate({...state,contributionsEnabled:false},false).weeks;
 const r=currentRows[state.selectedWeek-1],one=currentRows[0].revenue;
 for(const [id,val] of Object.entries({
   weeklySales:r.revenue,
   weeklyWithdrawn:r.withdrawn,
   cumulativeSales:r.totalSales,
   cumulativeWithdrawn:r.totalWithdrawn,
   startingWC:r.startingWC,
   endingWC:r.endingWC,
   endingCash:r.endingCash,
   pendingPayouts:r.pendingPayouts,
   payoutsReceived:r.payoutsReceived,
   upfrontSpent:r.upfrontSpent,
   totalInvested:r.totalContributed,
   weeklyAds:r.adSpend
 }))$(id).textContent=money(val);
 $('heroWeekLabel').textContent='· WEEK '+r.week;
 $('salesMultiple').textContent='↑ '+(one>0?r.revenue/one:0).toFixed(2)+'× Week 1 sales';
 chart(currentRows,baseline);table(currentRows);dailyTable(currentDaily);
 try{localStorage.setItem('binga-ecom-forecast-v1',JSON.stringify(state));}catch{}
}
function exportCSV(type){
 const isDaily=type==='daily';
 const columns=isDaily?[
  ['Day','day'],['Week','week'],['Injected capital','injection'],
  ['Upfront spending','upfrontSpent'],['Booked sales','revenue'],
  ['Ad spend','adSpend'],['Product and shipping','costProduct'],
  ['Payouts received after gateway fees','payoutsReceived'],['Operating overhead paid','settledOverhead'],
  ['Profit withdrawn','withdrawn'],['Settled profit retained','reinvested'],
  ['Closing bank cash','endingCash'],['Unsettled gross sales','pendingGross'],
  ['Pending payouts net of gateway fees','pendingPayouts'],['Cash reserve','reserve'],
  ['Working capital bankroll','workingCapital']
 ]:[
  ['Week','week'],['New capital injected','injection'],
  ['Starting working capital','startingWC'],['Starting bank cash','startingCash'],
  ['Weekly booked sales','revenue'],['Product and shipping costs','costProduct'],
  ['Ad spend','adSpend'],['Operating overhead accrued','tools'],
  ['Gateway fees accrued','fees'],['Operating profit accrued','netOperatingProfit'],
  ['Upfront cash spent','upfrontSpent'],['Payouts received net of gateway fees','payoutsReceived'],
  ['Operating overhead paid','operatingCostsPaid'],['Working capital retained from payouts','reinvested'],
  ['Profit withdrawn from payouts','withdrawn'],['Ending working capital','endingWC'],
  ['Ending bank cash','endingCash'],['Pending payouts','pendingPayouts'],
  ['Cumulative sales','totalSales'],['Cumulative profit withdrawn','totalWithdrawn'],
  ['Total capital injected','totalContributed']
 ];
 const rows=isDaily?currentDaily:currentRows;
 const csv=[columns.map(c=>'"'+c[0]+'"').join(','),...rows.map(r=>columns.map(([,key])=>Number(r[key]).toFixed(key==='day'||key==='week'?0:2)).join(','))].join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');
 a.href=url;a.download='binga-'+(isDaily?'daily-ledger':'weekly-forecast')+'-'+state.horizon+'-weeks.csv';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
sync();render();
for(const key of INPUTS)$(key).addEventListener('change',e=>{
 const raw=e.target.value;
 const value=raw.trim()===''?NaN:Number(raw);
 state[key]=value;
 if(key==='horizon'&&Number.isFinite(value))state.selectedWeek=Math.min(value,state.selectedWeek);
 render();
});
$('startMonth').addEventListener('change',e=>{
  try{
    parseMonth(e.target.value);
    state.startMonth=e.target.value;
    state.viewMonth=state.startMonth;
    render();
  }catch{
    e.target.value=state.startMonth;
  }
});
$('viewMonth').addEventListener('change',e=>{
  state.viewMonth=e.target.value;
  render();
});
$('contributionsEnabled').addEventListener('change',e=>{state.contributionsEnabled=e.target.checked;toggleFields();render();});
$('selectedWeek').addEventListener('change',e=>{if(Number.isFinite(Number(e.target.value)))state.selectedWeek=Number(e.target.value);render();});
$('prevWeek').addEventListener('click',()=>{state.selectedWeek=Math.max(1,state.selectedWeek-1);render();});
$('nextWeek').addEventListener('click',()=>{state.selectedWeek=Math.min(state.horizon,state.selectedWeek+1);render();});
$('resetBtn').addEventListener('click',()=>{state={...DEFAULTS,startMonth:defaultStartMonth,viewMonth:defaultStartMonth};sync();render();});
$('downloadBtn').addEventListener('click',()=>exportCSV('weekly'));
$('downloadDailyBtn').addEventListener('click',()=>exportCSV('daily'));
// Recalculate the read-only profit percentage while cost assumptions are being edited.
for(const key of ['productPct','adPct','toolsPct','gatewayPct','reinvestPct']){
 $(key).addEventListener('input',e=>{
  state[key]=e.target.value.trim()===''?NaN:Number(e.target.value);
  render();
 });
}
