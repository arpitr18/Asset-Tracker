import {request} from './api';

const root='/rd-directory';
const entry=code=>root+'/'+encodeURIComponent(code);

export const rdDirectory={
  options:signal=>request(root+'/options',{signal}),
  list:(filters,signal)=>request(root+'?'+new URLSearchParams(
    Object.entries(filters).filter(([,value])=>value)
  ),{signal}),
  details:(code,signal)=>request(entry(code)+'?includeSales=0',{signal}),
  sales:(code,signal)=>request(entry(code)+'/sales',{signal}),
};
