import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { C } from '../../theme';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const quarters = ['Q1','Q2','Q3','Q4'];

export function PeriodPicker({ span, selected, current, title, onSelect }) {
  const [year, setYear] = useState(null);
  const monthly = span === 1;
  const close = () => setYear(null);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={'Choose period, '+title}
      onPress={() => setYear(Math.floor(selected / 12))} style={s.trigger}>
      <Icon name="calendar-month-outline" size={19} color={C.purple}/>
      <Text style={s.label}>{title}</Text><Icon name="chevron-down" size={18} color={C.purple}/>
    </Pressable>
    <Modal visible={year !== null} onRequestClose={close} animationType="fade" transparent>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss picker" onPress={close}/>
        <View style={s.dialog} accessibilityViewIsModal>
          <View style={s.row}><Text style={s.heading}>{monthly?'Choose month':'Choose quarter'}</Text>
            <Pressable accessibilityLabel="Close" style={s.arrow} onPress={close}><Icon name="close" size={20} color={C.purple}/></Pressable></View>
          <View style={s.row}>
            <Pressable accessibilityLabel="Previous year" style={s.arrow} onPress={()=>setYear(year-1)}><Icon name="chevron-left" size={24} color={C.purple}/></Pressable>
            <Text style={s.label}>{year}</Text>
            <Pressable accessibilityLabel="Next year" style={s.arrow} disabled={year>=Math.floor(current/12)} onPress={()=>setYear(year+1)}><Icon name="chevron-right" size={24} color={year>=Math.floor(current/12)?C.line:C.purple}/></Pressable>
          </View>
          <View style={s.grid}>{(monthly?months:quarters).map((name,index)=>{
            const period=year*12+index*span;
            if(monthly && period>current) return null;
            const future=period>current;
            return <Pressable key={name} accessibilityRole="button" accessibilityState={{disabled:future,selected:period===selected}} disabled={future}
              style={[s.cell,!monthly&&s.quarter,period===selected&&s.selected,future&&s.future]}
              onPress={()=>{onSelect(period);close();}}>
              <Text style={[s.label,period===selected&&s.white]}>{name}</Text>
            </Pressable>;
          })}</View>
        </View>
      </View>
    </Modal>
  </>;
}
const s=StyleSheet.create({
  trigger:{minHeight:42,alignSelf:'center',paddingHorizontal:12,gap:8,backgroundColor:C.lavender,borderRadius:12,flexDirection:'row',alignItems:'center'},
  overlay:{flex:1,backgroundColor:'#210A3D66',justifyContent:'center',alignItems:'center',padding:20},
  dialog:{backgroundColor:C.white,width:'100%',maxWidth:380,padding:18,borderRadius:20,gap:10},
  row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},heading:{fontSize:19,color:C.deep,fontWeight:'800'},
  arrow:{width:44,height:44,alignItems:'center',justifyContent:'center'},grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8},
  cell:{width:'30%',minHeight:44,alignItems:'center',justifyContent:'center',backgroundColor:C.pale,borderRadius:10},
  quarter:{width:'47%'},selected:{backgroundColor:C.purple},future:{opacity:.35},label:{color:C.purple,fontWeight:'700'},white:{color:'white'}
});
