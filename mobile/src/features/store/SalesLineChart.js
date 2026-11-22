import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { C } from '../../theme';

const spacing = 106;
const plotHeight = 105;

export function SalesLineChart({ points, selected, onSelect, format }) {
  const scroll = useRef(null);
  const values = points.flatMap(point => point.value == null ? [] : [point.value]);
  const min = Math.min(0, ...values);
  const max = Math.max(min + 1, ...values);
  const positions = points.map(({value}, index) => ({
    x: spacing * (index + .5),
    y: value == null ? plotHeight + 28 : 28 + plotHeight * (max - value) / (max - min),
  }));
  return <ScrollView ref={scroll} horizontal
    onContentSizeChange={()=>scroll.current?.scrollToEnd({animated:false})}>
    <View style={[s.plot,{width:points.length*spacing}]}>
      {positions.slice(1).map((end,index)=>{
        if(points[index].value==null || points[index+1].value==null) return null;
        const start=positions[index], dy=end.y-start.y, length=Math.hypot(spacing,dy);
        return <View key={index} pointerEvents="none" style={[s.line,{
          width:length,left:(start.x+end.x-length)/2,top:(start.y+end.y)/2-1,
          transform:[{rotate:Math.atan2(dy,spacing)+'rad'}],
        }]}/>;
      })}
      {points.map((point,index)=><Pressable key={point.id} onPress={()=>onSelect(point.id)}
        accessibilityRole="button" accessibilityState={{selected:point.id===selected}}
        accessibilityLabel={point.label+', '+(point.value==null?'No records':format(point.value))}
        style={[s.column,{left:index*spacing}]}>
        <Text style={[s.amount,{top:positions[index].y-25}]}>{point.value==null?'—':format(point.value)}</Text>
        {point.value!=null&&<View style={[s.dot,{top:positions[index].y-4},point.id===selected&&s.active]}/>}
        <Text style={s.period}>{point.label}</Text>
      </Pressable>)}
    </View>
  </ScrollView>;
}
const s=StyleSheet.create({
  plot:{height:166,backgroundColor:C.pale,borderRadius:12},
  line:{position:'absolute',height:2,backgroundColor:C.mid},
  column:{position:'absolute',width:spacing,height:'100%',alignItems:'center'},
  dot:{position:'absolute',width:8,height:8,borderRadius:4,backgroundColor:C.mid},
  active:{backgroundColor:C.deep},
  amount:{position:'absolute',fontSize:12,fontWeight:'700',color:C.deep,backgroundColor:C.pale},
  period:{position:'absolute',bottom:5,fontSize:11,color:C.muted},
});
