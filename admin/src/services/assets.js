import {api} from './api.js';

export function loadAssets(q,after,signal){
  const params=new URLSearchParams({q,...(after&&{after})});
  return api('/admin/assets?'+params,{signal});
}
