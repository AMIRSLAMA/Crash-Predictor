"use strict";
const fs=require("node:fs");
const path=require("node:path");
const Forecast=require("../forecast");
const file=path.join(__dirname,"..","data","crash-rounds.json");
if(!fs.existsSync(file)){console.error("Missing data/crash-rounds.json");process.exit(1);}
const raw=JSON.parse(fs.readFileSync(file,"utf8"));
if(!Array.isArray(raw))throw new Error("Expected an array in crash-rounds.json");
const byId=new Map();
for(const row of raw){
 const value=Number(row?.multiplier),id=row?.roundId;
 if(id===undefined||id===null||!Number.isFinite(value)||value<1)continue;
 byId.set(String(id),{roundId:String(id),multiplier:value,timestamp:Number(row.timestamp)||0});
}
const rows=[...byId.values()].sort((a,b)=>a.timestamp-b.timestamp||a.roundId.localeCompare(b.roundId));
const values=rows.map(x=>x.multiplier);
const sorted=[...values].sort((a,b)=>a-b);
const median=sorted.length?(sorted.length%2?sorted[(sorted.length-1)/2]:(sorted[sorted.length/2-1]+sorted[sorted.length/2])/2):0;
const buckets=[{label:"1.00-1.49",test:v=>v<1.5},{label:"1.50-1.99",test:v=>v>=1.5&&v<2},{label:"2.00-2.99",test:v=>v>=2&&v<3},{label:"3.00-4.99",test:v=>v>=3&&v<5},{label:"5.00-9.99",test:v=>v>=5&&v<10},{label:"10+",test:v=>v>=10}].map(x=>({range:x.label,count:values.filter(x.test).length}));
const report={
 file:path.relative(process.cwd(),file),rawRows:raw.length,validUniqueRounds:rows.length,
 firstRound:rows[0]||null,lastRound:rows.at(-1)||null,
 summary:{mean:values.length?values.reduce((a,b)=>a+b,0)/values.length:0,median,min:sorted[0]??null,max:sorted.at(-1)??null},
 distribution:buckets,
 historicalThresholdProbabilities:Forecast.forecastNext(values).probabilities,
 chronologicalBacktest:Forecast.backtest(values)
};
console.log(JSON.stringify(report,null,2));
