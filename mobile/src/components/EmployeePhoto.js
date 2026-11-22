import React, {useState} from 'react';
import {View, Text, Image, Modal, Pressable, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MaterialCommunityIcons as Icon} from '@expo/vector-icons';
import Storage from '@react-native-async-storage/async-storage';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {selectPhoto} from '../services/photos';
import {C} from '../theme';

export function EmployeePhoto({employee, editable=false}) {
  const client=useQueryClient();
  const key=['employee-photo', employee?.id];
  const storageKey='tracker.avatar.'+employee?.id;
  const photo=useQuery({queryKey:key, enabled:!!employee?.id, queryFn:()=>Storage.getItem(storageKey)});
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  async function change(remove=false) {
    setBusy(true);
    try {
      let value=null;
      if (remove) await Storage.removeItem(storageKey);
      else {
        const data=await selectPhoto();
        if(!data) return;
        value='data:image/jpeg;base64,'+data;
        await Storage.setItem(storageKey,value);
      }
      client.setQueryData(key,value);
      setOpen(false);
    } catch(e){Alert.alert('Profile photo',e.message);}
    finally{setBusy(false);}
  }
  const initials=employee?.name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('') || '·';
  return <View style={s.group}>
    <Pressable accessibilityLabel="View profile photo" disabled={!photo.data} onPress={()=>setOpen(true)} style={[s.avatar,editable&&s.large]}>
      {photo.data?<Image source={{uri:photo.data}} style={s.fill}/>:<Text style={s.initials}>{initials}</Text>}
    </Pressable>
    {editable&&<View style={s.controls}><Pressable disabled={busy} onPress={()=>change()}><Text style={s.link}>Update photo</Text></Pressable>
      {photo.data&&<Pressable accessibilityLabel="Remove photo" hitSlop={5} disabled={busy} onPress={()=>Alert.alert('Remove profile photo?',undefined,[{text:'Cancel'},{text:'Remove',style:'destructive',onPress:()=>change(true)}])}><Icon name="trash-can-outline" size={18} color={C.red}/></Pressable>}</View>}
    <Modal visible={open} onRequestClose={()=>setOpen(false)} animationType="fade">
      <SafeAreaView style={s.preview}><Pressable onPress={()=>setOpen(false)} accessibilityLabel="Close photo"><Icon name="close" size={30} color="white"/></Pressable>
      {photo.data&&<Image resizeMode="contain" source={{uri:photo.data}} style={s.previewImage}/>}</SafeAreaView>
    </Modal>
  </View>;
}
const s=StyleSheet.create({group:{alignItems:'center',gap:5},avatar:{width:50,height:50,borderRadius:25,backgroundColor:C.lavender,overflow:'hidden',alignItems:'center',justifyContent:'center'},large:{width:82,height:82,borderRadius:41,borderColor:'white',borderWidth:3},initials:{color:C.purple,fontSize:22,fontWeight:'800'},fill:{width:'100%',height:'100%'},controls:{flexDirection:'row',gap:6,alignItems:'center',minHeight:30},link:{color:C.mid,fontSize:12,fontWeight:'700'},preview:{flex:1,backgroundColor:'#170D20',padding:16},previewImage:{width:'100%',flex:1}});
