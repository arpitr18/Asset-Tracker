import {useCallback,useEffect,useState} from 'react';
export function useResource(load){
  const [state,set]=useState({data:null,busy:true,error:''});
  const [version,bump]=useState(0);
  const refresh=useCallback(()=>bump(value=>value+1),[]);
  useEffect(()=>{
    const controller=new AbortController();
    set(old=>({...old,busy:true,error:''}));
    load(controller.signal).then(data=>{
      if(!controller.signal.aborted)set({data,busy:false,error:''});
    }).catch(error=>{
      if(!controller.signal.aborted)set(old=>({...old,busy:false,error:error.message}));
    });
    return ()=>controller.abort();
  },[load,version]);
  return {...state,refresh};
}
