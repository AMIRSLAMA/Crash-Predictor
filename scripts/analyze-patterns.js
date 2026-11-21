"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {walkForwardSequenceAudit}=require("../sequence-analysis");
const file=process.argv[2]?path.resolve(process.cwd(),process.argv[2]):path.join(__dirname,"..","data","crash-rounds.json");
if(!fs.existsSync(file)){console.error("Missing input file: "+file);process.exit(1);}
const raw=JSON.parse(fs.readFileSync(file,"utf8"));
if(!Array.isArray(raw))throw new Error("Expected a JSON array");
const byId=new Map();
for(const row of raw){
  const value=Number(row?.multiplier??row?.finalMultiplier);
  const id=row?.roundId??row?.round_id??row?.id;
  if(id===undefined||id===null||!Number.isFinite(value)||value<1)continue;
  const rawTime=row?.timestamp??row?.lastEventTime??row?.updatedAt??row?.last_event_time;
  const numericTime=Number(rawTime);
  const timestamp=Number.isFinite(numericTime)&&numericTime>0?numericTime:(Date.parse(rawTime)||0);
  const previous=byId.get(String(id));
  const normalized={roundId:String(id),multiplier:value,timestamp};
  if(!previous||timestamp>=previous.timestamp)byId.set(String(id),normalized);
}
const rows=[...byId.values()].sort((a,b)=>{
  if(a.timestamp&&b.timestamp&&a.timestamp!==b.timestamp)return a.timestamp-b.timestamp;
  const x=Number(a.roundId),y=Number(b.roundId);
  return Number.isFinite(x)&&Number.isFinite(y)?x-y:a.roundId.localeCompare(b.roundId);
});
const report=walkForwardSequenceAudit(rows.map(row=>row.multiplier));
console.log(JSON.stringify({file:path.relative(process.cwd(),file),rawRows:raw.length,validUniqueRounds:rows.length,
  firstRound:rows[0]||null,lastRound:rows.at(-1)||null,...report},null,2));
