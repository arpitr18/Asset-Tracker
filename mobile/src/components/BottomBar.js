import React from 'react';
import { View,Text,Pressable,StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme';
const tabs=[['Map','map-marker-outline','Asset Store'],['Filter','filter-outline','Search Store'],['Survey','clipboard-check-outline','Fill Survey'],['Locate RD','map-marker-radius-outline','Locate RD']];
export function BottomBar({state,navigation}){const inset=useSafeAreaInsets();return <View style={[s.wrap,{paddingBottom:Math.max(inset.bottom,8)}]}>{tabs.map(([route,icon,label],index)=>{const active=state.index===index;return <Pressable key={route} onPress={()=>navigation.navigate(route)} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{selected:active}} style={s.item}><MaterialCommunityIcons name={icon} size={26} color={active?C.purple:C.muted}/><Text style={[s.label,active&&s.selected]}>{label.replace(' ', '\n')}</Text>{active&&<View style={s.underline}/>}</Pressable>})}</View>}
const s=StyleSheet.create({wrap:{backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.line,flexDirection:'row',paddingTop:8,elevation:8},item:{flex:1,alignItems:'center',justifyContent:'center',minHeight:64,paddingBottom:5,gap:2},label:{fontSize:12,textAlign:"center",color:C.muted,fontWeight:'600'},selected:{color:C.purple,fontWeight:'800'},underline:{position:'absolute',bottom:0,width:33,height:3,borderRadius:2,backgroundColor:C.mid}});
