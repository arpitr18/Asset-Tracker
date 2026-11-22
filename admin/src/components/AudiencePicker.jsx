import React,{useCallback,useEffect,useState} from 'react';
import {useResource} from '../lib/useResource.js';
import {Pager,RecordCount} from './Pager.jsx';
import {LoadState} from './Ui.jsx';

export function AudiencePicker({label,selected,onChange,load,placeholder}){
  const [open,setOpen]=useState(false),[input,setInput]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(1);
  useEffect(()=>{
    const timer=setTimeout(()=>{setQuery(input.trim());setPage(1);},200);
    return ()=>clearTimeout(timer);
  },[input]);
  const fetch=useCallback(signal=>open?load(query,page,signal):Promise.resolve({items:[],hasMore:false}),[open,load,query,page]);
  const resource=useResource(fetch);
  const toggle=id=>onChange(selected.includes(id)?selected.filter(value=>value!==id):[...selected,id]);
  return <div className="audience-picker">
    <strong>{label}</strong>
    <button type="button" className="ghost audience-trigger" aria-expanded={open} onClick={()=>setOpen(!open)}>
      {selected.length?selected.length+' selected':'All'} <span aria-hidden="true">⌄</span>
    </button>
    {selected.length>0&&<div className="actions">{selected.map(id=><button key={id} className="ghost" type="button" onClick={()=>toggle(id)} aria-label={'Remove '+id}>{id} ×</button>)}</div>}
    {open&&<div className="audience-options">
      <label className="field"><span>{placeholder}</span><input value={input} onChange={event=>setInput(event.target.value)}/></label>
      <LoadState resource={resource}/>
      <RecordCount total={resource.data?.total}/>{resource.data?.items.map(item=><label className="check audience-option" key={item.id}>
        <input type="checkbox" checked={selected.includes(item.id)} onChange={()=>toggle(item.id)}/>
        <span>{item.name}{item.name!==item.id&&<small> · {item.code||item.id}</small>}</span>
      </label>)}
      {!resource.busy&&resource.data?.items.length===0&&<small>No matches.</small>}
      <Pager page={page} setPage={setPage} total={resource.data?.total} hasMore={resource.data?.hasMore} busy={resource.busy}/>
      <button type="button" className="ghost" onClick={()=>setOpen(false)}>Done</button>
    </div>}
  </div>;
}
