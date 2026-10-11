// Daily cash ledger for the Binga Commerce Forecast calculator.
// Gross order revenue is booked on the day of sale; working-capital cash returns
// only on the scheduled payout day, after gateway fees, overhead and withdrawals.
export const DEFAULTS = Object.freeze({
  "initialCapital": 1000,
  "productPct": 33,
  "adPct": 40,
  "toolsPct": 4,
  "gatewayPct": 3,
  "reinvestPct": 10,
  "bufferPct": 10,
  "cashCycleDays": 7,
  "horizon": 52,
  "selectedWeek": 52,
  "contributionsEnabled": true,
  "contributionAmount": 1000,
  "firstContributionWeek": 10,
  "contributionEveryWeeks": 10
});

export function validateSettings(input={}){
 const s={...DEFAULTS,...input};
 const issues=[];
 for(const key of ["initialCapital","productPct","adPct","toolsPct","gatewayPct","reinvestPct","bufferPct","cashCycleDays","horizon","contributionAmount","firstContributionWeek","contributionEveryWeeks"]){
   if(typeof s[key]!=="number"||!Number.isFinite(s[key]))issues.push("Enter valid numbers in all fields.");
 }
 if(issues.length)return [...new Set(issues)];
 if(s.initialCapital<0||s.contributionAmount<0)issues.push("Capital inputs cannot be negative.");
 for(const key of ["productPct","adPct","toolsPct","gatewayPct","reinvestPct"]){
   if(s[key]<0||s[key]>100)issues.push("Percentages must be between 0 and 100.");
 }
 if(s.bufferPct<0||s.bufferPct>=100)issues.push("Cash reserve must be from 0% to below 100%.");
 if(s.productPct+s.adPct<=0)issues.push("Product plus ad costs must be greater than zero.");
 if(s.gatewayPct+s.toolsPct>100)issues.push("Payment fees plus operating costs cannot exceed 100% of revenue.");
 if(!Number.isInteger(s.cashCycleDays)||s.cashCycleDays<1||s.cashCycleDays>365)issues.push("Cash cycle must be a whole number from 1 to 365 days.");
 if(!Number.isInteger(s.horizon)||s.horizon<1||s.horizon>260)issues.push("Weeks must be a whole number from 1 to 260.");
 if(!Number.isInteger(s.firstContributionWeek)||s.firstContributionWeek<1||!Number.isInteger(s.contributionEveryWeeks)||s.contributionEveryWeeks<1)issues.push("Investment week and interval must be positive whole numbers.");
 return [...new Set(issues)];
}

export function simulate(settings={},forceContributions){
 const s={...DEFAULTS,...settings};
 const errors=validateSettings(s);
 if(errors.length)throw new Error(errors.join(" "));
 const useContributions=forceContributions===undefined?s.contributionsEnabled:forceContributions;
 const upfrontRate=(s.productPct+s.adPct)/100;
 const gatewayRate=s.gatewayPct/100;
 const overheadRate=s.toolsPct/100;
 const marginRate=1-upfrontRate-gatewayRate-overheadRate;
 const maxDay=s.horizon*7;
 const pendingDue=new Array(maxDay+s.cashCycleDays+1).fill(0);
 let bankCash=s.initialCapital,capitalBase=s.initialCapital,pendingGross=0;
 let totalSales=0,totalWithdrawn=0,totalReinvested=0,totalContributed=s.initialCapital,totalAdSpend=0,totalPayouts=0;
 const days=[],weeks=[];
 for(let day=1;day<=maxDay;day++){
  const week=Math.ceil(day/7),firstDay=day%7===1;
  let injection=0;
  if(firstDay&&useContributions&&week>=s.firstContributionWeek&&(week-s.firstContributionWeek)%s.contributionEveryWeeks===0){
   injection=s.contributionAmount;
   bankCash+=injection;capitalBase+=injection;totalContributed+=injection;
  }
  if(firstDay){
   weeks.push({week,injection,startingWC:capitalBase,startingCash:bankCash,revenue:0,costProduct:0,adSpend:0,tools:0,fees:0,netOperatingProfit:0,reinvested:0,withdrawn:0,payoutsReceived:0,operatingCostsPaid:0,upfrontSpent:0,endingWC:capitalBase,endingCash:bankCash,pendingPayouts:pendingGross*(1-gatewayRate),pendingGross,usableCash:0,reserve:0,totalSales,totalWithdrawn,totalReinvested,totalContributed,totalAdSpend,totalPayouts,marginPct:marginRate*100});
  }
  const row=weeks[weeks.length-1];
  // A sale on Day 1 settles at the START of Day (1 + cashCycleDays).
  const dueGross=pendingDue[day]||0;
  const payoutsReceived=dueGross*(1-gatewayRate);
  const settledOverhead=dueGross*overheadRate;
  const settledMargin=dueGross*marginRate;
  const withdrawn=Math.max(0,settledMargin-Math.max(0,Math.min(settledMargin,dueGross*s.reinvestPct/100)));
  const reinvested=settledMargin-withdrawn; // losses stay in the business as negative retained profit
  bankCash+=payoutsReceived-settledOverhead-withdrawn;
  capitalBase+=reinvested;
  pendingGross=Math.max(0,pendingGross-dueGross);
  totalWithdrawn+=withdrawn;
  totalReinvested+=reinvested;
  totalPayouts+=payoutsReceived;
  // Pace the bankroll over N days. Never spend cash that is pending or protected.
  const reserve=Math.max(0,capitalBase)*s.bufferPct/100;
  const dailyBudget=Math.max(0,capitalBase)*(1-s.bufferPct/100)/s.cashCycleDays;
  const usableCash=Math.max(0,bankCash-reserve);
  const upfrontSpent=Math.min(dailyBudget,usableCash);
  const revenue=upfrontSpent/upfrontRate;
  const costProduct=revenue*s.productPct/100,adSpend=revenue*s.adPct/100;
  const tools=revenue*overheadRate,fees=revenue*gatewayRate;
  const netOperatingProfit=revenue*marginRate;
  bankCash-=upfrontSpent;
  pendingDue[day+s.cashCycleDays]+=revenue;
  pendingGross+=revenue;
  totalSales+=revenue;totalAdSpend+=adSpend;
  // Note: tools and gateway fees are paid at payout, not at the initial order.
  row.revenue+=revenue;row.costProduct+=costProduct;row.adSpend+=adSpend;
  row.tools+=tools;row.fees+=fees;row.netOperatingProfit+=netOperatingProfit;
  row.reinvested+=reinvested;row.withdrawn+=withdrawn;row.payoutsReceived+=payoutsReceived;
  row.operatingCostsPaid+=settledOverhead;row.upfrontSpent+=upfrontSpent;
  row.endingWC=capitalBase;row.endingCash=bankCash;
  row.pendingGross=pendingGross;row.pendingPayouts=pendingGross*(1-gatewayRate);
  row.usableCash=Math.max(0,bankCash-reserve);row.reserve=reserve;
  row.totalSales=totalSales;row.totalWithdrawn=totalWithdrawn;
  row.totalReinvested=totalReinvested;row.totalContributed=totalContributed;
  row.totalAdSpend=totalAdSpend;row.totalPayouts=totalPayouts;
  days.push({day,week,injection,dueGross,payoutsReceived,settledOverhead,reinvested,withdrawn,upfrontSpent,revenue,costProduct,adSpend,tools,fees,netOperatingProfit,endingCash:bankCash,pendingGross,pendingPayouts:pendingGross*(1-gatewayRate),reserve,workingCapital:capitalBase});
 }
 return {weeks,days};
}

export function project(settings={},forceContributions){return simulate(settings,forceContributions).weeks;}
