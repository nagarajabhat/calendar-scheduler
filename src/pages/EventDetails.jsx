import {Link,useParams} from 'react-router-dom';import {useCal} from '../store';import {parts,fmtTime} from '../lib/dates';
export default function EventDetails(){
  const {id}=useParams(),{s}=useCal(),tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
  if(!s.ready)return <p className="p-6">Loading…</p>;
  const e=s.events.find(x=>x.id===id);
  return <main className="max-w-lg mx-auto p-6"><Link to="/" className="text-blue-600 text-sm">← Back to calendar</Link>
    {!e?<h1 className="mt-4 text-xl" role="alert">Event not found</h1>:<><h1 className="mt-4 text-2xl font-semibold">{e.title}</h1>
    <p className="mt-2">{new Date(e.start).toLocaleDateString([],{timeZone:tz})}, {fmtTime(e.start,tz)} – {fmtTime(e.end,tz)} ({tz})</p>
    <p>Attendees (user ids): {e.attendees.join(', ')||'none'}</p><p>{e.rule?`Repeats ${e.rule.freq}`:'Does not repeat'} · Reminder {e.reminder} min</p></>}</main>;
}
