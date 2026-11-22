const release = process.env.TRACKER_RELEASE === '1';
const mapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

module.exports = ({config}) => {
  const projectId = config.extra?.eas?.projectId;
  if (release) {
    let api;
    try { api = new URL(process.env.EXPO_PUBLIC_API_URL); } catch {}
    if (!api || api.protocol !== 'https:' || api.username || api.password || api.search || api.hash ||
      api.hostname === 'localhost' || /^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(api.hostname)) {
      throw new Error('Set EXPO_PUBLIC_API_URL to the deployed HTTPS API before building or publishing a release.');
    }
    if (!projectId || config.updates?.url !== 'https://u.expo.dev/'+projectId) {
      throw new Error('Link the Expo project and run eas update:configure before building or publishing a release.');
    }
    if (!mapsKey) throw new Error('Set GOOGLE_MAPS_ANDROID_API_KEY for the standalone Android map.');
  }
  if (!mapsKey) return config;
  return {...config, android:{...config.android, config:{
    ...config.android?.config, googleMaps:{apiKey:mapsKey},
  }}};
};
