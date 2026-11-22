import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useUpdates } from 'expo-updates';

const logo = require('../../assets/AssetLogo.png');
const launchDuration = 2500;

SplashScreen.preventAutoHideAsync().catch(() => {});

export function LaunchScreen() {
  const [visible, setVisible] = useState(true);
  const opacity = useRef(new Animated.Value(0)).current;
  // Expo starts the update check on launch. Downloads can finish after this screen closes.
  const { isChecking, isDownloading } = useUpdates();

  useEffect(() => {
    const titleFade = Animated.timing(opacity, {
      toValue: 1,
      duration: 650,
      delay: 150,
      useNativeDriver: true,
    });
    titleFade.start();
    const timer = setTimeout(() => setVisible(false), launchDuration);
    return () => {
      titleFade.stop();
      clearTimeout(timer);
    };
  }, [opacity]);

  if (!visible) return null;
  const updateStatus = isDownloading ? 'Downloading update…' : isChecking ? 'Checking for updates…' : '';

  return (
    <View style={styles.overlay} onLayout={() => SplashScreen.hideAsync().catch(() => {})}>
      <Image source={logo} style={styles.logo} resizeMode="contain" accessible={false} />
      <Animated.Text accessibilityRole="header" style={[styles.title, { opacity }]}>
        Asset Tracker
      </Animated.Text>
      <Text style={styles.status}>{updateStatus}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8F5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 155, height: 155 },
  title: { fontSize: 34, fontWeight: '800', color: '#4B1D68', marginTop: 18, textAlign: 'center' },
  status: { minHeight: 22, marginTop: 12, fontSize: 14, color: '#604772', textAlign: 'center' },
});
