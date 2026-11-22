import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from '../theme';

// CommonHeader and BottomBar already own the top and bottom safe-area insets.
export function TabSurface({ children, style }) {
  return (
    <View style={styles.backdrop}>
      <View style={[styles.surface, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.purple },
  surface: {
    flex: 1,
    backgroundColor: C.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
});
