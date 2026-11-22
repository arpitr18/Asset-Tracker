import {api} from './api.js';
export const excel={
  download:(kind,variant)=>api('/admin/excel/'+kind+'/'+variant,{file:true}),
  upload:(kind,action,file)=>{
    const data=new FormData();data.set('file',file);
    return api('/admin/excel/'+kind+'/'+action,{method:'POST',data});
  },
  imports:(signal,page=1)=>api('/admin/imports?page='+page,{signal}),
};
