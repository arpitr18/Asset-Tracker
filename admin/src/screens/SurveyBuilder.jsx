import React,{useCallback,useState} from 'react';
import {AudiencePicker} from '../components/AudiencePicker.jsx';
import {Pager,RecordCount} from '../components/Pager.jsx';
import {surveys} from '../services/surveys.js';
import {excel} from '../services/excel.js';
import {useResource} from '../lib/useResource.js';
import {downloadBlob,formatDate} from '../utils/format.js';
import {Badge,Empty,Field,LoadState,Notice,Panel,Table} from '../components/Ui.jsx';

const kinds={yesno:'Yes / No',asset:'Barcode and asset photo',single:'Single choice',multi:'Multiple choice',text:'Text answer',description:'Description block',number:'Number'};
const blank=()=>({id:'q-'+crypto.randomUUID(),label:'',description:'',type:'text',options:['Option 1','Option 2'],required:false,attachment:'none',capture:'none'});

const policy=['none','optional','required'];
function Question({q,index,questions,update,move,remove,duplicate}){
  const toggle=(key,value)=>update({...q,[key]:value});
  return <fieldset className="question"><legend>Question {index+1}</legend>
    <div className="question-toolbar"><button type="button" className="ghost" disabled={index===0} onClick={()=>move(-1)} aria-label="Move question up">↑</button>
      <button type="button" className="ghost" disabled={index===questions.length-1} onClick={()=>move(1)} aria-label="Move question down">↓</button>
      <button type="button" className="ghost" onClick={duplicate}>Duplicate</button><button type="button" className="ghost danger" onClick={remove}>Remove</button></div>
    <div className="form-grid">
      <Field label="Question title"><input required maxLength={200} value={q.label} onChange={e=>toggle('label',e.target.value)}/></Field>
      <Field label="Response type"><select value={q.type} onChange={e=>toggle('type',e.target.value)}>{Object.entries(kinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field>
    </div>
    <Field label={q.type==='description'?'Description text':'Help text (optional)'}><textarea rows="2" maxLength={1000} value={q.description||''} onChange={e=>toggle('description',e.target.value)}/></Field>
    {['single','multi'].includes(q.type)&&<Field label="Choices, one per line"><textarea rows="3" value={(q.options||[]).join('\n')} onChange={e=>toggle('options',e.target.value.split('\n'))}/></Field>}
    <div className="form-grid">
      <Field label="Show when an earlier question is Yes"><select value={q.when||''} onChange={e=>toggle('when',e.target.value)}><option value="">Always</option>{questions.slice(0,index).filter(item=>item.type==='yesno').map(item=><option key={item.id} value={item.id}>{item.label||item.id}</option>)}</select></Field>
      {q.type!=='description'&&<>
        <Field label="File attachment"><select value={q.attachment||'none'} onChange={e=>toggle('attachment',e.target.value)}>{policy.map(value=><option key={value}>{value}</option>)}</select></Field>
        <Field label="Camera capture"><select value={q.capture||'none'} onChange={e=>toggle('capture',e.target.value)}>{policy.map(value=><option key={value}>{value}</option>)}</select></Field>
        <label className="check"><input type="checkbox" checked={q.required} onChange={e=>toggle('required',e.target.checked)}/> Answer required</label>
      </>}
    </div>
  </fieldset>;
}
export function SurveyBuilder({dateFormat}){
  const [page,setPage]=useState(1);
  const load=useCallback(signal=>surveys.list(signal,page),[page]);
  const campaigns=useResource(load),defaults=useResource(surveys.defaults);
  const regions=defaults.data?.regions;
  const loadRegions=useCallback(async(q,regionPage)=>{
    const items=(regions||[]).filter(name=>name.toLowerCase().includes(q.toLowerCase())).map(name=>({id:name,name}));
    return {items:items.slice((regionPage-1)*10,regionPage*10),total:items.length,hasMore:items.length>regionPage*10};
  },[regions]);
  const [editor,setEditor]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  function change(data){setEditor(old=>({...old,...data}));}
  function open(row,duplicate=false){
    const base={title:'',startDate:'',endDate:'',regions:[],stores:[],questions:defaults.data?.questions||[]};
    setEditor(row?{...row,...(duplicate&&{id:null,title:row.title+' (copy)'})}:base);setError('');setSuccess('');
  }
  async function save(event){
    event.preventDefault();setBusy(true);setError('');setSuccess('');
    try{
      const ids=new Set(editor.questions.map(q=>q.id));
      const questions=editor.questions.map(q=>({...q,when:ids.has(q.when)?q.when:undefined,
        options:['single','multi'].includes(q.type)?[...new Set((q.options||[]).map(value=>value.trim()).filter(Boolean))]:undefined,
        ...(q.type==='description'&&{required:false,attachment:'none',capture:'none'})}));
      await surveys.save({title:editor.title,startDate:editor.startDate||null,endDate:editor.endDate||null,
        regions:editor.regions,stores:editor.stores,questions},editor.id);
      setPage(1);campaigns.refresh();setEditor(null);setSuccess('Draft saved. Publish it from the survey list when ready.');
    }catch(failure){setError(failure.message);}finally{setBusy(false);}
  }
  async function transition(row,action){
    if(!window.confirm((action==='publish'?'Publish ':'Archive ')+row.title+'?'))return;
    setBusy(true);setError('');setSuccess('');
    try{await surveys.transition(row.id,action);campaigns.refresh();setSuccess(action==='publish'?'Survey published. Matching stores will receive it automatically.':'Survey archived.');}
    catch(failure){setError(failure.message);}finally{setBusy(false);}
  }
  function replace(index,question){change({questions:editor.questions.map((q,i)=>i===index?question:q)});}
  function move(index,step){
    const list=[...editor.questions];[list[index],list[index+step]]=[list[index+step],list[index]];change({questions:list});
  }
  async function workbook(file){
    if(!file)return;
    setBusy(true);setError('');
    try{
      const {questions}=await excel.upload('questions','preview',file);
      if(editor.questions.length&&!window.confirm('Replace the questions in this draft with the workbook?'))return;
      change({questions});
    }catch(failure){setError(failure.message);}finally{setBusy(false);}
  }
  async function template(){try{downloadBlob(await excel.download('questions','template'),'survey-questions-template.xlsx');}catch(failure){setError(failure.message);}}
  return <><Notice error={error} success={success}/>
    {editor&&<Panel title={editor.id?'Edit Survey Draft':'New Survey Draft'} icon="surveys">
      <form className="editor" onSubmit={save}>
        <Field label="Survey name"><input required maxLength={120} value={editor.title} onChange={e=>change({title:e.target.value})}/></Field>
        <div className="form-grid">
          <Field label="Start date (inclusive)"><input type="date" value={editor.startDate||''} onChange={e=>change({startDate:e.target.value})}/></Field>
          <Field label="End date (inclusive)"><input type="date" min={editor.startDate||undefined} value={editor.endDate||''} onChange={e=>change({endDate:e.target.value})}/></Field>
          <AudiencePicker label="Regions" selected={editor.regions} onChange={values=>change({regions:values})} load={loadRegions} placeholder="Find a region"/>
          <AudiencePicker label="Outlets" selected={editor.stores} onChange={values=>change({stores:values})} load={surveys.outlets} placeholder="Search by name, outlet ID or phone"/>
        </div>
        <p className="muted">Dates use India time. When both regions and outlet IDs are selected, a store must match both. Store-specific campaigns take priority over regional campaigns.</p>
        <div className="actions"><button className="ghost" type="button" onClick={template}>Question template</button>
          <label className="button file-button">Upload questions <input type="file" accept=".xlsx" disabled={busy} onChange={e=>{workbook(e.target.files[0]);e.target.value='';}}/></label></div>
        {editor.questions.map((q,index)=><Question key={index} q={q} index={index} questions={editor.questions} update={value=>replace(index,value)}
          move={step=>move(index,step)} remove={()=>change({questions:editor.questions.filter((_,i)=>i!==index)})}
          duplicate={()=>change({questions:editor.questions.flatMap((item,i)=>i===index?[item,{...item,id:blank().id}]:[item])})}/>)}
        <div className="actions"><button type="button" className="ghost" onClick={()=>change({questions:[...editor.questions,blank()]})}>＋ Add question</button>
          <button className="button" disabled={busy||!editor.questions.length}>Save draft</button><button className="ghost" type="button" onClick={()=>setEditor(null)}>Cancel</button></div>
      </form>
    </Panel>}
    <Panel title="Survey Campaigns" icon="surveys" action={<button className="button" disabled={!defaults.data||busy} onClick={()=>open(null)}>＋ New survey</button>}>
      <LoadState resource={campaigns}/><LoadState resource={defaults}/>
      <RecordCount total={campaigns.data?.total}/><Table columns={['Survey','Audience','Dates','Questions','Status','Actions']}>{campaigns.data?.items.map(row=><tr key={row.id}>
        <td><strong>{row.title}</strong></td><td>{row.regions.join(', ')||'All regions'}<small>{row.stores.length?row.stores.join(', '):'All stores in scope'}</small></td>
        <td>{row.startDate?formatDate(row.startDate,dateFormat):'Any start'} – {row.endDate?formatDate(row.endDate,dateFormat):'No end'}</td>
        <td>{row.questions.length}</td><td><Badge tone={row.status==='published'?'green':'purple'}>{row.status}</Badge></td>
        <td><div className="actions">{row.status==='draft'?<><button className="ghost" onClick={()=>open(row)}>Edit</button><button className="button" disabled={busy} onClick={()=>transition(row,'publish')}>Publish</button></>:
          <><button className="ghost" onClick={()=>open(row,true)}>Duplicate</button>{row.status==='published'&&<button className="ghost danger" disabled={busy} onClick={()=>transition(row,'archive')}>Archive</button>}</>}</div></td>
      </tr>)}</Table>
      {campaigns.data?.items.length===0&&<Empty>No campaigns yet. Create a draft from the default questions.</Empty>}
      <Pager page={page} setPage={setPage} total={campaigns.data?.total} busy={campaigns.busy} hasMore={campaigns.data?.hasMore}/>
    </Panel></>;
}
