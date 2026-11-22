import {useRuntimeSync} from '../services/runtime';
import { RDScreen, RDDetailsScreen } from '../screens/RDScreen';
import { FieldSurveyScreen } from '../screens/FieldSurveyScreen';
import React,{useEffect,useState} from 'react';
import { View,Text,Pressable,StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator,DrawerContentScrollView } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { BottomBar } from '../components/BottomBar';
import { LoginScreen } from '../screens/LoginScreen';
import { MapScreen } from '../screens/MapScreen';
import { FilterScreen } from '../screens/FilterScreen';
import { DetailsScreen } from '../screens/DetailsScreen';
import { BlankScreen } from '../screens/BlankScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useQueryClient } from '@tanstack/react-query';
import { ContactScreen } from '../screens/MenuScreens';
import { AssistantScreen } from '../screens/AssistantScreen';
import { DrawerMenu } from '../components/DrawerMenu';
import { CommonHeader } from '../components/CommonHeader';
import { logout,subscribeToSessionExpiry } from '../services/api';
import { C } from '../theme';
const Stack=createNativeStackNavigator(),Tabs=createBottomTabNavigator(),Drawer=createDrawerNavigator();
function TabScreens(){return <Tabs.Navigator screenOptions={{headerShown:true,header:props=><CommonHeader navigation={props.navigation}/>}} tabBar={props=><BottomBar {...props}/>}><Tabs.Screen name="Map" component={MapScreen}/><Tabs.Screen name="Filter" component={FilterScreen}/><Tabs.Screen name="Survey" component={FieldSurveyScreen}/><Tabs.Screen name="Locate RD" component={RDScreen}/></Tabs.Navigator>}
function Menu({navigation,onLogout}){return <View style={s.drawer}><DrawerContentScrollView contentContainerStyle={s.drawerScroll}><View style={s.brand}><MaterialCommunityIcons name="fridge-outline" size={34} color="white"/><Text style={s.brandText}>Visi Cooler Tracker</Text></View><MenuLink icon="account-outline" label="Profile" onPress={()=>navigation.navigate('Profile')}/><MenuLink icon="email-outline" label="Contact us" onPress={()=>navigation.navigate('Contact')}/></DrawerContentScrollView><Pressable style={s.logout} onPress={onLogout}><MaterialCommunityIcons name="logout" size={22} color={C.red}/><Text style={s.logoutText}>Logout</Text></Pressable></View>}
function MenuLink({icon,label,onPress}){return <Pressable style={s.link} onPress={onPress}><MaterialCommunityIcons name={icon} size={24} color={C.purple}/><Text style={s.linkText}>{label}</Text><MaterialCommunityIcons name="chevron-right" size={20} color={C.muted}/></Pressable>}
function DrawerScreens({onLogout}){useRuntimeSync();return <Drawer.Navigator screenOptions={{headerShown:false,drawerStyle:{width:"84%",maxWidth:330,backgroundColor:"transparent"},swipeEdgeWidth:50}} drawerContent={props=><DrawerMenu {...props} onLogout={onLogout}/>}><Drawer.Screen name="Tabs" component={TabScreens}/><Drawer.Screen name="Profile">{props => <ProfileScreen {...props} onLogout={onLogout}/>}</Drawer.Screen><Drawer.Screen name="Contact" component={ContactScreen}/><Drawer.Screen name="Reports">{()=> <BlankScreen title="Reports" icon="chart-bar"/>}</Drawer.Screen><Drawer.Screen name="Settings">{()=> <BlankScreen title="Settings" icon="cog-outline"/>}</Drawer.Screen></Drawer.Navigator>}
export function Navigation(){const cache=useQueryClient();const [ready,setReady]=useState(false),[authed,setAuthed]=useState(false);useEffect(()=>{SecureStore.getItemAsync('token').then(v=>setAuthed(!!v)).finally(()=>setReady(true))},[]);useEffect(()=>subscribeToSessionExpiry(()=>{cache.clear();setAuthed(false);}),[cache]);if(!ready)return null;const signOut=async()=>{await logout();cache.clear();setAuthed(false)};return <Stack.Navigator screenOptions={{headerShown:false,contentStyle:{backgroundColor:C.pale}}}>{authed?<><Stack.Screen name="Home">{()=> <DrawerScreens onLogout={signOut}/>}</Stack.Screen><Stack.Screen name="Details" component={DetailsScreen}/><Stack.Screen name="RDDetails" component={RDDetailsScreen}/><Stack.Screen name="Assistant" component={AssistantScreen}/></>:<Stack.Screen name="Login">{()=> <LoginScreen onLogin={()=>setAuthed(true)}/>}</Stack.Screen>}</Stack.Navigator>}
const s=StyleSheet.create({drawer:{flex:1,backgroundColor:C.white},drawerScroll:{paddingTop:0},brand:{height:160,backgroundColor:C.purple,justifyContent:'flex-end',padding:24,gap:8},brandText:{color:'white',fontWeight:'800',fontSize:21},link:{height:64,flexDirection:'row',alignItems:'center',paddingHorizontal:24,gap:16,borderBottomWidth:1,borderBottomColor:C.line},linkText:{flex:1,color:C.deep,fontSize:16,fontWeight:'700'},logout:{height:68,margin:16,borderRadius:15,backgroundColor:'#FFF2F2',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12},logoutText:{color:C.red,fontSize:17,fontWeight:'800'}});
