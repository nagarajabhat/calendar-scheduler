// Google-Calendar-style columns. items: [{s,e,...}] minutes. Returns items with c (column) and n (columns in cluster).
export function layout(items){
  const sorted=[...items].sort((a,b)=>a.s-b.s||b.e-a.e),res=[];
  let cluster=[],cols=[],end=0;
  const flush=()=>{const n=cols.length;cluster.forEach(x=>{x.n=n});res.push(...cluster);cluster=[];cols=[]};
  for(const it of sorted){
    if(cluster.length&&it.s>=end)flush();       // no overlap with the running cluster => start a new one
    let c=cols.findIndex(ce=>ce<=it.s);         // first column that is free
    if(c<0){c=cols.length;cols.push(0)}
    cols[c]=it.e;cluster.push({...it,c});end=Math.max(end,it.e);
  }
  flush();return res;
}
