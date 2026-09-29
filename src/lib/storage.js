const K='cal.events',V=1;
const ok=e=>e&&typeof e.id==='string'&&typeof e.title==='string'&&Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.end>e.start&&Array.isArray(e.attendees);
export function loadEvents(){ // null => missing / corrupt / old schema => caller re-seeds
  try{const d=JSON.parse(localStorage.getItem(K));if(d?.version===V&&Array.isArray(d.events)&&d.events.every(ok))return d.events}catch{}
  localStorage.removeItem(K);return null;
}
export const saveEvents=events=>{try{localStorage.setItem(K,JSON.stringify({version:V,events}))}catch{}};
