import {createContext,useContext,useEffect,useState} from 'react';
import {authService} from './services/authService';import {tokens} from './api/axios';
const A=createContext();export const useAuth=()=>useContext(A);
export function AuthProvider({children}){
  const [user,setUser]=useState(null),[loading,setLoading]=useState(!!tokens.get());
  useEffect(()=>{if(tokens.get())authService.me().then(setUser,()=>tokens.clear()).finally(()=>setLoading(false))},[]);
  useEffect(()=>{const out=()=>setUser(null),st=e=>{if(e.key==='tokens'&&!e.newValue)out()}; // multi-tab logout
    window.addEventListener('auth:logout',out);window.addEventListener('storage',st);return()=>{window.removeEventListener('auth:logout',out);window.removeEventListener('storage',st)}},[]);
  const login=async(u,p)=>setUser(await authService.login(u,p));
  const logout=()=>{authService.logout();setUser(null)};
  return <A.Provider value={{user,loading,login,logout}}>{children}</A.Provider>;
}
