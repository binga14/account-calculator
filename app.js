import { DEFAULTS, project, validateSettings } from './model.mjs';
const $=id=>document.getElementById(id);
const INPUTS=['initialCapital','productPct','adPct','toolsPct','gatewayPct','reinvestPct','bufferPct','cashCycleDays','horizon','contributionAmount','firstContributionWeek','contributionEveryWeeks'];
let state={...DEFAULTS},currentRows=[];
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const compact=n=>new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n);
const pct=n=>n.toFixed(1)+'%';
try{const saved=JSON.parse(localStorage.getItem('binga-ecom-forecast-v1'));if(saved&&typeof saved==='object'){for(const key of INPUTS)if(Number.isFinite(saved[key]))state[key]=saved[key];if(typeof saved.contributionsEnabled==='boolean')state.contributionsEnabled=saved.contributionsEnabled;if(Number.isFinite(saved.selectedWeek))state.selectedWeek=saved.selectedWeek;}}catch{}
function sync(){for(const key of INPUTS)$(key).value=state[key];$('contributionsEnabled').checked=state.contributionsEnabled;$('selectedWeek').value=state.selectedWeek;toggleFields();}
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
 body.innerHTML=rows.map(r=>'<tr data-week="'+r.week+'" class="'+(r.week===state.selectedWeek?'selected':'')+'" tabindex="0"><td>'+r.week+'</td><td>'+(r.injection?money(r.injection):'—')+'</td><td>'+money(r.startingWC)+'</td><td>'+money(r.revenue)+'</td><td>'+money(r.adSpend)+'</td><td>'+money(r.netOperatingProfit)+'</td><td>'+money(r.reinvested)+'</td><td>'+money(r.withdrawn)+'</td><td>'+money(r.totalSales)+'</td><td>'+money(r.totalWithdrawn)+'</td></tr>').join('');
 for(const tr of body.querySelectorAll('tr')){const choose=()=>{state.selectedWeek=Number(tr.dataset.week);render();};tr.addEventListener('click',choose);tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});}
}
function render(){
 const margin=100-state.productPct-state.adPct-state.toolsPct-state.gatewayPct;
 $('roasDisplay').textContent=state.adPct>0?(100/state.adPct).toFixed(2)+'×':'—';$('marginDisplay').textContent=pct(margin);$('withdrawPctDisplay').textContent=pct(Math.max(0,margin-state.reinvestPct));
 $('alert').textContent=validateSettings(state).join(' ');$('alert').hidden=!$('alert').textContent;
 $('downloadBtn').disabled=!$('alert').hidden;
 if(!$('alert').hidden)return;
 state.selectedWeek=Math.max(1,Math.min(state.horizon,Math.round(state.selectedWeek)));
 $('selectedWeek').max=state.horizon;$('selectedWeek').value=state.selectedWeek;$('chartEndWeek').textContent='WEEK '+state.horizon;
 currentRows=project(state);const base=project({...state,contributionsEnabled:false},false);
 const r=currentRows[state.selectedWeek-1],one=currentRows[0].revenue;
 for(const [id,val] of Object.entries({weeklySales:r.revenue,weeklyWithdrawn:r.withdrawn,cumulativeSales:r.totalSales,cumulativeWithdrawn:r.totalWithdrawn,startingWC:r.startingWC,endingWC:r.endingWC,totalInvested:r.totalContributed,weeklyAds:r.adSpend}))$(id).textContent=money(val);
 $('heroWeekLabel').textContent='· WEEK '+r.week;$('salesMultiple').textContent='↑ '+(one>0?r.revenue/one:0).toFixed(2)+'× Week 1 sales';
 chart(currentRows,base);table(currentRows);try{localStorage.setItem('binga-ecom-forecast-v1',JSON.stringify(state));}catch{}
}
function exportCSV(){
 const columns=[['Week','week'],['New capital injected','injection'],['Starting working capital','startingWC'],['Usable cash','usableCash'],['Weekly sales','revenue'],['Product and shipping','costProduct'],['Ad spend','adSpend'],['Tools and staffing','tools'],['Gateway fees','fees'],['Operating profit','netOperatingProfit'],['Reinvested','reinvested'],['Profit withdrawn','withdrawn'],['Ending working capital','endingWC'],['Cumulative sales','totalSales'],['Cumulative profit withdrawn','totalWithdrawn'],['Total capital injected','totalContributed']];
 const csv=[columns.map(x=>'"'+x[0]+'"').join(','),...currentRows.map(r=>columns.map(([,key])=>Number(r[key]).toFixed(key==='week'?0:2)).join(','))].join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='binga-forecast-'+state.horizon+'-weeks.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
sync();render();
for(const key of INPUTS)$(key).addEventListener('change',e=>{const value=Number(e.target.value);if(Number.isFinite(value)){state[key]=value;if(key==='horizon')state.selectedWeek=Math.min(state.horizon,state.selectedWeek);render();}});
$('contributionsEnabled').addEventListener('change',e=>{state.contributionsEnabled=e.target.checked;toggleFields();render();});
$('selectedWeek').addEventListener('change',e=>{if(Number.isFinite(Number(e.target.value)))state.selectedWeek=Number(e.target.value);render();});
$('prevWeek').addEventListener('click',()=>{state.selectedWeek=Math.max(1,state.selectedWeek-1);render();});
$('nextWeek').addEventListener('click',()=>{state.selectedWeek=Math.min(state.horizon,state.selectedWeek+1);render();});
$('resetBtn').addEventListener('click',()=>{state={...DEFAULTS};sync();render();});
$('downloadBtn').addEventListener('click',exportCSV);
