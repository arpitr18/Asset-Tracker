import {useRuntime} from '../services/runtime';
import { TabSurface } from '../components/TabSurface';
import React,{useEffect,useMemo,useState} from 'react';
import { View,Text,Pressable,TextInput,StyleSheet,Modal,ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery,useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StoreCard } from '../components/StoreCard';
import { request } from '../services/api';
import { C } from '../theme';
const fields=[['branchName','branch','Branch'],['regionName','region','Region'],['asmArea','area','ASM Area'],['soTerritory','territory','Territory']];
function km(a,b,x,y){if([a,b,x,y].some(v=>v==null))return null;const r=Math.PI/180,u=(x-a)*r,v=(y-b)*r,h=Math.sin(u/2)**2+Math.cos(a*r)*Math.cos(x*r)*Math.sin(v/2)**2;return 12742*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}
export function FilterScreen({ navigation }) {
  const {nearbyRadiusKm}=useRuntime();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({});
  const [modal, setModal] = useState(false);
  const [radius, setRadius] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 280);
    return () => clearTimeout(timer);
  }, [search]);

  const location = useQuery({
    queryKey: ['filter-location'], enabled: radius, staleTime: 30000, retry: false,
    queryFn: async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Allow location access to find nearby stores, or choose All stores.');
      const position = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
      return position.coords;
    },
  });
  const gps = location.data;
  const hierarchy = useQuery({queryKey:['hierarchy'],queryFn:()=>request('/hierarchy')});
  const nearby = radius && gps ? {lat:String(gps.latitude),lon:String(gps.longitude),radiusKm:String(nearbyRadiusKm)} : {};
  const query = useInfiniteQuery({
    queryKey: ['store-explorer', q, filters, radius, nearby], enabled: !radius || !!gps,
    initialPageParam: null,
    queryFn: ({pageParam,signal}) => request('/stores?' + new URLSearchParams({
      limit:'10', ...nearby, ...(q ? {q} : {}), ...filters, ...(pageParam ? {cursor:pageParam} : {}),
    }), {signal}),
    getNextPageParam: last => last.nextCursor,
  });
  const shown = query.data?.pages.flatMap(page => page.items) || [];
  const choices=useMemo(()=>fields.map(([field],i)=>[...new Set((hierarchy.data||[]).filter(row=>fields.slice(0,i).every(([f,key])=>!filters[key]||row[f]===filters[key])).map(row=>row[field]))].sort()),[hierarchy.data,filters]);return <TabSurface><View style={s.top}><View style={s.titleRow}><MaterialCommunityIcons name="map-marker" size={30} color={C.purple}/><View style={s.titleBlock}><Text style={s.title}>{radius?'Nearby Stores':'All stores'}</Text><Text style={s.subtitle}>{radius?'Nearest first':'Browse outlets'}</Text></View><Pressable onPress={()=>setRadius(!radius)} style={s.radius}><Text style={s.radiusText}>{radius?'Within '+nearbyRadiusKm+' km':'All stores'}</Text><MaterialCommunityIcons name="chevron-down" size={17} color={C.purple}/></Pressable></View><View style={s.tools}><View style={s.searchRow}><MaterialCommunityIcons name="magnify" size={24} color={C.purple}/><TextInput style={s.input} accessibilityLabel="Search : Name / ID / Phone No." placeholder="Search by Store Name / ID / Phone No." placeholderTextColor={C.muted} value={search} onChangeText={setSearch}/></View><Pressable onPress={()=>setModal(true)} accessibilityLabel="All Stores" style={s.applyFilter}><MaterialCommunityIcons name="filter-variant" size={19} color={C.purple}/><Text style={s.applyFilterText}>All Stores</Text></Pressable></View></View>{radius && !gps ? <View style={s.center}><Text style={s.muted}>{location.isError ? location.error.message : 'Finding your location?'}</Text>{location.isError && <Pressable onPress={()=>location.refetch()} style={s.more}><Text style={s.moreText}>Retry location</Text></Pressable>}</View> : query.isLoading?<View style={s.center}><Text style={s.muted}>Loading stores...</Text></View>:query.isError?<Pressable style={s.center} onPress={()=>query.refetch()}><Text style={s.muted}>Could not load stores. Tap to retry.</Text></Pressable>:<FlashList keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" data={shown} keyExtractor={x=>x.outletUid} renderItem={({item})=><StoreCard store={item} distance={item.distanceKm ?? km(gps?.latitude,gps?.longitude,item.latitude,item.longitude)} onPress={()=>navigation.getParent()?.getParent()?.navigate('Details',{id:item.outletUid})}/>} ListEmptyComponent={<View style={s.center}><Text style={s.muted}>{radius?'No matching outlets within '+nearbyRadiusKm+' km.':'No matching outlets.'}</Text></View>} ListFooterComponent={query.hasNextPage?<Pressable onPress={()=>query.fetchNextPage()} style={s.more}><Text style={s.moreText}>{query.isFetchingNextPage?'Loading...':'Load more stores'}</Text></Pressable>:null}/>}
  <Modal visible={modal} transparent animationType="slide" onRequestClose={()=>setModal(false)}><Pressable style={s.scrim} onPress={()=>setModal(false)}/><SafeAreaView style={s.sheet}><View style={s.sheetHead}><Text style={s.sheetTitle}>Filter stores</Text><Pressable onPress={()=>setModal(false)}><MaterialCommunityIcons name="close" size={24} color={C.deep}/></Pressable></View><ScrollView>{fields.map(([field,key,label],index)=><View key={key} style={s.group}><Text style={s.groupTitle}>{label}</Text><View style={s.chips}>{['',...choices[index]].map(value=><Pressable key={value||'all'} onPress={()=>{const next={...filters};fields.slice(index).forEach(([,k])=>delete next[k]);if(value)next[key]=value;setFilters(next)}} style={[s.chip,(filters[key]||'')===value&&s.chipActive]}><Text style={[(filters[key]||'')===value?s.chipActiveText:s.chipText]}>{value||'All'}</Text></Pressable>)}</View></View>)}</ScrollView><Pressable style={s.apply} onPress={()=>setModal(false)}><Text style={s.applyText}>Show stores</Text></Pressable></SafeAreaView></Modal>
  </TabSurface>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:C.pale},top:{paddingHorizontal:16,paddingTop:8,paddingBottom:13},titleRow:{flexDirection:'row',alignItems:'center',gap:8},titleBlock:{flex:1},title:{fontSize:21,color:C.deep,fontWeight:'800'},subtitle:{fontSize:11,color:C.muted,marginTop:2},radius:{borderWidth:1,borderColor:C.line,backgroundColor:'white',borderRadius:16,paddingHorizontal:8,height:32,flexDirection:'row',alignItems:'center'},radiusText:{fontSize:10,fontWeight:'700',color:C.purple},tools:{flexDirection:'row',alignItems:'center',gap:8,marginTop:12},applyFilter:{height:44,paddingHorizontal:12,borderRadius:17,backgroundColor:'#EAD7F8',flexDirection:'row',alignItems:'center',gap:5},applyFilterText:{fontSize:12,color:C.purple,fontWeight:'800'},searchRow:{flex:1,minWidth:0,height:44,backgroundColor:'white',borderWidth:1,borderColor:C.line,borderRadius:12,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:8,elevation:2},input:{flex:1,color:C.deep,fontSize:13},center:{padding:30,alignItems:'center'},muted:{color:C.muted},more:{padding:18,alignItems:'center'},moreText:{color:C.purple,fontWeight:'800'},scrim:{flex:1,backgroundColor:'#210A3D66'},sheet:{height:'65%',backgroundColor:'white',borderTopLeftRadius:24,borderTopRightRadius:24,padding:20},sheetHead:{flexDirection:'row',justifyContent:'space-between',marginBottom:15},sheetTitle:{fontSize:23,color:C.deep,fontWeight:'800'},group:{marginBottom:18},groupTitle:{fontSize:14,color:C.deep,fontWeight:'800',marginBottom:9},chips:{flexDirection:'row',flexWrap:'wrap',gap:7},chip:{paddingHorizontal:12,paddingVertical:8,borderRadius:16,borderWidth:1,borderColor:C.line},chipActive:{backgroundColor:C.purple,borderColor:C.purple},chipText:{color:C.deep,fontSize:12},chipActiveText:{color:'white',fontSize:12,fontWeight:'700'},apply:{backgroundColor:C.purple,borderRadius:14,height:48,justifyContent:'center',alignItems:'center'},applyText:{color:'white',fontWeight:'800'}});
