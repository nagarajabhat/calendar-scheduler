import axios from 'axios';
export const tokens={get:()=>{try{return JSON.parse(localStorage.getItem('tokens'))}catch{return null}},set:t=>localStorage.setItem('tokens',JSON.stringify(t)),clear:()=>localStorage.removeItem('tokens')};
const api=axios.create({baseURL:'https://dummyjson.com'});
api.interceptors.request.use(c=>{const t=tokens.get();if(t?.accessToken)c.headers.Authorization='Bearer '+t.accessToken;return c});
let refreshing=null; // shared promise: N failing requests => exactly one refresh
const refresh=()=>refreshing||=api.post('/auth/refresh',{refreshToken:tokens.get()?.refreshToken,expiresInMins:2},{_retry:true})
  .then(r=>{tokens.set({...tokens.get(),...r.data});return r.data}).finally(()=>{refreshing=null});
api.interceptors.response.use(r=>r,async err=>{
  const cfg=err.config,status=err.response?.status;
  if(status===401&&cfg&&!cfg._retry&&!cfg.url.includes('/auth/login')){
    cfg._retry=true;
    try{await refresh();return api(cfg)}catch{tokens.clear();window.dispatchEvent(new Event('auth:logout'))}
  }
  return Promise.reject({status:status||0,message:err.response?.data?.message||err.message||'Network error'}); // one error shape
});
export default api;
