import {api} from './api.js';
export const users={
  list:(q,page,signal)=>api('/admin/users?'+new URLSearchParams({q,page}),{signal}),
  territories:signal=>api('/admin/territories',{signal}),
  save:(user,id)=>api('/admin/users'+(id?'/'+id:''),{method:id?'PUT':'POST',data:user}),
  remove:id=>api('/admin/users/'+id,{method:'DELETE'}),
  reset:(id,password)=>api('/admin/users/'+id+'/password',{method:'POST',data:{password}}),
};
