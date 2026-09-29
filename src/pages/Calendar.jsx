import {useMemo,useRef,useState,useEffect,useCallback,memo} from 'react';
import {useCal} from '../store';import {useAuth} from '../auth';
import {useCalendar} from '../hooks/useCalendar';import {useDragInteraction,HPX} from '../hooks/useDragInteraction';
import {expand} from '../lib/recurrence';import {layout} from '../lib/layout';import {editChanges,nid} from '../lib/edit';
import {parts,zoned,dk,dayRange,fmtTime,shift,TZS} from '../lib/dates';
import EventForm,{ScopeDialog,AttendeePicker} from '../components/EventForm';

const mod=(t,tz)=>{const p=parts(t,tz);return p.h*60+p.mi};
const segOf=(o,day,tz)=>{const[ds,de]=dayRange(day,tz);if(o.start>=de||o.end<=ds)return null;return{occ:o,s:o.start<ds?0:mod(o.start,tz),e:o.end>=de?1440:mod(o.end,tz)}};
const WORK=[9,17]; // working hours, shaded outside
const dayFmt=new Intl.DateTimeFormat([],{weekday:'short',day:'numeric',timeZone:'UTC'});
const dayLabel=d=>dayFmt.format(Date.UTC(d.y,d.m-1,d.d));

// Memoised: during a drag only the preview re-renders, so 500+ blocks are skipped (props are referentially stable).
const Block=memo(function Block({seg,lay,col,tz,selected,moving,start,select,open}){
  const{occ,s,e}=seg,o={occ,col,s,e};
  return <div role="button" tabIndex={0} data-key={occ.key} aria-label={`${occ.title}, ${fmtTime(occ.start,tz)}`} onFocus={()=>select(occ.key)}
    onPointerDown={ev=>{select(occ.key);start('move',ev,o)}} onDoubleClick={()=>open(occ)}
    className={`absolute rounded border border-blue-400 bg-blue-100 text-xs px-1 overflow-hidden cursor-grab select-none ${selected?'ring-2 ring-blue-600':''} ${moving?'opacity-40':''}`}
    style={{top:s/60*HPX,height:Math.max(14,(e-s)/60*HPX),left:`${lay.c/lay.n*100}%`,width:`${100/lay.n}%`}}>
    <div className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize" onPointerDown={ev=>{select(occ.key);start('resize-top',ev,o)}}/>
    {occ.rule&&'↻ '}{occ.title}
    <div className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize" onPointerDown={ev=>{select(occ.key);start('resize-bottom',ev,o)}}/>
  </div>;
});
const Col=memo(function Col({items,col,tz,sel,dragKey,start,select,open}){
  return <div role="gridcell" className="relative border-l" style={{height:24*HPX,backgroundImage:`repeating-linear-gradient(to bottom,#e2e8f0 0 1px,transparent 1px ${HPX}px)`}} onPointerDown={e=>{if(e.target===e.currentTarget)start('create',e,null)}}>
    <div className="absolute inset-x-0 top-0 bg-slate-100/70 pointer-events-none" style={{height:WORK[0]*HPX}}/><div className="absolute inset-x-0 bottom-0 bg-slate-100/70 pointer-events-none" style={{height:(24-WORK[1])*HPX}}/>
    {items.map(it=><Block key={it.occ.key} seg={it} lay={it} col={col} tz={tz} selected={sel===it.occ.key} moving={dragKey===it.occ.key} start={start} select={select} open={open}/>)}</div>;
});

export default function Calendar(){
  const c=useCalendar(),{s,exec,undo,redo}=useCal(),{user,logout}=useAuth();
  const[form,setForm]=useState(null),[scope,setScope]=useState(null),[sel,setSel]=useState(null),[mv,setMv]=useState(false),[live,setLive]=useState('');
  const root=useRef(null),cols=useRef(null);
  const occs=useMemo(()=>{const out=[];for(const e of s.events)out.push(...expand(e,c.from,c.to));return c.att?out.filter(o=>o.attendees.includes(c.att)):out},[s.events,c.from,c.to,c.att]);

  const commit=(label,occ,patch)=>occ.rule?setScope({occ,patch,label}):exec(label,editChanges(s.events,occ,patch,'all'));
  const drag=useDragInteraction(cols,(mode,r,o)=>{
    const d=c.days[r.col],st=zoned(d.y,d.m,d.d,Math.floor(r.s/60),r.s%60,c.tz),en=zoned(d.y,d.m,d.d,Math.floor(r.e/60),r.e%60,c.tz);
    if(mode==='create')return setForm({init:{start:st,end:en,attendees:[user.id]}});
    commit(mode==='move'?'Move event':'Resize event',o.occ,{start:st,end:en});
    setLive(`${mode==='move'?'Moved':'Resized'} ${o.occ.title} to ${fmtTime(st,c.tz)}–${fmtTime(en,c.tz)}`);
  });
  const select=useCallback(k=>{setSel(k);root.current?.focus()},[]);
  const open=useCallback(o=>setForm({occ:o,init:o}),[]);
  const items=useMemo(()=>c.view!=='week'?[]:c.days.map(d=>layout(occs.filter(o=>!o.allDay).map(o=>segOf(o,d,c.tz)).filter(Boolean))),[occs,c.days,c.tz,c.view]);

  useEffect(()=>{const kd=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){if(e.target.closest?.('input,textarea,select'))return;e.preventDefault();e.shiftKey?redo():undo()}};
    window.addEventListener('keydown',kd);return()=>window.removeEventListener('keydown',kd)},[undo,redo]);
  useEffect(()=>{if(s.msg)setLive(s.msg)},[s.msg,s.past.length,s.future.length]);

  const onKey=e=>{ // grid keyboard: arrows move selection; M then arrows moves the event (each step = one undo step)
    const occ=occs.find(o=>o.key===sel);if(!occ)return;
    if(e.key==='m'||e.key==='M'){setMv(v=>!v);setLive(mv?'Move mode off':'Move mode on. Use arrow keys.');return}
    if(e.key==='Escape'){setMv(false);return}
    if(!e.key.startsWith('Arrow'))return;e.preventDefault();
    if(mv){const dm=e.key==='ArrowUp'?-15:e.key==='ArrowDown'?15:0,dd=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,st=shift(occ.start,dd,dm,c.tz),en=st+(occ.end-occ.start);
      commit('Move event',occ,{start:st,end:en});setLive(`Moved ${occ.title} to ${fmtTime(st,c.tz)}`);return}
    const sorted=[...occs].sort((a,b)=>a.start-b.start),i=sorted.findIndex(o=>o.key===sel),n=sorted[i+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)];
    if(n){setSel(n.key);root.current.querySelector(`[data-key="${CSS.escape(n.key)}"]`)?.focus()}};

  const dragAllDay=(e,o)=>{ // drag an all-day chip sideways: 1 drag = 1 command; click (no movement) opens the form; Esc cancels
    e.preventDefault();const w=e.currentTarget.parentElement.parentElement.getBoundingClientRect().width/7,x0=e.clientX;
    const off=()=>{window.removeEventListener('pointerup',up);window.removeEventListener('keydown',kd)};
    const up=ev=>{off();const dd=Math.round((ev.clientX-x0)/w);if(!dd)return open(o);commit('Move event',o,{start:shift(o.start,dd,0,c.tz),end:shift(o.end,dd,0,c.tz)});setLive(`Moved ${o.title} by ${dd} day(s)`)};
    const kd=ev=>{if(ev.key==='Escape')off()};
    window.addEventListener('pointerup',up);window.addEventListener('keydown',kd)};
  const save=v=>{const f=form;setForm(null);
    if(!f.occ){const id=nid();exec('Create event',[{id,before:null,after:{id,organizer:user.id,exceptions:[],...v}}])}
    else if(f.occ.rule)setScope({occ:f.occ,patch:v,label:'Edit'});else exec('Edit event',editChanges(s.events,f.occ,v,'all'))};
  const del=()=>{const o=form.occ;setForm(null);o.rule?setScope({occ:o,patch:null,label:'Delete'}):exec('Delete event',editChanges(s.events,o,null,'all'))};
  const pick=sc=>{exec(scope.label+' event',editChanges(s.events,scope.occ,scope.patch,sc));setScope(null)};

  const vals=Object.values(s.status),pending=vals.includes('saving'),failed=vals.at(-1)==='failed';
  const title=new Intl.DateTimeFormat([],{month:'long',year:'numeric',timeZone:'UTC'}).format(Date.UTC(c.date.y,c.date.m-1,1));
  const btn='border rounded px-2 py-1 text-sm disabled:opacity-40';
  const nowDraft=()=>{const t=Math.ceil(Date.now()/9e5)*9e5;setForm({init:{start:t,end:t+36e5,attendees:[user.id]}})};

  return <div className="p-3 max-w-6xl mx-auto">
    <header className="flex flex-wrap items-center gap-2 mb-3">
      <button className={btn} onClick={()=>c.nav(-1)} aria-label="Previous">‹</button><button className={btn} onClick={c.today}>Today</button><button className={btn} onClick={()=>c.nav(1)} aria-label="Next">›</button>
      <h1 className="font-semibold mx-2">{title}</h1>
      <select className={btn} value={c.view} onChange={e=>c.set({view:e.target.value,date:dk(c.date)})} aria-label="View"><option value="week">Week</option><option value="month">Month</option></select>
      <select className={btn} value={c.tz} onChange={e=>c.set({tz:e.target.value})} aria-label="Timezone">{[...new Set([c.tz,...TZS])].map(z=><option key={z}>{z}</option>)}</select>
      <div className="w-44"><AttendeePicker single value={c.att?[c.att]:[]} onChange={v=>c.set({att:v[0]??null})}/></div>
      <button className={btn} onClick={undo} disabled={!s.past.length}>Undo</button><button className={btn} onClick={redo} disabled={!s.future.length}>Redo</button>
      <button className={btn+' bg-blue-600 text-white'} onClick={nowDraft}>New event</button>
      <span className={`text-sm ${failed?'text-red-600':'text-slate-500'}`} aria-hidden="true">{pending?'Saving…':failed?'Save failed':'Saved'}</span>
      <button className={btn+' ml-auto'} onClick={logout}>Log out ({user.username})</button>
    </header>
    <div aria-live="polite" className="sr-only">{live}</div>
    {!s.ready&&<p>Loading events…</p>}
    <div ref={root} tabIndex={-1} onKeyDown={onKey} className="outline-none">
    {c.view==='week'?<div role="grid" aria-label="Week calendar. Select an event, press M, then arrow keys to move it." className="border rounded bg-white overflow-auto" style={{maxHeight:'75vh'}}>
      <div className="flex sticky top-0 bg-white z-10 border-b"><div className="w-12"/><div className="flex-1 grid grid-cols-7">{c.days.map(d=><div key={dk(d)} role="columnheader" className="text-xs text-center py-1 border-l">{dayLabel(d)}
        {occs.filter(o=>o.allDay&&segOf(o,d,c.tz)).map(o=><div key={o.key} onPointerDown={e=>dragAllDay(e,o)} className="bg-blue-200 rounded mx-1 truncate cursor-grab select-none">{o.title}</div>)}</div>)}</div></div>
      <div className="flex"><div className="w-12 text-[10px] text-right pr-1 text-slate-500">{Array.from({length:24},(_,h)=><div key={h} style={{height:HPX}}>{h}:00</div>)}</div>
        <div ref={cols} className="flex-1 grid grid-cols-7 relative">{c.days.map((d,i)=><Col key={dk(d)} items={items[i]} col={i} tz={c.tz} sel={sel} dragKey={drag.preview?.key} start={drag.start} select={select} open={open}/>)}
          {drag.preview&&<div className="absolute pointer-events-none border-2 border-dashed border-blue-600 bg-blue-300/40 rounded text-xs px-1" style={{left:`${drag.preview.col/7*100}%`,width:`${100/7}%`,top:drag.preview.s/60*HPX,height:(drag.preview.e-drag.preview.s)/60*HPX}}>
            {String(Math.floor(drag.preview.s/60)).padStart(2,'0')}:{String(drag.preview.s%60).padStart(2,'0')}–{String(Math.floor(drag.preview.e/60)%24).padStart(2,'0')}:{String(drag.preview.e%60).padStart(2,'0')}</div>}</div></div>
    </div>:<div role="grid" aria-label="Month calendar" className="grid grid-cols-7 border-t border-l bg-white">
      {c.days.map(d=>{const[ds,de]=dayRange(d,c.tz),list=occs.filter(o=>o.start<de&&o.end>ds).sort((a,b)=>a.start-b.start);
        return <div key={dk(d)} role="gridcell" tabIndex={0} onClick={()=>c.set({view:'week',date:dk(d)})} onKeyDown={e=>e.key==='Enter'&&c.set({view:'week',date:dk(d)})} className={`border-r border-b min-h-24 p-1 text-xs cursor-pointer ${d.m!==c.date.m?'bg-slate-50 text-slate-400':''}`}>
          <div className="font-medium">{d.d}</div>{list.slice(0,3).map(o=><div key={o.key} className="truncate bg-blue-100 rounded px-1 mt-0.5">{o.title}</div>)}{list.length>3&&<div>+{list.length-3} more</div>}</div>})}
    </div>}
    </div>
    {form&&<EventForm init={form.init} occ={form.occ} tz={c.tz} events={s.events} onSave={save} onDelete={del} onClose={()=>setForm(null)}/>}
    {scope&&<ScopeDialog label={scope.label} onPick={pick} onClose={()=>setScope(null)}/>}
  </div>;
}
