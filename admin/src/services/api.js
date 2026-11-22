const base='/api';
let token=sessionStorage.getItem('tracker.admin.token');
export function setSession(value){
  token=value;
  if(value)sessionStorage.setItem('tracker.admin.token',value);
  else sessionStorage.removeItem('tracker.admin.token');
}
export async function api(path,{method='GET',data,signal,file=false}={}){
  const multipart=data instanceof FormData;
  const response=await fetch(base+path,{method,signal,headers:{
    ...(token?{Authorization:'Bearer '+token}:{}),
    ...(data&&!multipart?{'Content-Type':'application/json'}:{}),
  },body:data?multipart?data:JSON.stringify(data):undefined});
  if(!response.ok){
    const error=await response.json().catch(()=>({}));
    if(response.status===401&&path!=='/auth/demo')window.dispatchEvent(new Event('admin-session-expired'));
    throw new Error(error.issues?.map(issue=>[issue.path.join('.'),issue.message].filter(Boolean).join(' — ')).join('; ')||error.error||'Request failed ('+response.status+')');
  }
  if(file)return response.blob();
  return response.status===204?null:response.json();
}
