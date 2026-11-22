import {api} from './api.js';
export const settings={
  load:signal=>api('/admin/settings',{signal}),
  save:data=>api('/admin/settings',{method:'PUT',data}),
  stats:signal=>api('/admin/stats',{signal}),
};
