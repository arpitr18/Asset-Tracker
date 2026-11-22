import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Navigation } from './src/navigation';
import { LaunchScreen } from './src/components/LaunchScreen';
const client=new QueryClient({defaultOptions:{queries:{staleTime:30000,retry:1}}});
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={client}>
          <View style={styles.root}>
            <NavigationContainer>
              <StatusBar style="dark" />
              <Navigation />
            </NavigationContainer>
            <LaunchScreen />
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
