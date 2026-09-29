import api,{tokens} from '../api/axios';
export const authService={
  async login(username,password){const {data}=await api.post('/auth/login',{username,password,expiresInMins:2});tokens.set({accessToken:data.accessToken,refreshToken:data.refreshToken});return data},
  async me(){return (await api.get('/auth/me')).data},
  logout(){tokens.clear()} // removing the key fires a `storage` event in other tabs
};
