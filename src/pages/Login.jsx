import {useEffect,useRef,useState} from 'react';import {useNavigate} from 'react-router-dom';import {useAuth} from '../auth';
export default function Login(){
  const {login,user}=useAuth(),nav=useNavigate(),lock=useRef(false);
  const [u,setU]=useState('emilys'),[p,setP]=useState('emilyspass'),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{if(user)nav('/',{replace:true})},[user,nav]);
  const submit=async e=>{e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setErr('');
    try{await login(u,p)}catch(x){setErr(x.message)}finally{lock.current=false;setBusy(false)}};
  return <main className="min-h-screen grid place-items-center bg-slate-50"><form onSubmit={submit} className="w-80 space-y-3 bg-white p-6 rounded-lg shadow">
    <h1 className="text-xl font-semibold">Sign in</h1>
    <label className="block text-sm">Username<input className="mt-1 w-full border rounded px-2 py-1" value={u} onChange={e=>setU(e.target.value)}/></label>
    <label className="block text-sm">Password<input type="password" className="mt-1 w-full border rounded px-2 py-1" value={p} onChange={e=>setP(e.target.value)}/></label>
    {err&&<p role="alert" className="text-sm text-red-600">{err}</p>}
    <button disabled={busy} className="w-full bg-blue-600 text-white rounded py-1.5 disabled:opacity-50">{busy?'Signing in…':'Sign in'}</button>
  </form></main>;
}
