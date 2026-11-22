import {FormScrollView} from '../components/FormScrollView';
import {formatTrackerDate,useRuntime} from '../services/runtime';
﻿import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { request } from '../services/api';
import { C } from '../theme';
import { Sales, money } from '../features/store/Sales';
import { AssetCard } from '../features/store/AssetCard';
import { Visits } from '../features/store/Visits';
import { Panel, Fact, Button, styles } from '../features/store/Ui';

const tabs = [
  ['Overview','home-outline'], ['Sales','chart-bar'],
  ['Assets','cube-outline'], ['Visits','calendar-check-outline'],
];

function Overview({ store }) {
  const {dateFormat}=useRuntime();
  const master=store.master??{};
  const date=value=>value&&formatTrackerDate(value,dateFormat,false,'UTC');
  const equipment=[
    ['Visi cooler',master.VisiCooler],['Installed on',date(master.visiDate)],
    ['Second visi cooler',master.VisiCooler2],['Second cooler installed',date(master.VisiDate2)],
    ['PP',master.PP],['PP date',date(master.DatePP)],['Mature VC',master['Mature VC']],
    ['CTU type',master['CTU Type']],['CatMan',master.CatMan],['Candy gum dispenser',master['Candy Gum Dispenser']],
    ['Barrows Hotzone Unit',master['Barrows Hotzone Unit']],['SMD',master.SMD],
  ].filter(([,value])=>value!=null&&value!=='');
  const month = new Date().toISOString().slice(0,7);
  const sales = store.sales.filter(row => row.period.startsWith(month));
  const metrics = [
    ['Sales this month', sales.length ? money(sales.reduce((sum,row)=>sum+Number(row.amount),0)) : 'No records'],
    ['Assigned coolers',store.assets.length], ['Recorded visits',store.visitCount],
    ['Last visit',store.visits[0] ? formatTrackerDate(store.visits[0].visitedAt,dateFormat) : 'None yet'],
  ];
  return <>
    <Panel title="Store overview" icon="storefront-outline"><View style={s.grid}>{metrics.map(([label,value])=>
      <View style={s.metric} key={label}><Text style={styles.muted}>{label}</Text><Text style={s.metricValue}>{value}</Text></View>
    )}</View></Panel>
    <Panel title="Store information" icon="information-outline">
      <Fact label="Outlet UID" value={store.outletUid}/><Fact label="Distributor" value={store.distributor?.rdName}/>
      <Fact label="Outlet code" value={master.OutletCode}/><Fact label="RD outlet code" value={store.outletCodeRd}/>
      <Fact label="Master year" value={master.Year}/><Fact label="RD code" value={master.RdCode||store.distributor?.rdCode}/>
      <Fact label="RD name" value={master.RDName||store.distributor?.rdName}/><Fact label="RD type" value={master.RDTYPE}/>
      <Fact label="Branch" value={store.territory?.branchName}/><Fact label="Region" value={store.territory?.regionName}/>
      <Fact label="ASM area" value={store.territory?.asmArea}/><Fact label="Territory" value={store.territory?.soTerritory}/>
      <Fact label="Locality" value={store.beatName}/><Fact label="State" value={store.state}/>
      <Fact label="Town" value={master.Town}/><Fact label="Town class" value={master.TownClass}/>
      <Fact label="Active from" value={date(master.ActiveFrom)}/><Fact label="Active to" value={date(master.Activeto)}/>
    </Panel>
    {!!Object.keys(master).length&&<Panel title="Channel and PC details" icon="clipboard-list-outline">
      <Fact label="RE" value={master.RE}/><Fact label="Wholesale type" value={master['Wholesale Type']}/>
      <Fact label="Sub stockist type" value={master['Sub Stockist Type']}/>
      <Fact label="PC code" value={master.PcCode}/><Fact label="PC UID" value={master.PcUID}/><Fact label="PC name" value={master.PcName}/>
    </Panel>}
    {!!equipment.length&&<Panel title="Equipment in Store Master" icon="fridge-outline">
      {equipment.map(([label,value])=><Fact key={label} label={label} value={value}/>)}
    </Panel>}
  </>;
}

function StoreActions({store}) {
  const number = store.phone?.replace(/[\s().-]/g,'');
  function call() {
    if (!/^\+?\d{6,15}$/.test(number || '')) return Alert.alert('Call store','No phone number is available for this outlet.');
    Linking.openURL('tel:'+number).catch(()=>Alert.alert('Unable to open the dialer'));
  }
  function navigate() {
    if (store.latitude==null || store.longitude==null) return Alert.alert('Navigate','This outlet has no coordinates.');
    Linking.openURL('https://www.google.com/maps/dir/?api=1&destination='+store.latitude+','+store.longitude)
      .catch(()=>Alert.alert('Unable to open maps'));
  }
  return <View style={s.actions}>
    <Pressable accessibilityRole="button" accessibilityLabel="Call store" onPress={call} style={[s.action,s.call]}>
      <Icon name="phone-outline" size={16} color="#24663D"/><Text style={[s.actionText,s.callText]}>Call</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Navigate to store" onPress={navigate} style={[s.action,s.navigate]}>
      <Icon name="navigation-outline" size={16} color="#245D94"/><Text style={[s.actionText,s.navigateText]}>Navigate</Text>
    </Pressable>
  </View>;
}

export function DetailsScreen({ navigation, route }) {
  const id = route.params.id;
  const [tab,setTab] = useState('Overview');
  const query = useQuery({queryKey:['store',id],queryFn:()=>request('/stores/'+encodeURIComponent(id))});
  const store = query.data;
  return <SafeAreaView style={s.safe} edges={['top','left','right']}>
    <FormScrollView keyboardShouldPersistTaps="handled" style={s.page} contentContainerStyle={s.scroll}>
      <LinearGradient colors={[C.purple,'#703297']} style={s.header}>
        <View style={s.brand}><Pressable accessibilityLabel="Back" onPress={navigation.goBack} style={s.back}><Icon name="arrow-left" size={24} color="white"/></Pressable>
        <Text style={s.wordmark}>Mondelēz</Text><Text style={s.product}>Visi Cooler{'\n'}Store Tracker</Text></View>
        <Text style={s.title}>Store Details</Text>
      </LinearGradient>
      <View style={s.body}>
      {store ? <>
        <View style={s.identity}><View style={s.storeIcon}><Icon name="storefront-outline" size={36} color={C.mid}/></View>
          <View style={s.flex}><Text style={s.name}>{store.outletName}</Text><Text style={styles.muted}>Store ID · {store.outletCodeRd||id}</Text>
          <View style={s.locality}><Icon name="map-marker-outline" size={16} color={C.mid}/><Text style={[styles.muted,s.flex]}>{[store.beatName,store.state].filter(Boolean).join(', ')||'Location unavailable'}</Text></View>
          {store.recordType==='Synthetic'&&<Text style={s.source}>Synthetic outlet</Text>}</View>
          <StoreActions store={store}/>
        </View>
        <View style={s.tabs}>{tabs.map(([name,icon])=><Pressable accessibilityRole="tab" accessibilityState={{selected:name===tab}} key={name} onPress={()=>setTab(name)} style={[s.tab,name===tab&&s.active]}>
          <Icon name={icon} color={name===tab?'white':C.purple} size={19}/><Text style={[s.tabLabel,name===tab&&s.white]}>{name}</Text></Pressable>)}</View>
        {tab==='Overview'&&<Overview store={store}/>}
        {tab==='Sales'&&<Sales records={store.sales} growth={store.salesGrowth}/>}
        {tab==='Assets'&&(store.assets.length?store.assets.map(asset=><AssetCard key={asset.assetCode} storeId={id} asset={asset}/>):<Panel title="Store assets" icon="cube-outline"><Text style={styles.muted}>No cooler assigned.</Text></Panel>)}
        {tab==='Visits'&&<Visits store={store}/>}
      </>:<Panel title={query.isError?'Store unavailable':'Loading store…'} icon="storefront-outline">{query.isError&&<Button label="Retry" onPress={()=>query.refetch()}/>}</Panel>}
      </View>
      <View style={s.flex}/><Image source={require('../../assets/drawer-waves.png')} resizeMode="stretch" style={s.footer}/>
    </FormScrollView>
  </SafeAreaView>;
}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.purple},page:{backgroundColor:'#F7F1FB'},scroll:{flexGrow:1},
  header:{paddingHorizontal:16,paddingBottom:32},brand:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:5},
  back:{minWidth:38,minHeight:44,justifyContent:'center'},wordmark:{color:'white',fontWeight:'900',fontStyle:'italic',fontSize:22},
  product:{borderLeftWidth:1,borderColor:'#BB99CC',paddingLeft:12,color:'white',fontSize:12,fontWeight:'700'},
  title:{fontSize:25,fontWeight:'800',color:'white',marginTop:6},body:{marginTop:-18,paddingHorizontal:14,gap:12},
  identity:{flexDirection:'row',gap:13,padding:15,alignItems:'center',borderRadius:20,backgroundColor:'white',borderWidth:1,borderColor:C.line},
  storeIcon:{width:48,height:58,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:C.lavender},
  actions:{gap:6},action:{minHeight:40,paddingHorizontal:8,borderRadius:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4},
  actionText:{fontSize:11,fontWeight:'700'},call:{backgroundColor:'#E6F7EC'},navigate:{backgroundColor:'#E6F1FD'},
  callText:{color:'#24663D'},navigateText:{color:'#245D94'},locality:{flexDirection:'row',alignItems:'center',gap:3,marginTop:3},
  flex:{flex:1},name:{fontSize:20,fontWeight:'800',color:C.deep},source:{fontSize:11,color:C.mid,marginTop:3},
  tabs:{flexDirection:'row',borderRadius:16,padding:4,backgroundColor:'white',borderWidth:1,borderColor:C.line},tab:{flex:1,gap:3,alignItems:'center',justifyContent:'center',minHeight:48,borderRadius:12},
  active:{backgroundColor:C.purple},tabLabel:{fontSize:12,color:C.purple,fontWeight:'700'},white:{color:'white'},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:8},metric:{width:'48%',minHeight:62,backgroundColor:C.pale,padding:9,borderRadius:12},
  metricValue:{fontSize:18,color:C.deep,fontWeight:'800'},footer:{width:'100%',height:34,marginTop:18},
});
