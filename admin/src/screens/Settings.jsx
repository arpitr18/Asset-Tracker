import React,{useCallback,useState} from 'react';
import {Pager,RecordCount} from '../components/Pager.jsx';
import {api} from '../services/api.js';
import {settings} from '../services/settings.js';
import {useResource} from '../lib/useResource.js';
import {formatDate} from '../utils/format.js';
import {Field,LoadState,Notice,Panel} from '../components/Ui.jsx';
import {Activity} from './Dashboard.jsx';
export function Audit({dateFormat}){
  const [page,setPage]=useState(1);
  const load=useCallback(signal=>api('/admin/audit?page='+page,{signal}),[page]);
  const resource=useResource(load);
  return <Panel title="Recent Audit Activity" icon="audit" action={<button className="ghost" onClick={resource.refresh}>Refresh</button>}>
    <LoadState resource={resource}/><RecordCount total={resource.data?.total}/><Activity items={resource.data?.items||[]} dateFormat={dateFormat}/>
    <Pager page={page} setPage={setPage} total={resource.data?.total} busy={resource.busy} hasMore={resource.data?.hasMore}/></Panel>;
}
export function Settings({config,onSaved}){
  const [draft,setDraft]=useState(config),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  async function save(event){
    event.preventDefault();setBusy(true);setError('');setSuccess('');
    try {const saved=await settings.save(draft);onSaved(saved);setSuccess('Settings saved. Open mobile screens refresh within 15 seconds.');}
    catch(failure){setError(failure.message);}finally{setBusy(false);}
  }
  return <Panel title="Runtime Settings" icon="settings"><Notice error={error} success={success}/>
    <form className="editor" onSubmit={save}><div className="form-grid">
      <Field label="Display date format"><select value={draft.dateFormat} onChange={e=>setDraft({...draft,dateFormat:e.target.value})}>{['DD MMM YYYY','DD/MM/YYYY','YYYY-MM-DD','MM/DD/YYYY'].map(value=><option key={value}>{value}</option>)}</select></Field>
      <Field label="Survey location tolerance (metres)"><input type="number" min="25" max="1000" required value={draft.surveyRadiusMeters} onChange={e=>setDraft({...draft,surveyRadiusMeters:Number(e.target.value)})}/></Field>
      <Field label="Nearby store radius (km)"><input type="number" min="1" max="50" required value={draft.nearbyRadiusKm} onChange={e=>setDraft({...draft,nearbyRadiusKm:Number(e.target.value)})}/></Field>
    </div><p className="muted">Preview: {formatDate(new Date(),draft.dateFormat,true)}</p>
    <div className="actions"><button className="button" disabled={busy}>{busy?'Saving…':'Save settings'}</button></div></form>
  </Panel>;
}
