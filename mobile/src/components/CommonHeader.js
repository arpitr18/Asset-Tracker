import React from 'react';
import { View,Text,Pressable,StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { request } from '../services/api';
import { C } from '../theme';
export function CommonHeader({navigation}){const me=useQuery({queryKey:['me'],queryFn:()=>request('/me')});const first=me.data?.name?.trim().split(/\s+/)[0];return <SafeAreaView edges={['top']} style={s.safe}><View style={s.row}><Pressable onPress={()=>navigation.getParent()?.openDrawer()} accessibilityLabel="Open menu" style={s.menu}><MaterialCommunityIcons name="menu" size={26} color="white"/></Pressable><Text numberOfLines={1} style={s.greeting}>{first ? 'Welcome, '+first : 'Welcome'}</Text><Pressable onPress={()=>navigation.getParent()?.getParent()?.navigate('Assistant')} style={s.ask}><MaterialCommunityIcons name="robot-outline" size={19} color={C.purple}/><Text style={s.askText}>Ask</Text></Pressable></View></SafeAreaView>}
const s=StyleSheet.create({safe:{backgroundColor:C.purple},row:{height:50,flexDirection:'row',alignItems:'center',paddingHorizontal:16,gap:12},menu:{width:32,alignItems:'center'},greeting:{color:'white',fontSize:19,fontWeight:'800',flex:1},ask:{height:32,backgroundColor:'white',borderRadius:17,paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:4},askText:{color:C.purple,fontWeight:'800',fontSize:13}});
