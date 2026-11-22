export function formatDate(value,pattern='DD MMM YYYY',time=false){
  if(!value)return '—';
  const date=new Date(value);
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-IN',{
    timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(date).map(part=>[part.type,part.value]));
  const month=new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',month:'short'}).format(date);
  const label=pattern.replace(/YYYY|MMM|MM|DD/g,token=>({YYYY:parts.year,MMM:month,MM:parts.month,DD:parts.day})[token]);
  return time?label+' · '+new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',hour:'numeric',minute:'2-digit'}).format(date):label;
}
export function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=filename;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
