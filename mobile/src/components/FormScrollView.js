import React from 'react';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

export function FormScrollView(props){
  return <KeyboardAwareScrollView
    enableOnAndroid
    enableResetScrollToCoords={false}
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode="on-drag"
    extraScrollHeight={12}
    extraHeight={12}
    {...props}
  />;
}
