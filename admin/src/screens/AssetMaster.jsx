import {WorkbookActions} from './Excel.jsx';
import {RecordCount} from '../components/Pager.jsx';
import React,{useCallback,useState} from 'react';
import {Badge,Empty,LoadState,Panel,Table} from '../components/Ui.jsx';
import {useResource} from '../lib/useResource.js';
import {loadAssets} from '../services/assets.js';

export function AssetMaster(){
  const [upload,setUpload]=useState(false);
  const [input,setInput]=useState('');
  const [query,setQuery]=useState('');
  const [pages,setPages]=useState([null]);
  const after=pages.at(-1);
  const load=useCallback(signal=>loadAssets(query,after,signal),[query,after]);
  const resource=useResource(load);
  function search(event){
    event.preventDefault();
    setQuery(input.trim());
    setPages([null]);
  }
  return <Panel title="Asset Inventory" icon="assets" action={<button className="button" aria-expanded={upload} onClick={()=>setUpload(!upload)}>Import assets</button>}>
    {upload&&<WorkbookActions kind="assets" onApplied={()=>{setPages([null]);resource.refresh();}}/>}
    <form className="toolbar" onSubmit={search}>
      <input aria-label="Search assets" placeholder="Asset code, QR code, model or make" value={input} onChange={event=>setInput(event.target.value)}/>
      <button className="ghost">Search</button>
    </form>
    <LoadState resource={resource}/>
    <RecordCount total={resource.data?.total}/>
    <Table columns={['Asset code','Model','Manufacturer','QR code','Assigned stores','Record source']}>
      {resource.data?.items.map(asset=><tr key={asset.assetCode}>
        <td><strong>{asset.assetCode}</strong></td><td>{asset.model||'—'}</td><td>{asset.make||'—'}</td><td>{asset.qrCode||'—'}</td>
        <td>{asset.assignments.length?asset.assignments.map(({outlet})=>outlet.outletName+' ('+outlet.outletUid+')').join(', '):'Unassigned'}</td>
        <td><Badge>{asset.recordType}</Badge></td>
      </tr>)}
    </Table>
    {resource.data?.items.length===0&&<Empty>No matching assets.</Empty>}
    <div className="actions pagination">
      <button className="ghost" disabled={pages.length===1||resource.busy} onClick={()=>setPages(pages.slice(0,-1))}>Previous</button>
      <small>Page {pages.length} of {resource.data?Math.max(1,Math.ceil(resource.data.total/10)):'?'}</small>
      <button className="ghost" disabled={!resource.data?.next||resource.busy} onClick={()=>setPages([...pages,resource.data.next])}>Next</button>
    </div>
  </Panel>;
}
