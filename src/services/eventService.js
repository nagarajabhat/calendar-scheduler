import api from '../api/axios';
const ANCHOR=Date.UTC(2026,9,5); // Mon 5 Oct 2026: fixed so seeds never move
export async function seed(){
  const out=[];
  for(let skip=0;skip<200;skip+=100){
    const {data}=await api.get(`/todos?limit=100&skip=${skip}`);
    for(const t of data.todos){
      const start=ANCHOR+(t.id%14)*864e5+(8+(t.id*7)%9)*36e5+(t.id%4)*15*6e4; // deterministic rule
      out.push({id:'t'+t.id,title:t.todo,start,end:start+[30,60,90][t.id%3]*6e4,allDay:false,organizer:t.userId,attendees:[t.userId],rule:null,exceptions:[],reminder:15});
    }
  }
  return out;
}
// Fake sync: real request to the non-persisting API, then a 20% simulated failure
export async function sync(cmd){
  await api.post('/todos/add',{todo:cmd.label,userId:1,completed:false});
  await new Promise(r=>setTimeout(r,400+Math.random()*600));
  if(Math.random()<0.2)throw {status:500,message:'Simulated sync failure'};
}
