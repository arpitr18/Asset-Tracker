import {formatTrackerDate,useRuntime} from '../../services/runtime';
import React,{useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import {randomUUID} from 'expo-crypto';
import {useInfiniteQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {request} from '../../services/api';
import {Panel,Button,styles} from './Ui';

export function Visits({store}) {
  const {dateFormat}=useRuntime();
  const path='/stores/'+encodeURIComponent(store.outletUid)+'/activity/visits';
  const key=['visit-history',store.outletUid];
  const client=useQueryClient();
  const [draft,setDraft]=useState(null),[note,setNote]=useState('');
  const history=useInfiniteQuery({queryKey:key,initialPageParam:null,
    queryFn:({pageParam})=>request(path+(pageParam?'?cursor='+pageParam:'')),getNextPageParam:page=>page.nextCursor});
  const save=useMutation({mutationFn:()=>request(path,{method:'POST',body:JSON.stringify({id:draft,note:note.trim()})}),
    onSuccess:()=>{setDraft(null);setNote('');client.invalidateQueries({queryKey:key});client.invalidateQueries({queryKey:['store',store.outletUid]});}});
  const rows=history.data?.pages.flatMap(page=>page.items)||[];
  return <Panel title={'Visit history · '+store.visitCount} icon="calendar-clock">
    {draft?<><TextInput multiline maxLength={2000} value={note} onChangeText={setNote} editable={!save.isPending} placeholder="What happened during this visit?" style={styles.input}/>
    <View style={styles.row}><Button label={save.isPending?'Saving…':'Save visit'} disabled={!note.trim()||save.isPending} onPress={()=>save.mutate()}/><Button label="Cancel" disabled={save.isPending} onPress={()=>setDraft(null)}/></View></>:
    <Button label="Log visit" icon="map-marker-check-outline" onPress={()=>{save.reset();setNote('');setDraft(randomUUID());}}/>}
    {save.isError&&<Text style={styles.muted}>{save.error.message}</Text>}
    {rows.map(v=><View key={v.id} style={styles.panel}><Text style={styles.selected}>{formatTrackerDate(v.visitedAt,dateFormat,true)}</Text><Text style={styles.heading}>{v.employee}</Text>
    {v.condition&&<Text style={styles.muted}>{v.condition.replace(/_/g,' ')}</Text>}<Text style={styles.muted}>{v.note||v.observations||'No visit notes.'}</Text></View>)}
    {history.isError?<Button label="Retry visit history" onPress={()=>history.refetch()}/>:!rows.length&&<Text style={styles.muted}>{history.isPending?'Loading visits…':'No visits recorded yet.'}</Text>}
    {history.hasNextPage&&<Button label="View older visits" disabled={history.isFetchingNextPage} onPress={()=>history.fetchNextPage()}/>}
  </Panel>;
}
