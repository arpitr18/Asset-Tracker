import React,{useCallback,useState} from 'react';
import {Pager,RecordCount} from '../components/Pager.jsx';
import {excel} from '../services/excel.js';
import {api} from '../services/api.js';
import {useResource} from '../lib/useResource.js';
import {downloadBlob,formatDate} from '../utils/format.js';
import {Badge,Empty,Icon,LoadState,Notice,Panel,Table} from '../components/Ui.jsx';

const labels={users:'Upload Users',stores:'Store Master','store-sales':'Store Sales',stockists:'RD Master',assets:'Asset Master','rd-sales':'RD Sales'};
export function WorkbookActions({kind,onApplied}){
  const [file,setFile]=useState(null),[preview,setPreview]=useState(null),[busy,setBusy]=useState(false);
  const [errorPage,setErrorPage]=useState(1);
  const [error,setError]=useState(''),[success,setSuccess]=useState('');
  async function download(variant){
    try{downloadBlob(await excel.download(kind,variant),kind+'-'+variant+'.xlsx');}
    catch(failure){setError(failure.message);}
  }
  async function upload(action){
    setBusy(true);setError('');setSuccess('');
    try{
      const result=await excel.upload(kind,action,file);
      if(action==='preview'){setPreview(result);setErrorPage(1);}
      else{setPreview(null);setFile(null);setSuccess(result.count+' rows imported.');onApplied?.();}
    }catch(failure){setError(failure.message);}finally{setBusy(false);}
  }
  return <Panel title={labels[kind]+' Excel'} icon="imports" action={<div className="actions">
    <button className="ghost" onClick={()=>download('template')}>Download template</button>{kind!=='users'&&<button className="button" onClick={()=>download('export')}>Download Excel</button>}</div>}>
    <Notice error={error} success={success}/>
    {kind==='store-sales'&&<p className="muted">Use the OutletUID from Store Master and the current-period calendar year. CM_1 is January. Blank amounts are treated as unreported.</p>}
    <div className="upload"><Icon name="imports" size={28}/><strong>Upload Excel workbook</strong><small>.xlsx · up to 3 MB and {kind==='users'?'100':'1,000'} rows</small>
      <label className="ghost file-button">Choose file <input aria-label={'Upload '+kind+' workbook'} type="file" accept=".xlsx" disabled={busy} onChange={e=>{setFile(e.target.files[0]||null);setPreview(null);setError('');e.target.value='';}}/></label>
      {file&&<span>{file.name}</span>}
    </div>
    <div className="actions"><button className="button" disabled={!file||busy} onClick={()=>upload('preview')}>Validate workbook</button>
      {preview&&!preview.errors.length&&<button className="button" disabled={busy} onClick={()=>{if(window.confirm('Apply '+preview.count+' validated rows? '+(kind==='users'?'Only new emails will be created.':'Existing IDs will be updated.')))upload('apply');}}>Apply import</button>}</div>
    {busy&&<p role="status" className="muted">Working…</p>}
    {preview&&<><p><Badge tone={preview.errors.length?'red':'green'}>{preview.count} rows · {preview.errors.length} validation messages</Badge></p>
      {preview.errors.length>0&&<Table columns={['Excel row','Issue']}>{preview.errors.slice((errorPage-1)*10,errorPage*10).map((row,index)=><tr key={index}><td>{row.row}</td><td>{row.message}</td></tr>)}</Table>}
      {preview.errors.length>10&&<Pager total={preview.errors.length} page={errorPage} setPage={setErrorPage} hasMore={preview.errors.length>errorPage*10}/>}
      {preview.sample.length>0&&(()=>{const cols=Object.keys(preview.sample[0]);return <Table columns={cols}>{preview.sample.map((row,index)=><tr key={index}>{cols.map(key=><td key={key}>{row[key]}</td>)}</tr>)}</Table>;})()}
    </>}
  </Panel>;
}
export function Excel({kind,dateFormat}){
  const [page,setPage]=useState(1);
  const importLoader=useCallback(signal=>kind?Promise.resolve(null):excel.imports(signal,page),[kind,page]);
  const imports=useResource(importLoader);
  const loader=useCallback(signal=>kind?api('/admin/master/'+kind+'?page='+page,{signal}):Promise.resolve(null),[kind,page]);
  const master=useResource(loader);
  if(!kind)return <div className="form-grid">
    {Object.keys(labels).filter(dataset=>dataset!=='users').map(dataset=><WorkbookActions key={dataset} kind={dataset} onApplied={()=>{setPage(1);imports.refresh();}}/>)}
    <Panel title="Recent Imports" className="wide" icon="imports"><LoadState resource={imports}/><RecordCount total={imports.data?.total}/><Table columns={['File','Dataset','Rows','Imported by','Date']}>
      {imports.data?.items.map(row=><tr key={row.id}><td>{row.filename}</td><td>{row.kind}</td><td>{row.rowCount}</td><td>{row.employee}</td><td>{formatDate(row.createdAt,dateFormat,true)}</td></tr>)}
    </Table>{imports.data?.items.length===0&&<Empty>No completed imports.</Empty>}<Pager page={page} setPage={setPage} total={imports.data?.total} busy={imports.busy} hasMore={imports.data?.hasMore}/></Panel></div>;
  const headers=kind==='stores'?['OutletUID','OutletCode','OutletCodeRD','OutletName','Year','RegionName','Town','RdCode']:['RDCode','RDName','RDType','StateName','ContactPerson','Phone'];
  return <><div className={['stockists','stores'].includes(kind)?'form-grid':undefined}><WorkbookActions kind={kind} onApplied={master.refresh}/>
    {kind==='stockists'&&<WorkbookActions kind="rd-sales"/>}
    {kind==='stores'&&<WorkbookActions kind="store-sales"/>}</div>
    <Panel title={labels[kind]+' Records'} icon={kind}><LoadState resource={master}/>
      <RecordCount total={master.data?.total}/><Table columns={headers}>{master.data?.items.map((row,index)=><tr key={index}>{headers.map(key=><td key={key}>{row[key]??'—'}</td>)}</tr>)}</Table>
      {master.data?.items.length===0&&<Empty>No records.</Empty>}
      <Pager page={page} setPage={setPage} total={master.data?.total} busy={master.busy} hasMore={master.data?.hasMore}/>
    </Panel></>;
}
