// Plain Date + Intl only. "Local" = wall-clock in the chosen IANA zone.
const cache={};const F=tz=>cache[tz]||=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',weekday:'short'});
const WD={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
export const TZS=['UTC','Asia/Kolkata','Europe/London','America/New_York','America/Los_Angeles','Asia/Tokyo','Australia/Sydney'];
export const validTz=tz=>{try{F(tz);return !!tz}catch{return false}};
export function parts(ms,tz){const o={};for(const p of F(tz).formatToParts(ms))o[p.type]=p.value;return{y:+o.year,m:+o.month,d:+o.day,h:+o.hour,mi:+o.minute,dow:WD[o.weekday]}}
// wall-clock in tz -> UTC ms. Two correction passes make it DST-safe.
export function zoned(y,m,d,h,mi,tz){const g=Date.UTC(y,m-1,d,h,mi);let t=g;for(let i=0;i<2;i++){const p=parts(t,tz);t-=Date.UTC(p.y,p.m-1,p.d,p.h,p.mi)-g}return t}
const pad=n=>String(n).padStart(2,'0');
export const key=(y,m,d)=>`${y}-${pad(m)}-${pad(d)}`;export const dk=o=>key(o.y,o.m,o.d);
export function parseDate(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');if(!m)return null;const x=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return x.getUTCMonth()===+m[2]-1?{y:+m[1],m:+m[2],d:+m[3]}:null}
export const ymd=t=>{const x=new Date(t);return{y:x.getUTCFullYear(),m:x.getUTCMonth()+1,d:x.getUTCDate()}};
export const addDays=(o,n)=>ymd(Date.UTC(o.y,o.m-1,o.d+n));
export const dowOf=o=>new Date(Date.UTC(o.y,o.m-1,o.d)).getUTCDay();
export const weekStart=o=>addDays(o,-dowOf(o));
export const todayIn=tz=>{const p=parts(Date.now(),tz);return{y:p.y,m:p.m,d:p.d}};
export const dayRange=(o,tz)=>{const n=addDays(o,1);return[zoned(o.y,o.m,o.d,0,0,tz),zoned(n.y,n.m,n.d,0,0,tz)]};
export const shift=(ms,days,mins,tz)=>{const p=parts(ms,tz),x=new Date(Date.UTC(p.y,p.m-1,p.d+days,p.h,p.mi+mins));return zoned(x.getUTCFullYear(),x.getUTCMonth()+1,x.getUTCDate(),x.getUTCHours(),x.getUTCMinutes(),tz)};
export const fmtTime=(ms,tz)=>new Intl.DateTimeFormat([],{timeZone:tz,hour:'numeric',minute:'2-digit'}).format(ms);
export const toInput=(ms,tz)=>{const p=parts(ms,tz);return `${key(p.y,p.m,p.d)}T${pad(p.h)}:${pad(p.mi)}`};
export const fromInput=(s,tz)=>{const m=/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(s||'');return m?zoned(+m[1],+m[2],+m[3],+m[4],+m[5],tz):NaN};
