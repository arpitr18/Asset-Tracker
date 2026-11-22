import React from 'react';
import {Alert,Text,View} from 'react-native';
import * as Picker from 'expo-document-picker';
import {File} from 'expo-file-system';
import {Button,styles} from './Ui';
import {selectPhoto} from '../../services/photos';

const types=['application/pdf','image/jpeg','image/png'];
export function SurveyEvidence({question,value={},onChange,onView}){
  async function attach(){
    try{
      const result=await Picker.getDocumentAsync({type:types,copyToCacheDirectory:true});
      if(result.canceled)return;
      const asset=result.assets[0];
      if(!types.includes(asset.mimeType))throw new Error('Choose a PDF, JPEG or PNG file.');
      const file=new File(asset.uri);
      if((asset.size??file.size)>650000)throw new Error('Choose a file smaller than 650 KB.');
      const content=await file.base64();
      if(content.length>900000)throw new Error('Choose a smaller file.');
      onChange('attachment',{name:asset.name.slice(0,150),mime:asset.mimeType,content});
    }catch(error){Alert.alert('Unable to attach file',error.message);}
  }
  async function capture(){
    try{const photo=await selectPhoto(true);if(photo)onChange('capture',photo);}
    catch(error){Alert.alert('Unable to capture image',error.message);}
  }
  return <>
    {question.attachment&&question.attachment!=='none'&&<View style={styles.row}>
      <Button icon="paperclip" label={question.attachment==='required'?'Attach file (required)':'Attach file (optional)'} onPress={attach}/>
      {value.attachment&&<><Text style={styles.muted}>{value.attachment.name}</Text><Button label="Remove file" onPress={()=>onChange('attachment',undefined)}/></>}
    </View>}
    {question.capture&&question.capture!=='none'&&<View style={styles.row}>
      <Button icon="camera-outline" label={question.capture==='required'?'Capture image (required)':'Capture image (optional)'} onPress={capture}/>
      {value.capture&&<><Button label="View" onPress={()=>onView(value.capture)}/><Button label="Remove image" onPress={()=>onChange('capture',undefined)}/></>}
    </View>}
  </>;
}
