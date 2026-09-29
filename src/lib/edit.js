import {parts,zoned} from './dates';
let n=0;export const nid=()=>'e'+Date.now().toString(36)+(n++);
const L=(ms,tz)=>{const p=parts(ms,tz);return Date.UTC(p.y,p.m-1,p.d,p.h,p.mi)};
const unL=(l,tz)=>{const d=new Date(l);return zoned(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),d.getUTCHours(),d.getUTCMinutes(),tz)};
// Build command changes [{id,before,after}] for edit (patch) or delete (patch=null). scope: this | following | all
export function editChanges(events,occ,patch,scope){
  const m=events.find(e=>e.id===occ.masterId);if(!m)return[];
  const del=patch===null;
  if(!m.rule||scope==='all'||(scope==='following'&&occ.occStart===m.start)){
    if(del)return[{id:m.id,before:m,after:null}];
    if(!m.rule)return[{id:m.id,before:m,after:{...m,...patch}}];
    const tz=m.rule.tz||'UTC',{start,end,...rest}=patch; // shift master by wall-clock delta so DST can't skew it
    const ds=L(start,tz)-L(occ.start,tz),de=L(end,tz)-L(occ.end,tz);
    return[{id:m.id,before:m,after:{...m,...rest,start:unL(L(m.start,tz)+ds,tz),end:unL(L(m.end,tz)+de,tz)}}];
  }
  const {masterId,occStart,idx,key,...base}=occ;
  if(scope==='this'){
    const out=[{id:m.id,before:m,after:{...m,exceptions:[...(m.exceptions||[]),occ.occStart]}}];
    if(!del){const ne={...base,...patch,id:nid(),rule:null,exceptions:[]};out.push({id:ne.id,before:null,after:ne})}
    return out;
  }
  const out=[{id:m.id,before:m,after:{...m,rule:{...m.rule,until:occ.occStart-1,count:undefined}}}]; // following: truncate old series
  const pr=patch?.rule,rule=pr===undefined?{...m.rule,count:m.rule.count?m.rule.count-occ.idx:undefined}:pr&&{...pr,count:pr.count&&pr.count===m.rule.count?pr.count-occ.idx:pr.count}; // edited rule wins; unchanged count = remaining count
  if(!del){const ne={...base,...patch,id:nid(),rule,exceptions:(m.exceptions||[]).filter(x=>x>occ.occStart)};out.push({id:ne.id,before:null,after:ne})}
  return out;
}
