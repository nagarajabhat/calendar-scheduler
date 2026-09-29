import api from '../api/axios';
const sel='firstName,lastName,image,email';
export const userService={
  list:async(skip=0)=>(await api.get(`/users?limit=30&skip=${skip}&select=${sel}`)).data.users,
  search:async q=>(await api.get('/users/search',{params:{q,limit:30,select:sel}})).data.users,
  get:async id=>(await api.get('/users/'+id)).data
};
