import {parts,zoned,ymd} from './dates';
const dim=(y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate();
// Expand ONE stored event into occurrences intersecting [from,to). Only the visible range is materialised.
// Occurrences keep the master's wall-clock time in rule.tz, so DST never moves "9:00".
export function expand(ev,from,to){
  const dur=ev.end-ev.start;
  const occ=(start,idx)=>({...ev,start,end:start+dur,key:ev.id+'@'+start,masterId:ev.id,occStart:start,idx});
  if(!ev.rule)return ev.start<to&&ev.end>from?[occ(ev.start,0)]:[];
  const {freq,interval=1,until,count,tz='UTC',nth}=ev.rule,p=parts(ev.start,tz),ex=ev.exceptions||[],out=[];
  for(let i=0;i<10000&&!(count&&i>=count);i++){
    let y=p.y,m=p.m,d=p.d;
    if(freq==='daily')({y,m,d}=ymd(Date.UTC(p.y,p.m-1,p.d+i*interval)));
    else if(freq==='weekly')({y,m,d}=ymd(Date.UTC(p.y,p.m-1,p.d+7*i*interval)));
    else{
      ({y,m}=ymd(Date.UTC(p.y,p.m-1+i*interval,1)));
      if(nth){const first=new Date(Date.UTC(y,m-1,1)).getUTCDay();d=1+((p.dow-first+7)%7)+7*(Math.ceil(p.d/7)-1);if(d>dim(y,m))d-=7} // 5th -> last
      else d=Math.min(p.d,dim(y,m)); // 31st clamps to month end
    }
    const start=zoned(y,m,d,p.h,p.mi,tz);
    if((until&&start>until)||start>=to)break;
    if(start+dur>from&&!ex.includes(start))out.push(occ(start,i));
  }
  return out;
}
