import {FormScrollView} from '../components/FormScrollView';
import {SurveyEvidence} from '../features/store/SurveyEvidence';
import {formatTrackerDate,useRuntime} from '../services/runtime';
import React, {useEffect,useRef,useState} from 'react';
import {Alert,Image,Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CameraView,useCameraPermissions} from 'expo-camera';
import * as Location from 'expo-location';
import {randomUUID} from 'expo-crypto';
import {Directory} from 'expo-file-system';
import {MaterialCommunityIcons as Icon} from '@expo/vector-icons';
import {useInfiniteQuery,useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {TabSurface} from '../components/TabSurface';
import {Panel,Button,styles} from '../features/store/Ui';
import {request} from '../services/api';
import {selectPhoto} from '../services/photos';
import {C} from '../theme';

const base='/field-surveys';
function Action({label,tone,onPress,disabled}){
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
    style={[s.action,s[tone],disabled&&s.disabled]}>
    <Text style={[s.actionText,s[tone+'Text']]}>{label}</Text>
  </Pressable>;
}
function distance(gps,store){
  if(!gps||!store||store.latitude==null||store.longitude==null)return null;
  const r=Math.PI/180;
  const h=Math.sin((store.latitude-gps.latitude)*r/2)**2+Math.cos(gps.latitude*r)*Math.cos(store.latitude*r)*Math.sin((store.longitude-gps.longitude)*r/2)**2;
  return 12742000*Math.asin(Math.sqrt(Math.min(1,h)));
}
function Photo({label,value,onChange,onView}){
  const [busy,setBusy]=useState(false);
  async function capture(){
    setBusy(true);
    try{const image=await selectPhoto(true);if(image)onChange(image);}
    catch(error){Alert.alert(label,error.message);}
    finally{setBusy(false);}
  }
  return <View style={s.photoRow}><View style={s.grow}><Button label={busy?'Opening camera…':label} icon="camera-outline" disabled={busy} onPress={capture}/></View>
    {value&&<View style={s.photoActions}><Action label="View" tone="blue" onPress={()=>onView(value)}/>
      <Action label="Delete" tone="red" onPress={()=>onChange(null)}/></View>}
  </View>;
}

export function FieldSurveyScreen(){
  const client=useQueryClient();
  const {dateFormat,surveyRadiusMeters}=useRuntime();
  const [gps,setGps]=useState(null),[locating,setLocating]=useState(false);
  const [store,setStore]=useState(null),[search,setSearch]=useState(''),[warning,setWarning]=useState(null),[confirmed,setConfirmed]=useState(false);
  const [storePhoto,setStorePhoto]=useState(null),[assetPhoto,setAssetPhoto]=useState(null),[preview,setPreview]=useState(null);
  const [evidence,setEvidence]=useState({});
  const form=useQuery({queryKey:['field-form',store?.outletUid],enabled:!!store,staleTime:0,refetchInterval:15000,
    queryFn:({signal})=>request(base+'/form?'+new URLSearchParams({store:store.outletUid}),{signal})});
  const [answers,setAnswers]=useState({}),[validation,setValidation]=useState(null),[tag,setTag]=useState(false);
  const [scanning,setScanning]=useState(false),[checking,setChecking]=useState(false),[historyOpen,setHistoryOpen]=useState(false);
  const [,askCamera]=useCameraPermissions();
  const scanLock=useRef(false), id=useRef(randomUUID());
  const loadedForm=useRef(null);
  const [formNotice,setFormNotice]=useState('');
  useEffect(()=>{
    if(!form.data||!store)return;
    const previous=loadedForm.current;
    loadedForm.current={store:store.outletUid,id:form.data.id};
    if(previous?.store===store.outletUid&&previous.id!==form.data.id){
      setAnswers({});setEvidence({});setAssetPhoto(null);setValidation(null);setTag(false);
      setFormNotice('The published questionnaire changed. Review the new questions below.');
    }
  },[form.data,store]);
  const lookup=useInfiniteQuery({queryKey:['field-stores',search.trim()],enabled:!store&&search.trim().length>=2,initialPageParam:null,
    queryFn:({signal,pageParam})=>request(base+'/stores?'+new URLSearchParams({q:search.trim(),...(pageParam&&{after:pageParam})}),{signal}),
    getNextPageParam:rows=>rows.length===10?rows.at(-1).outletUid:undefined});
  const history=useInfiniteQuery({queryKey:['field-history'],enabled:historyOpen,initialPageParam:null,
    queryFn:({pageParam})=>request(base+'/history'+(pageParam?'?'+new URLSearchParams({before:pageParam.visitedAt,beforeId:pageParam.id}):'')),
    getNextPageParam:rows=>rows.length===10?rows.at(-1):undefined});
  function resetDraft(){
    loadedForm.current=null;setFormNotice('');
    setEvidence({});
    id.current=randomUUID();
    setGps(null);setStore(null);setSearch('');setConfirmed(false);setWarning(null);
    setStorePhoto(null);setAssetPhoto(null);setPreview(null);
    setAnswers({});setTag(false);setValidation(null);
  }
  const save=useMutation({mutationFn:()=>{
    const responseAnswers=Object.fromEntries(questions.flatMap(q=>{
      const value=answers[q.id];
      if(q.type==='number'){
        if(value==null||String(value).trim()==='')return [];
        if(!Number.isFinite(Number(value)))throw new Error('Enter a valid number for '+q.label);
        return [[q.id,Number(value)]];
      }
      return value==null||q.type==='description'?[]:[[q.id,value]];
    }));
    const files=Object.fromEntries(questions.filter(q=>evidence[q.id]).map(q=>[q.id,evidence[q.id]]));
    const body=JSON.stringify({
    id:id.current,store:store.outletUid,latitude:gps.latitude,longitude:gps.longitude,storePhoto,assetPhoto:assetPhoto||undefined,confirmed,tag,answers:responseAnswers,formId:form.data.id,evidence:files
    });
    if(body.length>5800000)throw new Error('This survey has too many large photos or files. Remove or replace some attachments.');
    return request(base,{method:'POST',body});
  },onError:()=>form.refetch(),onSuccess:()=>{
    client.invalidateQueries();
    resetDraft();Alert.alert('Survey submitted');
  }});
  function checkLocation(selected,coords){
    setConfirmed(false);setWarning(null);
    if(selected&&coords){
      const meters=distance(coords,selected);
      if(meters===null||meters>surveyRadiusMeters)setWarning({meters,name:selected.outletName});
    }
  }
  async function locate(){
    setLocating(true);
    try{
      if(!(await Location.requestForegroundPermissionsAsync()).granted)throw new Error('Allow location access to capture store GPS.');
      const point=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
      setGps(point.coords);checkLocation(store,point.coords);
    }catch(error){Alert.alert('Store GPS',error.message);}
    finally{setLocating(false);}
  }
  function choose(row){
    loadedForm.current=null;setFormNotice('');
    setStore(row);setSearch(row.outletCodeRd||row.outletUid);checkLocation(row,gps);
    setValidation(null);setTag(false);setAssetPhoto(null);setAnswers({});setEvidence({});
  }
  function answer(key,value){setAnswers(previous=>({...previous,[key]:value}));}
  function clearStore(){
    loadedForm.current=null;setFormNotice('');
    setStore(null);setSearch('');setConfirmed(false);setWarning(null);
    setValidation(null);setTag(false);setAssetPhoto(null);setAnswers({});setEvidence({});
  }
  async function downloadPhoto(){
    try {
      const folder=await Directory.pickDirectoryAsync();
      const file=folder.createFile('store-survey-'+randomUUID()+'.jpg','image/jpeg');
      file.write(preview,{encoding:'base64'});
      Alert.alert('Photo saved',file.name);
    } catch(error){
      if(!/cancel|dismiss/i.test(error.message))Alert.alert('Unable to save photo',error.message);
    }
  }
  async function scan(){
    if(!store)return Alert.alert('Select a store first');
    const permission=await askCamera();
    if(!permission.granted)return Alert.alert('Allow camera access to scan the barcode');
    scanLock.current=false;setScanning(true);
  }
  async function scanned(data){
    if(scanLock.current)return;
    scanLock.current=true;setScanning(false);setChecking(true);setTag(false);setValidation(null);
    answer(activeAsset.id,null);
    try{
      const value=data.trim();
      const result=await request(base+'/asset?'+new URLSearchParams({store:store.outletUid,code:value}));
      answer(activeAsset.id,value);setValidation(result.status);
    }catch(error){Alert.alert('Scan failed',error.message);}
    finally{setChecking(false);}
  }
  const visibleIds=new Set();
  const questions=(form.data?.questions||[]).filter(q=>{
    if(q.when&&(!visibleIds.has(q.when)||answers[q.when]!==true))return false;
    visibleIds.add(q.id);return true;
  });
  const activeAsset=questions.find(q=>q.type==='asset');
  const status={validated:['Validated','#167643','#E9F8EF'],wrong:['Not at the correct store','#8D590E','#FFF2D9'],missing:['Asset not found','#A12239','#FCE8ED']}[validation];
  const meters=distance(gps,store);
  const canSubmit=!!(gps&&store&&storePhoto&&form.isSuccess&&!locating&&!checking&&(confirmed||(meters!==null&&meters<=surveyRadiusMeters)));
  return <TabSurface><FormScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.inline}>
      <Text style={[s.title,s.grow]}>Store survey</Text>
      <Button label="Clear" disabled={locating||checking||save.isPending} onPress={()=>Alert.alert(
        'Clear survey draft?', 'This removes the current answers, photos, GPS and store selection.',
        [{text:'Cancel',style:'cancel'},{text:'Clear',style:'destructive',onPress:()=>{save.reset();resetDraft();}}]
      )}/>
    </View>
    <Panel title="Store location" icon="crosshairs-gps">
      <Button label={locating?'Finding location…':'Capture store GPS'} icon="crosshairs-gps" disabled={locating} onPress={locate}/>
      {gps&&<Text style={styles.muted}>Lat {gps.latitude.toFixed(6)} · Long {gps.longitude.toFixed(6)}</Text>}
    </Panel>
    <Panel title="Store photo" icon="camera-outline"><Photo label="Capture store photo" value={storePhoto} onChange={setStorePhoto} onView={setPreview}/></Panel>
    <Panel title="Select store" icon="store-search-outline">
      {store?<><View style={s.inline}><Text style={[styles.heading,s.grow]}>{store.outletName}</Text>
        <Button label="Clear" disabled={checking||save.isPending} onPress={clearStore}/></View>
        {meters!==null&&<Text style={styles.muted}>{Math.round(meters)} m from recorded location{confirmed?' · confirmed':''}</Text>}
        </>:
        <><TextInput accessibilityLabel="Store ID or phone number" autoCapitalize="characters" maxLength={120} placeholder="Store ID or phone number" value={search} onChangeText={setSearch} style={s.input}/>
          {lookup.data?.pages.flat().map(row=><Pressable key={row.outletUid} onPress={()=>choose(row)} style={s.option}>
            <Text style={styles.heading}>{row.outletName}</Text><Text style={styles.muted}>{row.outletCodeRd||row.outletUid}</Text></Pressable>)}
          {lookup.isFetching&&<Text style={styles.muted}>Searching…</Text>}
          {lookup.isError&&<Button label="Retry store search" onPress={()=>lookup.refetch()}/>}
          {lookup.hasNextPage&&<Button label="Load more stores" disabled={lookup.isFetchingNextPage} onPress={()=>lookup.fetchNextPage()}/>}
          {lookup.data?.pages[0].length===0&&<Text style={styles.muted}>No matching stores.</Text>}</>}
    </Panel>
    <Panel title={form.data?.title||"Questionnaire"} icon="clipboard-text-outline">
      {!!formNotice&&<Text style={styles.muted}>{formNotice}</Text>}
      {!store&&<Text style={styles.muted}>Select a store to load its questionnaire.</Text>}
      {store&&form.isPending&&<Text style={styles.muted}>Loading questions…</Text>}
      {form.isError&&<Button label="Retry questions" onPress={()=>form.refetch()}/>}
      {questions.map(q=><View style={s.question} key={q.id}>
        <Text style={styles.heading}>{q.label}{q.required&&q.type!=='description'?' *':''}</Text>
        {!!q.description&&<Text style={styles.muted}>{q.description}</Text>}
        {q.type==='number'&&<TextInput keyboardType="decimal-pad" accessibilityLabel={q.label} maxLength={24} style={s.input} value={answers[q.id]??''} onChangeText={value=>answer(q.id,value)}/>}
        {q.type==='text'&&<TextInput multiline maxLength={2000} style={styles.input} value={answers[q.id]||''} onChangeText={value=>answer(q.id,value)}/>}
        {['yesno','single','multi'].includes(q.type)&&(q.type==='yesno'?[true,false]:q.options||[]).map(value=>{
          const multi=q.type==='multi', values=Array.isArray(answers[q.id])?answers[q.id]:[];
          const selected=multi?values.includes(value):answers[q.id]===value;
          return <Pressable key={String(value)} accessibilityRole={multi?'checkbox':'radio'} accessibilityState={{checked:selected}}
            style={s.choice} onPress={()=>answer(q.id,multi?(selected?values.filter(x=>x!==value):[...values,value]):value)}>
            <Text style={s.mark}>{multi?(selected?'☑':'☐'):(selected?'◉':'○')}</Text>
            <Text style={styles.muted}>{typeof value==='boolean'?(value?'Yes':'No'):value}</Text>
          </Pressable>;
        })}
        {q.type==='asset'&&<>
          <Button icon="barcode-scan" label={checking?'Checking barcode…':'Scan Mondelēz asset'} disabled={checking} onPress={scan}/>
          {answers[q.id]&&<Text style={styles.muted}>{answers[q.id]}</Text>}
          {status&&<Text style={[s.status,{color:status[1],backgroundColor:status[2]}]}>{tag?'Will be tagged when you submit':status[0]}</Text>}
          {validation==='missing'&&<Button label={tag?'Undo tag':'Tag to this store'} onPress={()=>setTag(!tag)}/>}
          <Photo label="Capture asset photo" value={assetPhoto} onChange={setAssetPhoto} onView={setPreview}/>
        </>}
        <SurveyEvidence question={q} value={evidence[q.id]} onView={setPreview}
          onChange={(kind,value)=>setEvidence(old=>({...old,[q.id]:{...old[q.id],[kind]:value}}))}/>
      </View>)}
    </Panel>
    {save.isError&&<Text style={s.error}>{save.error.message}</Text>}
    <View style={s.actionRow}>
      <Action label={save.isPending?'Submitting…':'Submit survey'} tone="submit" disabled={!canSubmit||save.isPending} onPress={()=>save.mutate()}/>
      <Action label="View history" tone="secondary" onPress={()=>setHistoryOpen(true)}/>
    </View>
  </FormScrollView>
  <Modal visible={!!warning} transparent animationType="fade" onRequestClose={()=>{setWarning(null);setStore(null);setSearch('');}}>
    <View style={s.overlay}><View style={s.dialog}>
      <Text style={s.title}>Are you at the correct store?</Text>
      <Text style={styles.muted}>{warning?.meters==null?'This store does not have recorded coordinates.':`You are ${Math.round(warning.meters)} m away from ${warning.name}. The accepted distance is ${surveyRadiusMeters} m.`}</Text>
      <View style={s.actionRow}>
        <Action label="Yes, continue" tone="green" onPress={()=>{setConfirmed(true);setWarning(null);}}/>
        <Action label="Choose another store" tone="red" onPress={()=>{setWarning(null);setStore(null);setSearch('');}}/>
      </View>
    </View></View>
  </Modal>
  <Modal visible={scanning} onRequestClose={()=>setScanning(false)}><SafeAreaView style={s.modal}>
    <Button label="Close scanner" onPress={()=>setScanning(false)}/>
    {scanning&&<CameraView style={s.fill} barcodeScannerSettings={{barcodeTypes:['qr','code128','code39','ean13','ean8','upc_a','upc_e','itf14','datamatrix','pdf417','codabar','code93','aztec']}} onBarcodeScanned={({data})=>scanned(data)}/>}
  </SafeAreaView></Modal>
  <Modal visible={!!preview} onRequestClose={()=>setPreview(null)}><SafeAreaView style={s.modal}>
    <View style={styles.row}><Button label="Close photo" onPress={()=>setPreview(null)}/><Button label="Download photo" icon="download-outline" onPress={downloadPhoto}/></View>
    {preview&&<Image source={{uri:'data:image/jpeg;base64,'+preview}} resizeMode="contain" style={s.fill}/>}
  </SafeAreaView></Modal>
  <Modal visible={historyOpen} onRequestClose={()=>setHistoryOpen(false)}><SafeAreaView style={s.modal}>
    <View style={s.inline}><Text style={[s.title,s.grow]}>Survey history</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Close survey history" onPress={()=>setHistoryOpen(false)} style={s.close}>
        <Icon name="close" size={24} color={C.purple}/>
      </Pressable></View>
    <ScrollView contentContainerStyle={s.page}>
      {history.data?.pages.flat().map(row=><Panel key={row.id} title={row.outletName} icon="clipboard-check-outline">
        <Text style={styles.muted}>{row.outletUid} · {formatTrackerDate(row.visitedAt,dateFormat,true)}</Text>
        {Object.entries(row.answers).map(([key,item])=><Text key={key} style={styles.muted}>{item.label}: {typeof item.value==='boolean'?(item.value?'Yes':'No'):Array.isArray(item.value)?item.value.join(', '):item.value}</Text>)}
      </Panel>)}
      {history.isPending&&<Text style={styles.muted}>Loading history…</Text>}
      {history.isError&&<Button label="Retry history" onPress={()=>history.refetch()}/>}
      {history.data?.pages[0].length===0&&<Text style={styles.muted}>No submitted surveys yet.</Text>}
      {history.hasNextPage&&<Button label="Load older surveys" disabled={history.isFetchingNextPage} onPress={()=>history.fetchNextPage()}/>}
    </ScrollView>
  </SafeAreaView></Modal>
  </TabSurface>;
}
const s=StyleSheet.create({
  page:{padding:16,gap:12},title:{fontSize:23,fontWeight:'800',color:C.deep},
  input:{height:46,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:12,color:C.deep},
  question:{gap:8,borderTopWidth:1,borderColor:C.line,paddingTop:10},
  option:{padding:10,backgroundColor:C.pale,borderRadius:10},choice:{flexDirection:'row',gap:9,alignItems:'center',minHeight:36},
  mark:{color:C.mid,fontSize:23},status:{padding:9,borderRadius:8,fontWeight:'700'},error:{color:C.red},
  actionRow:{flexDirection:'row',alignItems:'stretch',gap:8,width:'100%'},
  inline:{flexDirection:'row',alignItems:'center',gap:8},grow:{flex:1,minWidth:0},
  photoRow:{flexDirection:'row',alignItems:'center',gap:10},
  photoActions:{width:80,height:96,gap:8},close:{width:44,height:44,alignItems:'center',justifyContent:'center'},
  action:{flex:1,minHeight:44,borderRadius:12,padding:8,alignItems:'center',justifyContent:'center'},
  actionText:{fontWeight:'800',fontSize:13,textAlign:'center'},
  submit:{backgroundColor:C.purple},submitText:{color:C.white},disabled:{opacity:.45},
  secondary:{backgroundColor:C.lavender},secondaryText:{color:C.purple},
  blue:{backgroundColor:'#E4F0FF'},blueText:{color:'#245D94'},
  green:{backgroundColor:'#E9F8EF'},greenText:{color:'#167643'},
  red:{backgroundColor:'#FCE8ED'},redText:{color:'#A12239'},
  overlay:{flex:1,backgroundColor:'#210A3D77',justifyContent:'center',padding:18},
  dialog:{padding:18,borderRadius:18,backgroundColor:C.white,gap:12},modal:{flex:1,padding:12,backgroundColor:C.pale,gap:8},
  fill:{flex:1,width:'100%'},
});
