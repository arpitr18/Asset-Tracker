import {formatTrackerDate,useRuntime} from '../../services/runtime';
import React,{useState} from 'react';
import {View,Text,Pressable,StyleSheet} from 'react-native';
import {Panel,Fact,Button,styles} from './Ui';
import {C} from '../../theme';
import {SalesLineChart} from './SalesLineChart';
import {PeriodPicker} from './PeriodPicker';

const modes={Monthly:1,Quarterly:3,Yearly:12};
export const money=value=>'₹'+value.toLocaleString('en-IN',{maximumFractionDigits:2});
const monthNumber=date=>date.getUTCFullYear()*12+date.getUTCMonth();
function label(index,span) {
  const year=Math.floor(index/12), month=index%12;
  if(span===12)return String(year);
  if(span===3)return 'Q'+(1+Math.floor(month/3))+' '+year;
  return new Date(Date.UTC(year,month,1)).toLocaleDateString('en-IN',{month:'short',year:'numeric',timeZone:'UTC'});
}
export function Sales({records,growth=[]}) {
  const {dateFormat}=useRuntime();
  const [mode,setMode]=useState('Monthly'),[offset,setOffset]=useState(0);
  const span=modes[mode], current=Math.floor(monthNumber(new Date())/span)*span;
  const selected=current+offset*span;
  const ytdGrowth=growth.find(row=>row.year===Math.floor(selected/12))?.growth;
  const buckets=new Map();
  for(const sale of records) {
    const key=Math.floor(monthNumber(new Date(sale.period))/span)*span;
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push(sale);
  }
  const rows=buckets.get(selected)||[];
  const total=key=>buckets.get(key)?.reduce((sum,r)=>sum+Number(r.amount),0);
  const now=total(selected), previous=total(selected-span);
  const points=Array.from({length:6},(_,i)=>{
    const id=selected-(5-i)*span;
    return {id,label:label(id,span),value:total(id)};
  });
  return <>
    <Panel title="Sales summary" icon="chart-bar">
      <View style={styles.row}>{Object.keys(modes).map(m=><Pressable key={m} accessibilityRole="tab" accessibilityState={{selected:m===mode}} style={[s.mode,m===mode&&s.active]} onPress={()=>{setMode(m);setOffset(0);}}><Text style={[styles.buttonText,m===mode&&s.white]}>{m}</Text></Pressable>)}</View>
      {span===12?<View style={s.selector}><Button label="‹" onPress={()=>setOffset(offset-1)}/><Text style={styles.heading}>{label(selected,span)}</Text><Button label="›" disabled={offset>=0} onPress={()=>setOffset(offset+1)}/></View>:
        <PeriodPicker span={span} selected={selected} current={current} title={label(selected,span)} onSelect={period=>setOffset((period-current)/span)}/>}
      <Fact label="Recorded sales" value={now==null?'No records':money(now)}/>
      <Fact label="Previous period" value={previous==null?'No records':money(previous)}/>
      {now!=null&&previous!=null&&<Fact label="Change" value={money(now-previous)}/>}
      {ytdGrowth!=null&&<Fact label="Reported YTD growth" value={String(ytdGrowth)}/>}
    </Panel>
    <Panel title="Sales trend" icon="chart-timeline-variant">
      {points.some(point=>point.value!=null)?
        <SalesLineChart points={points} selected={selected} format={money} onSelect={id=>setOffset((id-current)/span)}/>:
        <Text style={styles.muted}>No reported sales in these six periods.</Text>}
    </Panel>
    <Panel title="Sales breakdown" icon="format-list-bulleted">
      {rows.length?rows.map(r=><Fact key={r.period} label={formatTrackerDate(r.period,dateFormat,false,'UTC')} value={money(Number(r.amount))}/>):<Text style={styles.muted}>No sales entries for {label(selected,span)}.</Text>}
      {records.some(r=>monthNumber(new Date(r.period))<current+span)&&<Button label="Latest reported period" onPress={()=>setOffset(Math.floor(monthNumber(new Date(records.find(r=>monthNumber(new Date(r.period))<current+span).period))/span)-current/span)}/>}
    </Panel>
  </>;
}
const s=StyleSheet.create({mode:{flex:1,minHeight:38,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:C.lavender},active:{backgroundColor:C.purple},white:{color:'white'},selector:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}});
