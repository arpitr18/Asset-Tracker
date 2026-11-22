import {Link} from 'react-router-dom';
import React from 'react';
import {settings} from '../services/settings.js';
import {users} from '../services/users.js';
import {surveys} from '../services/surveys.js';
import {excel} from '../services/excel.js';
import {useResource} from '../lib/useResource.js';
import {formatDate} from '../utils/format.js';
import {Badge,Empty,Icon,LoadState,Panel,Table} from '../components/Ui.jsx';

const sampleUsers=signal=>users.list('',1,signal);
const metrics=[['users','Total Users','users'],['stores','Store Records','stores'],['assets','Total Assets','assets'],['surveys','Submitted Surveys','surveys'],['imports','Excel Imports Today','imports'],['stockists','Redistributor Stockists','stockists']];
export function Activity({items,dateFormat}){
  return items.length?<ol className="timeline">{items.map(event=><li key={event.id}><strong>{event.name||'System'} · {event.action}</strong>
    {event.details?.summary&&<span>{event.details.summary}</span>}<small>{formatDate(event.createdAt,dateFormat,true)}</small></li>)}</ol>:<Empty>No recorded admin activity.</Empty>;
}
function Trend({daily}){
  const maximum=Math.max(1,...daily.map(row=>row.count));
  const points=daily.map((row,index)=>[index*28+8,83-row.count/maximum*66]);
  const line=points.map(point=>point.join(',')).join(' ');
  return <div className="trend">
    <svg role="img" aria-label={'Daily survey submissions: '+daily.map(row=>row.day+' '+row.count).join(', ')} viewBox="0 0 380 95">
      {[17,39,61,83].map(y=><line key={y} x1="8" x2="374" y1={y} y2={y} stroke="#e9def6"/>)}
      <polygon points={'8,83 '+line+' 372,83'} fill="#f0e1ff"/><polyline points={line} fill="none" stroke="#6a13aa" strokeWidth="2.5"/>
      {points.map(([x,y],index)=><circle key={x} cx={x} cy={y} r="3" fill="white" stroke="#6a13aa" strokeWidth="2"><title>{daily[index].day}: {daily[index].count}</title></circle>)}
    </svg>
    <div className="chart-labels"><span>{daily[0]?.day.slice(0,10)}</span><span>{daily.at(-1)?.day.slice(0,10)}</span></div>
  </div>;
}
function Donut({percent,tone,caption}){
  return <div className={'donut '+tone} style={{'--share':percent+'%'}}><div><strong>{percent}%</strong><small>{caption}</small></div></div>;
}
export function Dashboard({dateFormat}){
  const stats=useResource(settings.stats), accounts=useResource(sampleUsers), campaigns=useResource(surveys.list), defaults=useResource(surveys.defaults), imports=useResource(excel.imports);
  const data=stats.data;
  const totals=data?.totals;
  const mapped=totals?.stores?Math.round(totals.mapped/totals.stores*100):0;
  const inspected=data?.health.reduce((sum,row)=>sum+row.count,0)||0;
  const good=data?.health.find(row=>row.condition==='GOOD')?.count||0;
  const newest=campaigns.data?.items.find(row=>row.status==='published');
  const questionList=newest?.questions??defaults.data?.questions??[];
  return <><LoadState resource={stats}/>
    <div className="metrics">{metrics.map(([key,label,icon])=><div className="metric" key={key}><span className="icon-tile"><Icon name={icon} size={23}/></span>
      <div><strong>{label}</strong><b>{totals?.[key]?.toLocaleString('en-IN')??'—'}</b></div></div>)}</div>
    <div className="analytics">
      <Panel title="Store Coverage"><div className="donut-section"><Donut percent={mapped} caption="Mapped"/><div><h3>{totals?.mapped??'—'} / {totals?.stores??'—'}</h3><p>Stores with coordinates</p><small>{totals?totals.stores-totals.mapped:'—'} unmapped</small></div></div></Panel>
      <Panel title="Survey Activity · Last 14 Days"><h3>{data?.daily.reduce((sum,row)=>sum+row.count,0)??'—'} submissions</h3>{data&&<Trend daily={data.daily}/>}</Panel>
      <Panel title="Asset Health">{inspected?<div className="donut-section"><Donut percent={Math.round(good/inspected*100)} tone="green-ring" caption="Healthy"/><div><h3>{inspected} inspected</h3>{data.health.map(row=><p key={row.condition}>{row.condition.replaceAll('_',' ')} · {row.count}</p>)}</div></div>:<Empty>No inspection results recorded.</Empty>}</Panel>
    </div>
    <div className="dashboard-pair">
      <Panel title="User Management" icon="users" action={<Link className="button" to="/users">Manage users</Link>}>
        <LoadState resource={accounts}/><Table columns={['Name','Email','Role','Status']}>{accounts.data?.items.slice(0,5).map(user=><tr key={user.id}><td><strong>{user.name}</strong></td><td>{user.email}</td><td>{user.jobTitle||user.role}</td><td><Badge tone={user.enabled?'green':'red'}>{user.enabled?'Active':'Disabled'}</Badge></td></tr>)}</Table>
      </Panel>
      <Panel title="Survey Questions Management" icon="surveys" action={<Link className="button" to="/surveys">Open builder</Link>}>
        <LoadState resource={campaigns}/><p className="muted">{newest?.title||'Default questionnaire'}</p>
        <Table columns={['Question','Type','Required']}>{questionList.slice(0,4).map(q=><tr key={q.id}><td>{q.label}</td><td>{q.type}</td><td>{q.required?<Badge>Required</Badge>:'—'}</td></tr>)}</Table>
      </Panel>
    </div>
    <div className="analytics bottom-grid">
      <Panel title="Roles & Permissions" icon="users"><Table columns={['Role','Users','Access']}>{data?.roles.map(row=><tr key={row.role}><td>{row.role==='ADMIN'?'Super Admin':row.role}</td><td>{row._count}</td><td>{row.role==='ADMIN'?'Admin console and all territories':'Assigned territory'}</td></tr>)}</Table></Panel>
      <Panel title="Excel Import" icon="imports" action={<Link className="text-link" to="/imports">Open imports →</Link>}>
        <Link to="/imports" className="upload"><Icon name="imports" size={25}/><strong>Upload Excel file</strong><small>Validate stores or stockists before applying changes</small></Link>
        <LoadState resource={imports}/>{imports.data?.items.length?imports.data.items.slice(0,3).map(row=><p key={row.id}><strong>{row.filename}</strong><br/><small>{row.rowCount} rows · {row.kind}</small></p>):<Empty>No Excel imports recorded.</Empty>}
      </Panel>
      <Panel title="Audit Activity" icon="audit" action={<Link className="text-link" to="/audit">View activity →</Link>}><Activity items={data?.activity.slice(0,5)||[]} dateFormat={dateFormat}/></Panel>
    </div>
  </>;
}
