import {FormScrollView} from '../components/FormScrollView';
import { EmployeePhoto } from '../components/EmployeePhoto';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Directory } from 'expo-file-system';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { request } from '../services/api';
import { C } from '../theme';
import app from '../../app.json';

const waves = require('../../assets/drawer-waves.png');
const details = [
  ['Employee ID', 'card-account-details-outline', 'employeeCode'],
  ['Department', 'office-building-outline', 'department'],
  ['Date of Joining', 'calendar-outline', 'joiningDate'],
  ['Employment Type', 'briefcase-outline', 'employmentType'],
  ['Reporting To', 'account-multiple-outline', 'managerName'],
  ['Location', 'map-marker-outline', 'location'],
];

function Action({ icon, title, subtitle, onPress, disabled }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={s.action}>
      <View style={s.tile}><Icon name={icon} size={23} color={C.purple}/></View>
      <View style={s.grow}>
        <Text style={s.heading}>{title}</Text>
        <Text style={s.secondary}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={22} color={C.purple}/>
    </Pressable>
  );
}

function PasswordForm({ onDone }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!current || next.length < 8) return setError('Enter your current password and at least 8 characters for the new password.');
    if (next !== confirm) return setError('The two new passwords must match.');
    setBusy(true);
    try {
      await request('/me/password', {
        method: 'POST', body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      onDone();
      Alert.alert('Password updated');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <View style={s.form}>
    {[
      ['Current password', current, setCurrent], ['New password', next, setNext],
      ['Confirm new password', confirm, setConfirm],
    ].map(([label, value, update]) => (
      <TextInput key={label} accessibilityLabel={label} placeholder={label} secureTextEntry
        autoCapitalize="none" maxLength={label === 'Current password' ? 256 : 128}
        value={value} onChangeText={update} style={s.input}/>
    ))}
    {Boolean(error) && <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
    <Pressable accessibilityRole="button" disabled={busy} onPress={save} style={s.button}>
      <Text style={s.buttonText}>{busy ? 'Saving…' : 'Save password'}</Text>
    </Pressable>
  </View>;
}

export function ProfileScreen({ navigation, onLogout }) {
  const profile = useQuery({ queryKey: ['me'], queryFn: () => request('/me') });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const employee = profile.data;

  async function download() {
    setSaving(true);
    try {
      const folder = await Directory.pickDirectoryAsync();
      const data = await request('/me/export');
      const file = folder.createFile('tracker-profile-' + Date.now() + '.json', 'application/json');
      file.write(JSON.stringify(data, null, 2));
      Alert.alert('Download complete', file.name);
    } catch (failure) {
      if (!/cancel|dismiss/i.test(failure.message)) Alert.alert('Download unavailable', failure.message);
    } finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <FormScrollView contentContainerStyle={s.scrollContent} style={s.page} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#421662', '#692298']} style={s.hero}>
          <View style={s.brandRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={navigation.goBack} style={s.back}>
              <Icon name="arrow-left" size={25} color="white"/>
            </Pressable>
            <View style={s.brand}><Text style={s.logo}>Mondelēz</Text><Text style={s.wordmark}>International</Text></View>
            <Text style={s.product}>Visi Cooler{'\n'}Store Tracker</Text>
          </View>
          <Text style={s.title}>My Profile</Text>
          <Text style={s.caption}>View and manage your account details</Text>
        </LinearGradient>

        <View style={s.cards}>
          {employee ? <>
            <View style={[s.card, s.identity]}>
              <EmployeePhoto employee={employee} editable/>
              <View style={s.grow}>
                <Text style={s.name}>{employee.name}</Text>
                <Text selectable style={s.email}>{employee.email}</Text>
                <View style={s.badge}>
                  <Icon name={employee.jobTitle?.toLowerCase() === 'developer' ? 'code-tags' : 'briefcase-outline'} size={16} color={C.purple}/>
                  <Text style={s.job}>{employee.jobTitle || employee.role}</Text>
                </View>
              </View>
            </View>
            <View style={s.card}>
              <View style={s.sectionTitle}><Icon name="account-outline" size={22} color={C.purple}/><Text style={s.heading}>Employee Details</Text></View>
              <View style={s.grid}>{details.map(([label, icon, field]) => (
                <View key={field} style={s.cell}>
                  <View style={s.smallTile}><Icon name={icon} size={20} color={C.purple}/></View>
                  <View style={s.grow}><Text style={s.label}>{label}</Text><Text style={s.value}>{employee[field] || 'Not provided'}</Text></View>
                </View>
              ))}</View>
            </View>
            <View style={s.card}>
              <Action icon="lock-outline" title="Change Password" subtitle="Update your account password" onPress={()=>setEditing(!editing)}/>
              {editing && <PasswordForm onDone={()=>setEditing(false)}/>}
              <View style={s.rule}/>
              <Action icon="download-outline" title="Download My Data" subtitle={saving ? 'Preparing download…' : 'Get a copy of your account and activity data'} onPress={download} disabled={saving}/>
              <View style={s.rule}/>
              <Action icon="information-outline" title="About the App" subtitle="App details, version and support"
                onPress={()=>Alert.alert('Visi Cooler Store Tracker', 'Version ' + app.expo.version, [
                  { text: 'Contact support', onPress: ()=>navigation.navigate('Contact') }, { text: 'Close' },
                ])}/>
            </View>
          </> : <View style={s.card}>{profile.isLoading ? <ActivityIndicator color={C.purple}/> :
            <Action title="Couldn’t load your profile" subtitle="Tap to try again" icon="refresh" onPress={profile.refetch}/>}</View>}
          <Pressable onPress={onLogout} accessibilityRole="button" style={s.button}>
            <Icon name="logout" size={21} color="white"/><Text style={s.buttonText}>Log Out</Text>
          </Pressable>
        </View>
        <View style={s.spacer}/><Image accessible={false} source={waves} style={s.footer} resizeMode="stretch"/>
      </FormScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#421662' },
  page: { backgroundColor: '#F5EEFB' },
  hero: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 46, overflow: 'hidden' },
  heroWaves: { position: 'absolute', height: 32, width: '120%', left: '-10%', bottom: 0, opacity: 0.8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 15 },
  back: { minHeight: 44, minWidth: 40, justifyContent: 'center' },
  brand: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#D0B5E1', paddingHorizontal: 12, alignItems: 'center' },
  logo: { color: 'white', fontSize: 21, fontWeight: '900', fontStyle: 'italic' },
  wordmark: { color: 'white', fontSize: 9, fontWeight: '700' },
  product: { flex: 1, color: 'white', fontSize: 14, fontWeight: '700' },
  title: { fontSize: 25, fontWeight: '800', color: 'white' },
  caption: { color: '#F8ECFF', fontSize: 13, marginTop: 3 },
  cards: { marginHorizontal: 16, marginTop: -17, gap: 13 },
  card: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFFCFF', borderRadius: 18, borderWidth: 1, borderColor: '#E9DDF1', elevation: 2 },
  identity: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, gap: 13 },
  avatar: { width: 82, height: 82, borderRadius: 41, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  initials: { fontSize: 29, color: C.purple, fontWeight: '800' },
  grow: { flex: 1, minWidth: 0 },
  name: { fontSize: 22, fontWeight: '800', color: C.deep },
  email: { color: C.muted, fontSize: 13, marginVertical: 5 },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 16, backgroundColor: '#ECDAF8', paddingHorizontal: 10, paddingVertical: 4 },
  job: { color: C.purple, fontWeight: '700', fontSize: 12, flexShrink: 1 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  heading: { fontSize: 16, color: C.deep, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', minHeight: 55, padding: 4, gap: 7, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  tile: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.lavender, alignItems: 'center', justifyContent: 'center' },
  smallTile: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.lavender, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, color: C.muted }, value: { fontSize: 13, color: C.deep, marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 62, paddingVertical: 7 },
  secondary: { color: C.muted, fontSize: 12, marginTop: 3 }, rule: { height: StyleSheet.hairlineWidth, backgroundColor: C.line },
  button: { minHeight: 46, backgroundColor: C.mid, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  scrollContent: { flexGrow: 1 }, spacer: { flex: 1 }, footer: { width: '100%', height: 45, marginTop: 15 },
  form: { gap: 8, paddingVertical: 10 }, input: { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 10, color: C.deep },
  error: { color: '#9B2634' },
});
