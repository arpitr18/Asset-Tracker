import React from 'react';
import {View,Text,Pressable,StyleSheet} from 'react-native';
import {MaterialCommunityIcons as Icon} from '@expo/vector-icons';
import {C} from '../../theme';

export function Panel({title,icon,children}) {
  return <View style={styles.panel}><View style={styles.titleRow}><Icon name={icon} size={21} color={C.mid}/><Text style={styles.heading}>{title}</Text></View>{children}</View>;
}
export function Fact({label,value}) {
  return <View style={styles.fact}><Text style={[styles.muted,{flex:1}]}>{label}</Text><Text selectable style={[styles.value,{flex:1}]}>{value??'Not provided'}</Text></View>;
}
export function Button({label,icon,onPress,disabled}) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.button,disabled&&styles.disabled]}>{icon&&<Icon name={icon} size={17} color={C.purple}/>}<Text style={styles.buttonText}>{label}</Text></Pressable>;
}
export const styles=StyleSheet.create({panel:{backgroundColor:'white',borderRadius:18,padding:15,borderWidth:1,borderColor:C.line,gap:10},titleRow:{flexDirection:'row',alignItems:'center',gap:8},heading:{fontSize:17,fontWeight:'800',color:C.deep},muted:{fontSize:13,color:C.muted,lineHeight:19},value:{flexShrink:1,textAlign:'right',fontSize:14,color:C.deep,fontWeight:'600'},fact:{flexDirection:'row',justifyContent:'space-between',gap:12,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line,paddingTop:9},button:{minHeight:40,paddingHorizontal:12,borderRadius:12,backgroundColor:C.lavender,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:5},disabled:{opacity:.55},buttonText:{fontSize:13,fontWeight:'700',color:C.purple},row:{flexDirection:'row',flexWrap:'wrap',gap:6},input:{minHeight:72,borderRadius:12,borderColor:C.line,borderWidth:1,padding:10,color:C.deep,textAlignVertical:'top'},selected:{color:C.purple,fontWeight:'800'}});
