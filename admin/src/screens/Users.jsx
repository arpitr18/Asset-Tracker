import {Pager,RecordCount} from '../components/Pager.jsx';
import React,{useCallback,useEffect,useState} from 'react';
import {WorkbookActions} from './Excel.jsx';
import {users} from '../services/users.js';
import {useResource} from '../lib/useResource.js';
import {formatDate} from '../utils/format.js';
import {Badge,Empty,Field,Icon,LoadState,Notice,Panel,Table} from '../components/Ui.jsx';

const blank={name:'',email:'',jobTitle:'',role:'FIELD',territoryId:null,enabled:true,initialPassword:'Demo@@1234'};
export function Users({initialSearch,dateFormat,currentId}){
  const [query,setQuery]=useState(initialSearch),[search,setSearch]=useState(initialSearch),[page,setPage]=useState(1);
  const [draft,setDraft]=useState(null),[reset,setReset]=useState(null),[password,setPassword]=useState('');
  const [upload,setUpload]=useState(false),[showInitial,setShowInitial]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  useEffect(()=>{setQuery(initialSearch);setSearch(initialSearch);setPage(1);},[initialSearch]);
  const load=useCallback(signal=>users.list(search,page,signal),[search,page]);
  const resource=useResource(load),territories=useResource(users.territories);
  const edit=user=>{setDraft(user?{...user,jobTitle:user.jobTitle||''}:blank);setReset(null);setError('');};
  async function submit(event){
    event.preventDefault();setBusy(true);setError('');setSuccess('');
    try{
      if(reset){await users.reset(reset.id,password);setReset(null);setPassword('');setSuccess('Password changed. Previous sessions were revoked.');}
      else{await users.save(draft,draft.id);setDraft(null);setSuccess('User saved.');resource.refresh();}
    }catch(failure){setError(failure.message);}finally{setBusy(false);}
  }
  async function remove(user){
    if(!window.confirm('Delete '+user.name+'? Their activity history will be retained.'))return;
    setBusy(true);setError('');setSuccess('');
    try{await users.remove(user.id);setDraft(null);setReset(null);setSuccess('User deleted.');setPage(1);resource.refresh();}
    catch(failure){setError(failure.message);}finally{setBusy(false);}
  }
  function update(key,value){setDraft(old=>({...old,[key]:value}));}
  return <><Notice error={error} success={success}/>
    {(draft||reset)&&<Panel title={reset?'Reset password for '+reset.name:draft.id?'Edit user':'Add user'} icon="users">
      <form className="editor" onSubmit={submit}>{reset?<Field label="New password"><input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></Field>:<>
        <div className="form-grid">
          <Field label="Full name"><input required value={draft.name} onChange={e=>update('name',e.target.value)}/></Field>
          <Field label="Email"><input type="email" required value={draft.email} onChange={e=>update('email',e.target.value)}/></Field>
          <Field label="Job title"><input value={draft.jobTitle} onChange={e=>update('jobTitle',e.target.value)}/></Field>
          <Field label="Role"><select disabled={draft.id===currentId} value={draft.role} onChange={e=>update('role',e.target.value)}><option value="FIELD">Field Executive</option><option value="MANAGER">Manager</option><option value="ADMIN">Super Admin</option></select></Field>
          {draft.role==='FIELD'&&<Field label="Territory"><select required value={draft.territoryId||''} onChange={e=>update('territoryId',e.target.value||null)}><option value="">Choose territory</option>{territories.data?.map(t=><option value={t.id} key={t.id}>{t.branchName} / {t.regionName} / {t.asmArea} / {t.soTerritory}</option>)}</select></Field>}
          {!draft.id&&<Field label="Initial password"><span className="actions">
            <input style={{flex:1,minWidth:0}} type={showInitial?'text':'password'} autoComplete="new-password" required minLength={8} maxLength={128} value={draft.initialPassword} onChange={e=>update('initialPassword',e.target.value)}/>
            <button type="button" className="ghost" aria-label={showInitial?'Hide initial password':'Show initial password'} onClick={()=>setShowInitial(!showInitial)}>
              <Icon name={showInitial?'eyeOff':'eye'} size={19}/>
            </button>
          </span></Field>}
        </div>
        <LoadState resource={territories}/><label className="check"><input type="checkbox" disabled={draft.id===currentId} checked={draft.enabled} onChange={e=>update('enabled',e.target.checked)}/> Account enabled</label>
      </>}
      {reset&&<p className="muted">The employee will need to sign in again after this change.</p>}
      <div className="actions"><button disabled={busy} className="button">{busy?'Saving…':reset?'Reset password':'Save user'}</button><button type="button" className="ghost" disabled={busy} onClick={()=>{setDraft(null);setReset(null);setPassword('');setError('');}}>Cancel</button></div></form>
    </Panel>}
    <Panel title="User Management" icon="users" action={<div className="actions">
      <button className="ghost" aria-expanded={upload} onClick={()=>setUpload(!upload)}><Icon name="imports" size={16}/>Upload users</button>
      <button className="button" onClick={()=>{setShowInitial(false);edit(null);}}>＋ Add user</button>
    </div>}>
      {upload&&<WorkbookActions kind="users" onApplied={()=>{setPage(1);resource.refresh();}}/>}
      <form className="toolbar" onSubmit={e=>{e.preventDefault();setSearch(query.trim());setPage(1);}}><input aria-label="Filter users" placeholder="Name or email" value={query} onChange={e=>setQuery(e.target.value)}/><button className="ghost">Search</button></form>
      <LoadState resource={resource}/>
      <RecordCount total={resource.data?.total}/>
      <Table columns={['Name','Email','Role / Title','Status','Last Login','Actions']}>{resource.data?.items.map(user=><tr key={user.id}>
        <td><strong>{user.name}</strong></td><td>{user.email}</td><td>{user.role}<small>{user.jobTitle}</small></td>
        <td><Badge tone={user.enabled?'green':'red'}>{user.enabled?'Active':'Disabled'}</Badge></td><td>{formatDate(user.lastLogin,dateFormat,true)}</td>
        <td><div className="actions"><button className="ghost" onClick={()=>edit(user)}>Edit</button><button className="ghost" onClick={()=>{setDraft(null);setReset(user);setPassword('');setError('');}}>Reset password</button><button className="ghost danger" aria-label={'Delete '+user.name} title="Delete user" disabled={busy||user.id===currentId} onClick={()=>remove(user)}><Icon name="trash" size={16}/></button></div></td>
      </tr>)}</Table>
      {resource.data?.items.length===0&&<Empty>No users found.</Empty>}
      <Pager page={page} setPage={setPage} total={resource.data?.total} busy={resource.busy} hasMore={resource.data?.hasMore}/>
    </Panel>
  </>;
}
