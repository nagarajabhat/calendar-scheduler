import {useEffect,useMemo,useRef,useState} from 'react';import {Link} from 'react-router-dom';
import {userService} from '../services/userService';import {expand} from '../lib/recurrence';import {toInput,fromInput,parseDate,zoned,addDays} from '../lib/dates';

export function Modal({title,onClose,children}){
  const ref=useRef(null);
  useEffect(()=>{const prev=document.activeElement,el=ref.current,f=()=>[...el.querySelectorAll('button,input,select,a[href],[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled);
    f()[0]?.focus();
    const kd=e=>{if(e.key==='Escape'){e.stopPropagation();onClose()}
      if(e.key==='Tab'){const l=f(),a=l[0],z=l.at(-1);if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}}; // focus trap
    el.addEventListener('keydown',kd);return()=>{el.removeEventListener('keydown',kd);prev?.focus?.()}},[onClose]);
  return <div className="fixed inset-0 bg-black/40 grid place-items-center z-50"><div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-lg p-5 w-[28rem] max-h-[90vh] overflow-auto space-y-3"><h2 className="text-lg font-semibold">{title}</h2>{children}</div></div>;
}
export function ScopeDialog({label,onPick,onClose}){
  return <Modal title={label+' recurring event'} onClose={onClose}>{[['this','This event'],['following','This and following events'],['all','All events']].map(([k,t])=>
    <button key={k} onClick={()=>onPick(k)} className="block w-full text-left border rounded px-3 py-2 hover:bg-slate-50">{t}</button>)}
    <button onClick={onClose} className="text-sm text-slate-600">Cancel</button></Modal>;
}
export function AttendeePicker({value,onChange,single}){
  const [q,setQ]=useState(''),[res,setRes]=useState([]),[names,setNames]=useState({});
  useEffect(()=>{const t=setTimeout(async()=>{try{const u=q?await userService.search(q):await userService.list();setRes(u);setNames(n=>({...n,...Object.fromEntries(u.map(x=>[x.id,x.firstName+' '+x.lastName]))}))}catch{}},300);return()=>clearTimeout(t)},[q]); // debounce
  useEffect(()=>{value.filter(id=>!names[id]).forEach(id=>userService.get(id).then(u=>setNames(n=>({...n,[id]:u.firstName+' '+u.lastName})),()=>{}))},[value]);// eslint-disable-line
  const toggle=id=>onChange(value.includes(id)?value.filter(x=>x!==id):single?[id]:[...value,id]);
  return <div><div className="flex flex-wrap gap-1 mb-1">{value.map(id=><button type="button" key={id} onClick={()=>toggle(id)} className="text-xs bg-blue-100 rounded px-2 py-0.5" aria-label={'Remove '+(names[id]||id)}>{names[id]||'User '+id} ×</button>)}</div>
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search people…" aria-label="Search attendees" className="w-full border rounded px-2 py-1 text-sm"/>
    <ul className="max-h-28 overflow-auto border rounded mt-1">{res.map(u=><li key={u.id}><button type="button" onClick={()=>toggle(u.id)} className={`w-full text-left px-2 py-0.5 text-sm hover:bg-slate-100 ${value.includes(u.id)?'font-semibold':''}`}>{value.includes(u.id)?'✓ ':''}{u.firstName} {u.lastName}</button></li>)}</ul></div>;
}
export default function EventForm({init,occ,tz,events,onSave,onDelete,onClose}){
  const r=occ?.rule,busy=useRef(false);
  const [f,setF]=useState({title:init.title||'',start:toInput(init.start,tz),end:toInput(init.end,tz),allDay:!!init.allDay,attendees:init.attendees||[],reminder:init.reminder??15,freq:r?.freq||'none',interval:r?.interval||1,endType:r?.until?'until':r?.count?'count':'never',until:r?.until?toInput(r.until,tz).slice(0,10):'',count:r?.count||5,nth:!!r?.nth});
  const set=(k,v)=>setF(x=>({...x,[k]:v}));
  let st=fromInput(f.start,tz),en=fromInput(f.end,tz);
  if(f.allDay){const d=parseDate(f.start.slice(0,10));if(d){const n=addDays(d,1);st=zoned(d.y,d.m,d.d,0,0,tz);en=zoned(n.y,n.m,n.d,0,0,tz)}}
  const errs=[];if(!f.title.trim())errs.push('Title is required');if(!Number.isFinite(st)||!Number.isFinite(en))errs.push('Enter valid dates');else if(en<=st)errs.push('End must be after start');
  const busyAtt=useMemo(()=>{if(errs.length)return[];const b=new Set();for(const e of events){if(e.id===occ?.masterId)continue;for(const o of expand(e,st,en))o.attendees.forEach(a=>f.attendees.includes(a)&&b.add(a))}return[...b]},[st,en,f.attendees,events]);// eslint-disable-line
  const submit=e=>{e.preventDefault();if(busy.current||errs.length)return;busy.current=true; // double-submit guard
    const p={title:f.title.trim(),start:st,end:en,allDay:f.allDay,attendees:f.attendees,reminder:+f.reminder};
    {let rule=null;if(f.freq!=='none'){const u=parseDate(f.until);rule={freq:f.freq,interval:Math.max(1,+f.interval||1),tz:r?.tz||tz,nth:f.freq==='monthly'&&f.nth,until:f.endType==='until'&&u?zoned(u.y,u.m,u.d,23,59,tz):undefined,count:f.endType==='count'?Math.max(1,+f.count||1):undefined}}p.rule=rule}
    onSave(p)};
  const inp='w-full border rounded px-2 py-1 text-sm';
  return <Modal title={occ?'Edit event':'New event'} onClose={onClose}><form onSubmit={submit} className="space-y-2">
    <label className="block text-sm">Title<input className={inp} value={f.title} onChange={e=>set('title',e.target.value)}/></label>
    <label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={f.allDay} onChange={e=>set('allDay',e.target.checked)}/>All day</label>
    <div className="grid grid-cols-2 gap-2"><label className="text-sm">Start<input type="datetime-local" className={inp} value={f.start} onChange={e=>set('start',e.target.value)}/></label>
    {!f.allDay&&<label className="text-sm">End<input type="datetime-local" className={inp} value={f.end} onChange={e=>set('end',e.target.value)}/></label>}</div>
    <div className="text-sm">Attendees<AttendeePicker value={f.attendees} onChange={v=>set('attendees',v)}/></div>
    {busyAtt.length>0&&<p role="alert" className="text-sm text-amber-700 bg-amber-50 rounded p-1">Conflict: {busyAtt.length} attendee(s) already busy then (user {busyAtt.join(', ')}).</p>}
    {<div className="grid grid-cols-2 gap-2 text-sm"><label>Repeat<select className={inp} value={f.freq} onChange={e=>set('freq',e.target.value)}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
      {f.freq!=='none'&&<label>Every<input type="number" min="1" className={inp} value={f.interval} onChange={e=>set('interval',e.target.value)}/></label>}
      {f.freq==='monthly'&&<label className="col-span-2 flex gap-2"><input type="checkbox" checked={f.nth} onChange={e=>set('nth',e.target.checked)}/>Same weekday (e.g. every 2nd Tuesday)</label>}
      {f.freq!=='none'&&<><label>Ends<select className={inp} value={f.endType} onChange={e=>set('endType',e.target.value)}><option value="never">Never</option><option value="until">On date</option><option value="count">After N times</option></select></label>
        {f.endType==='until'&&<label>Until<input type="date" className={inp} value={f.until} onChange={e=>set('until',e.target.value)}/></label>}
        {f.endType==='count'&&<label>Count<input type="number" min="1" className={inp} value={f.count} onChange={e=>set('count',e.target.value)}/></label>}</>}</div>}
    <label className="block text-sm">Reminder<select className={inp} value={f.reminder} onChange={e=>set('reminder',e.target.value)}>{[0,5,10,15,30,60].map(m=><option key={m} value={m}>{m?m+' min before':'At time of event'}</option>)}</select></label>
    {errs.map(x=><p key={x} role="alert" className="text-sm text-red-600">{x}</p>)}
    <div className="flex gap-2 justify-end pt-2">{occ&&<Link to={'/events/'+occ.masterId} className="text-sm text-blue-600 mr-auto self-center">Details</Link>}
      {occ&&<button type="button" onClick={()=>{if(!busy.current){busy.current=true;onDelete()}}} className="px-3 py-1 text-red-600">Delete</button>}
      <button type="button" onClick={onClose} className="px-3 py-1">Cancel</button><button className="px-3 py-1 bg-blue-600 text-white rounded">Save</button></div>
  </form></Modal>;
}
