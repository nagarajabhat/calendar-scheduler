import {createContext,useContext,useReducer,useEffect,useRef,useCallback} from 'react';
import {loadEvents,saveEvents} from './lib/storage';import {seed,sync} from './services/eventService';
const Ctx=createContext();export const useCal=()=>useContext(Ctx);
let cid=0;
// Command pattern: cmd={id,label,changes:[{id,before,after}]}. do = apply `after`, undo = apply `before` (null = absent).
const apply=(evs,cmd,dir)=>{const m=new Map(evs.map(e=>[e.id,e]));for(const c of cmd.changes){const v=dir==='do'?c.after:c.before;v?m.set(c.id,v):m.delete(c.id)}return[...m.values()]};
export function reducer(s,a){switch(a.t){
  case 'load':return{...s,events:a.events,ready:true};
  case 'exec':return{...s,events:apply(s.events,a.cmd,'do'),past:[...s.past,a.cmd],future:[],status:{...s.status,[a.cmd.id]:'saving'}};
  case 'undo':{const c=s.past.at(-1);return c?{...s,events:apply(s.events,c,'undo'),past:s.past.slice(0,-1),future:[c,...s.future],msg:'Undid '+c.label}:s}
  case 'redo':{const c=s.future[0];return c?{...s,events:apply(s.events,c,'do'),past:[...s.past,c],future:s.future.slice(1),msg:'Redid '+c.label}:s}
  case 'status':return{...s,status:{...s.status,[a.id]:a.v}};
  case 'rollback':{ // revert a failed save ONLY if no later command touched the same events; otherwise later history stays intact
    const i=s.past.findIndex(c=>c.id===a.id),st={...s.status,[a.id]:'failed'};
    if(i<0)return{...s,status:st};
    const ids=new Set(s.past[i].changes.map(c=>c.id));
    if(s.past.slice(i+1).some(c=>c.changes.some(x=>ids.has(x.id))))return{...s,status:st};
    return{...s,events:apply(s.events,s.past[i],'undo'),past:s.past.filter(c=>c.id!==a.id),status:st,msg:'Save failed, change rolled back'};
  }
  default:return s}}
export function CalProvider({children}){
  const [s,d]=useReducer(reducer,{events:[],past:[],future:[],status:{},ready:false,msg:''});
  const ref=useRef(s);ref.current=s;
  useEffect(()=>{(async()=>{let e=loadEvents();if(!e){try{e=await seed()}catch{e=[]}}d({t:'load',events:e})})()},[]);
  useEffect(()=>{if(s.ready)saveEvents(s.events)},[s.events,s.ready]);
  const run=useCallback(cmd=>sync(cmd).then(()=>d({t:'status',id:cmd.id,v:'saved'}),()=>d({t:'rollback',id:cmd.id})),[]);
  const exec=useCallback((label,changes)=>{if(!changes.length)return;const cmd={id:++cid,label,changes};d({t:'exec',cmd});run(cmd)},[run]);
  const undo=useCallback(()=>{const c=ref.current.past.at(-1);if(c){d({t:'undo'});d({t:'status',id:c.id,v:'saving'});run(c)}},[run]);
  const redo=useCallback(()=>{const c=ref.current.future[0];if(c){d({t:'redo'});d({t:'status',id:c.id,v:'saving'});run(c)}},[run]);
  return <Ctx.Provider value={{s,exec,undo,redo}}>{children}</Ctx.Provider>;
}
