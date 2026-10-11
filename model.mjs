export const DEFAULTS = Object.freeze({
  initialCapital:1000,productPct:33,adPct:40,toolsPct:4,gatewayPct:3,
  reinvestPct:10,bufferPct:10,cashCycleDays:7,horizon:52,selectedWeek:52,
  contributionsEnabled:true,contributionAmount:1000,firstContributionWeek:10,contributionEveryWeeks:10
});
export function validateSettings(s){
  const issues=[];
  for(const k of ['initialCapital','productPct','adPct','toolsPct','gatewayPct','reinvestPct','bufferPct','cashCycleDays','horizon','contributionAmount','firstContributionWeek','contributionEveryWeeks']){
    if(!Number.isFinite(s[k]))issues.push('Enter valid numbers in all fields.');
  }
  if(s.initialCapital<0||s.contributionAmount<0)issues.push('Capital inputs cannot be negative.');
  for(const k of ['productPct','adPct','toolsPct','gatewayPct','reinvestPct'])if(s[k]<0||s[k]>100)issues.push('Percentages must be between 0 and 100.');
  if(s.bufferPct<0||s.bufferPct>=100)issues.push('Buffer must be at least 0% and below 100%.');
  if(s.productPct+s.adPct<=0)issues.push('Product plus ad costs must be greater than zero.');
  if(s.cashCycleDays<=0||s.cashCycleDays>365)issues.push('Cash cycle must be between 1 and 365 days.');
  if(!Number.isInteger(s.horizon)||s.horizon<1||s.horizon>260)issues.push('Weeks must be 1–260.');
  if(!Number.isInteger(s.firstContributionWeek)||s.firstContributionWeek<1||!Number.isInteger(s.contributionEveryWeeks)||s.contributionEveryWeeks<1)issues.push('Investment week and interval must be positive integers.');
  return [...new Set(issues)];
}
export function project(settings,forceContributions=settings.contributionsEnabled){
  const s={...DEFAULTS,...settings},errors=validateSettings(s);
  if(errors.length)throw new Error(errors.join(' '));
  let wc=s.initialCapital,totalSales=0,totalWithdrawn=0,totalReinvested=0,totalContributed=s.initialCapital,totalAdSpend=0;
  const rows=[],upfrontRate=(s.productPct+s.adPct)/100,marginPct=100-s.productPct-s.adPct-s.toolsPct-s.gatewayPct;
  for(let week=1;week<=s.horizon;week++){
    const injection=forceContributions&&week>=s.firstContributionWeek&&(week-s.firstContributionWeek)%s.contributionEveryWeeks===0?s.contributionAmount:0;
    wc+=injection;totalContributed+=injection;
    const startingWC=wc,usableCash=startingWC*(1-s.bufferPct/100);
    const revenue=usableCash/upfrontRate*(7/s.cashCycleDays);
    const costProduct=revenue*s.productPct/100,adSpend=revenue*s.adPct/100,tools=revenue*s.toolsPct/100,fees=revenue*s.gatewayPct/100;
    const netOperatingProfit=revenue-costProduct-adSpend-tools-fees;
    const reinvested=netOperatingProfit<0?netOperatingProfit:Math.min(netOperatingProfit,revenue*s.reinvestPct/100);
    const withdrawn=Math.max(0,netOperatingProfit-reinvested);
    wc=Math.max(0,startingWC+reinvested);
    totalSales+=revenue;totalWithdrawn+=withdrawn;totalReinvested+=reinvested;totalAdSpend+=adSpend;
    rows.push({week,injection,startingWC,usableCash,revenue,costProduct,adSpend,tools,fees,netOperatingProfit,reinvested,withdrawn,endingWC:wc,reserve:wc*s.bufferPct/100,totalSales,totalWithdrawn,totalReinvested,totalContributed,totalAdSpend,marginPct});
  }
  return rows;
}
