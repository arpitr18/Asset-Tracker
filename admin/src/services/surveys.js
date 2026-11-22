import {api} from './api.js';
export const surveys={
  list:(signal,page=1)=>api('/admin/campaigns?page='+page,{signal}),
  outlets:(q,page,signal)=>api('/admin/campaigns/outlets?'+new URLSearchParams({q,page}),{signal}),
  defaults:signal=>api('/admin/campaigns/defaults',{signal}),
  save:(campaign,id)=>api('/admin/campaigns'+(id?'/'+id:''),{method:id?'PUT':'POST',data:campaign}),
  transition:(id,action)=>api('/admin/campaigns/'+id+'/'+action,{method:'POST'}),
};
