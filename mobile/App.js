import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Navigation } from './src/navigation';
const client=new QueryClient({defaultOptions:{queries:{staleTime:30000,retry:1}}});
export default function App(){return <GestureHandlerRootView style={{flex:1}}><SafeAreaProvider><QueryClientProvider client={client}><NavigationContainer><StatusBar style="dark"/><Navigation/></NavigationContainer></QueryClientProvider></SafeAreaProvider></GestureHandlerRootView>}
