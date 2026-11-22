import * as Picker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export async function selectPhoto(camera = false) {
  if (camera && !(await Picker.requestCameraPermissionsAsync()).granted) {
    throw new Error('Allow camera access to photograph this cooler.');
  }
  const launch = camera ? Picker.launchCameraAsync : Picker.launchImageLibraryAsync;
  const result = await launch({mediaTypes:['images'], allowsEditing:!camera, aspect:[1,1], quality:0.85});
  if (result.canceled) return null;
  const source = result.assets[0];
  const side = camera ? 960 : 480;
  const context = ImageManipulator.manipulate(source.uri);
  context.resize(source.width >= source.height ? {width:side} : {height:side});
  const image = await context.renderAsync();
  const {base64} = await image.saveAsync({format:SaveFormat.JPEG,compress:0.65,base64:true});
  if (!base64 || base64.length > 900000) throw new Error('Image too large. Try another photo.');
  return base64;
}
