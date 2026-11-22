import React,{useState} from 'react';
import {View,Text,TextInput,Image,StyleSheet} from 'react-native';
import {MaterialCommunityIcons as Icon} from '@expo/vector-icons';
import {randomUUID} from 'expo-crypto';
import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {selectPhoto} from '../../services/photos';
import {request} from '../../services/api';
import {C} from '../../theme';
import {Panel,Fact,Button,styles} from './Ui';

export function AssetCard({asset,storeId}) {
  const client=useQueryClient();
  const key=['asset-reports',storeId,asset.assetCode];
  const path='/stores/'+encodeURIComponent(storeId)+'/activity/assets/'+encodeURIComponent(asset.assetCode);
  const reports=useQuery({queryKey:key,queryFn:()=>request(path)});
  const [draft,setDraft]=useState(null),[note,setNote]=useState(''),[condition,setCondition]=useState('GOOD');
  const [message,setMessage]=useState('');
  const save=useMutation({mutationFn:async()=>{
    if(draft.type==='survey')return request('/surveys',{method:'POST',body:JSON.stringify({idempotencyKey:draft.id,outletUid:storeId,assetCode:asset.assetCode,condition,observations:note})});
    return request(path,{method:'POST',body:JSON.stringify(draft.type==='photo'?{id:draft.id,photo:draft.photo}:{id:draft.id,complaint:note.trim()})});
  },onSuccess:()=>{
    setMessage({survey:'Survey and visit recorded.',complaint:'Complaint recorded.',photo:'Photo saved.'}[draft.type]);
    setDraft(null);client.invalidateQueries({queryKey:key});client.invalidateQueries({queryKey:['store',storeId]});client.invalidateQueries({queryKey:['visit-history',storeId]});
  }});
  async function begin(type) {
    save.reset();setMessage('');setNote('');setCondition('GOOD');
    try {
      const photo=type==='photo'?await selectPhoto(true):null;
      if(type==='photo'&&!photo)return;
      setDraft({type,id:randomUUID(),photo});
    }catch(e){setMessage(e.message);}
  }
  const uri=draft?.photo?'data:image/jpeg;base64,'+draft.photo:reports.data?.photo;
  return <Panel title={asset.model||'Visi cooler'} icon="fridge-outline">
    {uri?<Image source={{uri}} resizeMode="contain" style={s.photo}/>:<View style={s.placeholder}><Icon name="fridge-outline" size={46} color={C.mid}/><Text style={styles.muted}>No asset photo</Text></View>}
    <Fact label="Asset code" value={asset.assetCode}/><Fact label="Manufacturer" value={asset.make}/>
    <Fact label="QR code" value={asset.qrCode}/><Fact label="Verified model" value={asset.modelVerified}/>
    <Fact label="Maintenance date" value={asset.pmDate?.slice(0,10)}/>
    {!draft?<View style={styles.row}><Button label="Raise complaint" onPress={()=>begin('complaint')}/><Button label="Capture image" onPress={()=>begin('photo')}/><Button label="Fill survey" onPress={()=>begin('survey')}/></View>:<>
    {draft.type==='survey'&&<><Text style={styles.selected}>Inspection condition</Text><View style={styles.row}>{['GOOD','NEEDS_SERVICE','DAMAGED'].map(v=><Button key={v} label={(condition===v?'✓ ':'')+v.replace(/_/g,' ')} onPress={()=>setCondition(v)}/>)}</View></>}
    {draft.type!=='photo'&&<TextInput multiline maxLength={2000} value={note} onChangeText={setNote} placeholder={draft.type==='survey'?'Inspection notes':'Describe the issue'} style={styles.input}/>}
    <View style={styles.row}><Button label={save.isPending?'Saving…':'Save '+draft.type} disabled={save.isPending||(draft.type==='complaint'&&!note.trim())} onPress={()=>save.mutate()}/><Button label="Cancel" disabled={save.isPending} onPress={()=>setDraft(null)}/></View></>}
    {Boolean(message||save.error)&&<Text style={styles.selected}>{message||save.error.message}</Text>}
    {reports.isError&&<Button label="Retry asset history" onPress={()=>reports.refetch()}/>}
    {reports.data?.complaints.map(r=><Fact key={r.id} label="Complaint" value={r.complaint}/>)}
  </Panel>;
}
const s=StyleSheet.create({photo:{width:'100%',height:160,borderRadius:12,backgroundColor:C.pale},placeholder:{minHeight:90,borderRadius:12,backgroundColor:C.pale,alignItems:'center',justifyContent:'center',gap:3}});
