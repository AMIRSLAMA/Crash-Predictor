"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {walkForwardSequenceAudit}=require("../sequence-analysis");
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
const report=walkForwardSequenceAudit(rows.map(row=>row.multiplier));
console.log(JSON.stringify({file:path.relative(process.cwd(),file),rawRows:raw.length,validUniqueRounds:rows.length,
  firstRound:rows[0]||null,lastRound:rows.at(-1)||null,...report},null,2));
