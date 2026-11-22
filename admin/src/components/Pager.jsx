import React from 'react';
export function Pager({page,setPage,hasMore,busy,total}){
  return <div className="actions pagination">
    <button type="button" className="ghost" disabled={page<=1||busy} onClick={()=>setPage(page-1)}>Previous</button>
    <small>Page {page} of {total==null?'?':Math.max(1,Math.ceil(total/10))}</small>
    <button type="button" className="ghost" disabled={!hasMore||busy} onClick={()=>setPage(page+1)}>Next</button>
  </div>;
}

export function RecordCount({total}){
  return <p className="muted" aria-live="polite">Total records: {total==null?'?':total.toLocaleString('en-IN')}</p>;
}
