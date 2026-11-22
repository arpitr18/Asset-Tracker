import React from 'react';
const paths={
  eye:'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  eyeOff:'m3 3 18 18M10.6 6.2 12 6c6.5 0 10 6 10 6a15 15 0 0 1-3 3.5M6.3 6.3A17 17 0 0 0 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.8-.7',
  trash:'M3 6h18M8 6V3h8v3m3 0-1 15H6L5 6m5 4v7m4-7v7',
  dashboard:'M3 10 12 3l9 7v10h-6v-6H9v6H3z',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m17 0v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4-4a4 4 0 0 1 0 8',
  stores:'M3 10 5 4h14l2 6M3 10v10h18V10M3 10h18M9 20v-6h6v6',
  surveys:'M8 5H5v16h14V5h-3M8 3h8v5H8zM8 12h8m-8 4h8',
  stockists:'M12 22s7-6 7-13A7 7 0 0 0 5 9c0 7 7 13 7 13Zm0-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  imports:'M12 15V3m-5 5 5-5 5 5M4 15v5h16v-5',
  settings:'M4 7h16M4 17h16M8 4v6m8 4v6',
  assets:'m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4m-9 4v10',
  audit:'M6 3h12v18H6zM9 8h6m-6 4h6m-6 4h4',
  search:'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5',
};
export function Icon({name,size=20}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.audit}/></svg>;}
export function Panel({title,icon,action,children,className=''}){return <section className={'panel '+className}><header className="panel-head"><div className="panel-title">{icon&&<span className="icon-tile"><Icon name={icon}/></span>}<h2>{title}</h2></div>{action}</header>{children}</section>;}
export function Notice({error,success}){return error?<p className="notice error" role="alert">{error}</p>:success?<p className="notice success" role="status">{success}</p>:null;}
export function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>;}
export function Badge({children,tone='purple'}){return <span className={'badge '+tone}>{children}</span>;}
export function LoadState({resource}){return <><Notice error={resource.error}/>{resource.busy&&<p className="muted" role="status">Loading…</p>}</>;}
export function Empty({children}){return <p className="empty">{children}</p>;}
export function Table({columns,children}){return <div className="table-wrap"><table><thead><tr>{columns.map(column=><th key={column}>{column}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;}
