import {useRef,useState,useCallback} from 'react';
export const HPX=48; // px per hour
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Drag state lives in refs (no re-render per pointermove); preview state is flushed once per animation frame; commit on pointerup.
export function useDragInteraction(colsRef,onDone){
  const d=useRef(null),raf=useRef(0),cb=useRef(onDone),L=useRef({}),[preview,setPreview]=useState(null);
  cb.current=onDone;
  const pos=e=>{const r=colsRef.current.getBoundingClientRect();return{col:clamp(Math.floor((e.clientX-r.left)/(r.width/7)),0,6),min:clamp(Math.round((e.clientY-r.top)/HPX*4)*15,0,1440)}}; // snap 15 min
  const calc=()=>{const{mode,a,c,o}=d.current;
    if(mode==='create'){let s=Math.min(a.min,c.min),e=Math.max(a.min,c.min,s+15);if(e>1440){e=1440;s=1425}return{col:a.col,s,e}}
    if(mode==='move'){const dur=o.e-o.s,s=clamp(o.s+c.min-a.min,0,1440-dur);return{col:clamp(o.col+c.col-a.col,0,6),s,e:s+dur}}
    if(mode==='resize-top')return{col:o.col,s:Math.min(c.min,o.e-15),e:o.e};
    return{col:o.col,s:o.s,e:Math.max(c.min,o.s+15)}};
  const end=useCallback(()=>{cancelAnimationFrame(raf.current);raf.current=0;d.current=null;setPreview(null);
    window.removeEventListener('pointermove',L.current.mv);window.removeEventListener('pointerup',L.current.up);window.removeEventListener('keydown',L.current.kd)},[]);
  const start=useCallback((mode,e,o)=>{
    e.preventDefault();e.stopPropagation();const p=pos(e);d.current={mode,a:p,c:p,o};
    L.current={
      mv:ev=>{d.current.c=pos(ev);if(!raf.current)raf.current=requestAnimationFrame(()=>{raf.current=0;if(d.current)setPreview({...calc(),key:o?.occ.key})})},
      up:()=>{if(!d.current)return;const r=calc(),m=d.current.mode;end();if(m==='create'||r.col!==o.col||r.s!==o.s||r.e!==o.e)cb.current(m,r,o)},
      kd:ev=>{if(ev.key==='Escape')end()}}; // Esc cancels: nothing committed
    window.addEventListener('pointermove',L.current.mv);window.addEventListener('pointerup',L.current.up);window.addEventListener('keydown',L.current.kd);
  },[end]);
  return{start,preview};
}
