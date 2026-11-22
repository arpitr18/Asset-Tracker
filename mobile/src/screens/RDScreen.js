import React,{useState} from 'react';
import {Alert,FlatList,Linking,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MaterialCommunityIcons as Icon} from '@expo/vector-icons';
import {useInfiniteQuery,useQuery} from '@tanstack/react-query';
import {TabSurface} from '../components/TabSurface';
import {Button,Fact,Panel,styles} from '../features/store/Ui';
import {Sales} from '../features/store/Sales';
import {rdDirectory} from '../services/rdDirectory';
import {formatTrackerDate,useRuntime} from '../services/runtime';
import {C} from '../theme';

function RDContact({item}){
  const phone=item.phone?.replace(/[\s().-]/g,'');
  const address=item.address||[item.rdTown,item.state].filter(Boolean).join(', ');
  const open=(url,label)=>Linking.openURL(url).catch(()=>Alert.alert(label+' unavailable'));
  return <View style={s.row}>
    <Button icon="phone-outline" label="Call RD" disabled={!/^\+?[1-9]\d{5,14}$/.test(phone||'')}
      onPress={()=>open('tel:'+phone,'Dialer')}/>
    <Button icon="navigation-outline" label="Navigate" disabled={!address}
      onPress={()=>open('https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(address),'Maps')}/>
  </View>;
}

function Chip({label,selected,onPress,compact=false}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={[s.chip,compact&&s.compact,selected&&s.active]}>
    <Text style={[s.label,selected&&s.white]}>{label}</Text>
  </Pressable>;
}

function Identity({item,onPress}){
  const content=<>
    <View style={s.cardTitle}>
      <Icon name="warehouse" size={25} color={C.mid}/>
      <View style={s.grow}><Text style={styles.heading}>{item.rdName}</Text><Text style={styles.muted}>{item.firm||item.rdCode}</Text></View>
      {item.type&&<Text style={s.badge}>{item.type}</Text>}
      {onPress&&<Icon name="chevron-right" size={21} color={C.mid}/>}
    </View>
    {item.synthetic&&<Text style={s.demo}>Synthetic stockist</Text>}
    <View style={s.info}><Icon name="phone-outline" size={17} color={C.mid}/><Text style={styles.muted}>{item.phone||'Phone not provided'}</Text></View>
    <View style={s.info}><Icon name="map-marker-outline" size={17} color={C.mid}/><Text style={[styles.muted,s.grow]}>{item.address||[item.rdTown,item.state].filter(Boolean).join(', ')||'Address not provided'}</Text></View>
  </>;
  return onPress?<Pressable accessibilityRole="button" style={s.card} onPress={onPress}>{content}</Pressable>:<View style={s.card}>{content}</View>;
}

export function RDScreen({navigation}){
  const [branch,setBranch]=useState(''),[bsm,setBsm]=useState(''),[state,setState]=useState('');
  const [region,setRegion]=useState('');
  const [picker,setPicker]=useState(false);
  const options=useQuery({queryKey:['rd-options'],queryFn:({signal})=>rdDirectory.options(signal)});
  const geography=options.data?.geography?.[branch];
  const list=useInfiniteQuery({
    queryKey:['rd-directory',branch,bsm,region,state],initialPageParam:null,
    queryFn:({pageParam,signal})=>rdDirectory.list({branch,bsm,region,state,after:pageParam},signal),
    getNextPageParam:page=>page.next,
  });
  return <TabSurface>
    <FlatList contentContainerStyle={s.page} data={list.data?.pages.flatMap(page=>page.items)??[]} keyExtractor={item=>item.rdCode}
      ListHeaderComponent={<View style={s.filters}>
        <Text style={s.title}>Locate Mondelez RD</Text>
        {/* <Text style={styles.muted}>Redistributor stockists</Text> */}
        <Text style={styles.heading}>Geography</Text>
        <View style={s.row}>{['',...(options.data?.branches??['North','South','East','West'])].map(value=><Chip key={value} label={value||'All'} selected={branch===value&&!state}
          onPress={()=>{setBranch(value);setBsm('');setRegion('');setState('');}}/>)}</View>
        {!!geography?.bsm.length&&<><Text style={styles.heading}>BSM Area</Text>
          <View style={s.row}>{geography.bsm.map(value=><Chip key={value} label={branch+' '+value} selected={bsm===value}
            onPress={()=>{setBsm(bsm===value?'':value);setRegion('');}}/>)}</View></>}
        {!!geography?.regions.length&&<><Text style={styles.heading}>Region</Text>
          <ScrollView horizontal contentContainerStyle={s.regions}>
            {geography.regions.map(value=><Chip key={value} label={value} selected={region===value} compact
              onPress={()=>{setRegion(region===value?'':value);setBsm('');}}/>)}
          </ScrollView></>}
        <Text style={styles.heading}>Search by State</Text>
        <View style={s.stateRow}><Pressable accessibilityRole="button" style={s.statePicker} onPress={()=>setPicker(true)}>
          <Text numberOfLines={1} style={[styles.buttonText,s.grow]}>{state||'Select state'}</Text><Icon name="chevron-down" color={C.purple} size={20}/>
        </Pressable><Button label="Clear" disabled={!state} onPress={()=>setState('')}/></View>
        {/* <View style={s.listHeading}><Text style={styles.heading}>{branch||state?'Matching RDs':'List of All RDs'}</Text></View> */}
      </View>}
      renderItem={({item})=><Identity item={item} onPress={()=>navigation.navigate('RDDetails',{code:item.rdCode})}/>}
      ListEmptyComponent={list.isError?<Button label="Retry" onPress={()=>list.refetch()}/>:<Text style={styles.muted}>{list.isPending?'Loading stockists…':'No stockists match these filters.'}</Text>}
      ListFooterComponent={list.hasNextPage?<Button label="Load more" disabled={list.isFetchingNextPage} onPress={()=>list.fetchNextPage()}/>:null}/>
    <Modal visible={picker} animationType="slide" onRequestClose={()=>setPicker(false)}>
      <SafeAreaView style={s.modal}>
        <View style={s.stateRow}><Text style={s.title}>Select state</Text><Button label="Close" icon="close" onPress={()=>setPicker(false)}/></View>
        {options.isError&&<Button label="Retry states" onPress={()=>options.refetch()}/>}
        {options.isPending&&<Text style={styles.muted}>Loading states…</Text>}
        <FlatList data={['All states',...(options.data?.states??[])]} keyExtractor={item=>item}
          renderItem={({item})=><Pressable style={s.option} onPress={()=>{setState(item==='All states'?'':item);setBranch('');setBsm('');setRegion('');setPicker(false);}}>
            <Text style={styles.heading}>{item}</Text>{(state||'All states')===item&&<Icon name="check" size={20} color={C.mid}/>}</Pressable>}/>
      </SafeAreaView>
    </Modal>
  </TabSurface>;
}

export function RDDetailsScreen({navigation,route}){
  const [tab,setTab]=useState('Overview');
  const code=route.params.code;
  const {dateFormat}=useRuntime();
  const query=useQuery({queryKey:['rd-directory-detail',code],queryFn:({signal})=>rdDirectory.details(code,signal)});
  const sales=useQuery({queryKey:['rd-directory-sales',code],enabled:tab==='Sales'&&query.isSuccess,
    queryFn:({signal})=>rdDirectory.sales(code,signal)});
  const item=query.data;
  const master=item?.master;
  return <SafeAreaView style={s.screen} edges={['top','left','right']}>
    <View style={s.hero}><Pressable accessibilityRole="button" accessibilityLabel="Back" style={s.back} onPress={()=>navigation.goBack()}><Icon name="arrow-left" color={C.white} size={24}/></Pressable>
      <Text style={[s.title,s.white]}>Stockist Details</Text></View>
    <TabSurface><ScrollView contentContainerStyle={s.page}>
      {item?<><Identity item={item}/><RDContact item={item}/>
        <View style={s.row}>{['Overview','Sales'].map(value=><Chip key={value} label={value} selected={tab===value} onPress={()=>setTab(value)}/>)}</View>
        {tab==='Overview'?<Panel title="Stockist information" icon="information-outline">
          <Fact label="RD code" value={item.rdCode}/><Fact label="RD type" value={item.type}/>
          <Fact label="Firm" value={item.firm}/><Fact label="Branch" value={item.branch}/>
          <Fact label="BSM area" value={item.bsm?item.branch+' '+item.bsm:null}/><Fact label="State" value={item.state}/>
          <Fact label="Town" value={item.rdTown}/><Fact label="Region" value={item.region}/>
          <Fact label="ASM area" value={master?.ASMArea}/><Fact label="SO territory" value={master?.SOTerritory}/>
          <Fact label="Outlet count" value={master?.StoreCount}/><Fact label="PC count" value={master?.PCCount}/>
          {master?.RD_SST_SUBD&&<Fact label="RD / SST / SUBD" value={master.RD_SST_SUBD}/>}
          {master?.ActiveFrom&&<Fact label="Active from" value={formatTrackerDate(master.ActiveFrom,dateFormat,false,'UTC')}/>}
          {master?.TownClassName&&<Fact label="Town class" value={master.TownClassName}/>}
          {master?.Email_Id&&<Fact label="Email" value={master.Email_Id}/>}
          {master?.ASMName&&<Fact label="ASM" value={[master.ASMName,master.ASMContact].filter(Boolean).join(' · ')}/>}
          {master?.SEName&&<Fact label="SE" value={[master.SEName,master.SEContact].filter(Boolean).join(' · ')}/>}
        </Panel>:sales.isError?<Button label="Retry sales" onPress={()=>sales.refetch()}/>:sales.data?<Sales records={sales.data}/>:<Text style={styles.muted}>Loading RD sales…</Text>}</>:query.isError?<Button label="Retry details" onPress={()=>query.refetch()}/>:<Text style={styles.muted}>Loading stockist…</Text>}
    </ScrollView></TabSurface>
  </SafeAreaView>;
}

const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:C.purple},hero:{flexDirection:'row',alignItems:'center',padding:12,gap:8},
  back:{width:44,height:44,alignItems:'center',justifyContent:'center'},
  page:{padding:16,gap:12},filters:{gap:10},title:{fontSize:23,fontWeight:'800',color:C.deep},
  row:{flexDirection:'row',gap:6},chip:{flex:1,alignItems:'center',justifyContent:'center',minHeight:44,borderRadius:11,backgroundColor:C.lavender},
  regions:{flexDirection:'row',gap:6},compact:{flex:0,paddingHorizontal:12},
  active:{backgroundColor:C.purple},label:{fontWeight:'700',fontSize:12,color:C.purple},white:{color:C.white},
  stateRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
  statePicker:{flex:1,minWidth:0,minHeight:44,borderRadius:12,backgroundColor:C.lavender,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8},
  listHeading:{backgroundColor:'#F1E9F8',padding:12,borderRadius:10,marginTop:4},
  card:{borderWidth:1,borderColor:C.line,backgroundColor:C.white,borderRadius:16,padding:14,gap:8},
  cardTitle:{flexDirection:'row',alignItems:'center',gap:9},grow:{flex:1,minWidth:0},
  badge:{backgroundColor:C.lavender,color:C.purple,fontWeight:'800',padding:6,borderRadius:8},demo:{color:C.mid,fontSize:11,fontWeight:'700'},
  info:{flexDirection:'row',alignItems:'center',gap:7},modal:{flex:1,padding:16,backgroundColor:C.white},
  option:{minHeight:48,paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:C.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
});
