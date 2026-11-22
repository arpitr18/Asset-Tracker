import * as SecureStore from 'expo-secure-store';
const listeners=new Set();
export function subscribeToSessionExpiry(listener){
  listeners.add(listener);
  return ()=>listeners.delete(listener);
}
async function expire(token){
  if(token&&await SecureStore.getItemAsync('token')===token){
    await SecureStore.deleteItemAsync('token');
    for(const listener of listeners)listener();
  }
}
export const API_URL=process.env.EXPO_PUBLIC_API_URL||'http://10.0.2.2:4000';
export async function request(path,options={}){const token=await SecureStore.getItemAsync('token');let response;try{response=await fetch(API_URL+path,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{ }),...options.headers}})}catch{throw new Error(`Cannot reach ${API_URL}. Check phone Wi-Fi and API.`)}const data=await response.json().catch(()=>({}));if(response.status===401&&path!=='/auth/demo')await expire(token);if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);return data}
export async function login(email,password){const data=await request('/auth/demo',{method:'POST',body:JSON.stringify({email,password})});await SecureStore.setItemAsync('token',data.token);return data}
export async function logout(){await SecureStore.deleteItemAsync('token')}
