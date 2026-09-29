import {useSearchParams} from 'react-router-dom';
import {parseDate,validTz,todayIn,addDays,weekStart,dk,dayRange,ymd} from '../lib/dates';
const BROWSER=Intl.DateTimeFormat().resolvedOptions().timeZone;
export function useCalendar(){
  const [sp,setSp]=useSearchParams();
  const tz=validTz(sp.get('tz'))?sp.get('tz'):BROWSER; // bad values fall back safely
  const view=sp.get('view')==='month'?'month':'week';
  const date=parseDate(sp.get('date'))||todayIn(tz);
  const a=Number(sp.get('att')),att=Number.isInteger(a)&&a>0?a:null;
  const set=o=>{const n=new URLSearchParams(sp);for(const[k,v]of Object.entries(o))v==null?n.delete(k):n.set(k,v);setSp(n,{replace:true})};
  const first=view==='week'?weekStart(date):weekStart({...date,d:1});
  const days=Array.from({length:view==='week'?7:42},(_,i)=>addDays(first,i));
  const from=dayRange(days[0],tz)[0],to=dayRange(days.at(-1),tz)[1];
  const nav=n=>set({date:dk(view==='week'?addDays(date,7*n):ymd(Date.UTC(date.y,date.m-1+n,1)))});
  return{tz,view,date,att,days,from,to,set,nav,today:()=>set({date:dk(todayIn(tz))})};
}
