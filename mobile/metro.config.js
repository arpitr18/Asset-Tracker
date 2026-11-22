const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const resolve = config.resolver.resolveRequest;
const appOrigin = path.join(__dirname, 'package.json');

config.resolver.resolveRequest = (context, name, platform) => {
  // Navigation contexts and native view registries must have one instance,
  // regardless of where workspace dependencies are installed.
  const singleton = name.startsWith('@react-navigation/') ||
    /^(react|react-native|react-native-safe-area-context|react-native-screens|react-native-gesture-handler|react-native-reanimated|react-native-worklets)(\/|$)/.test(name);
  const requestContext = singleton ? { ...context, originModulePath: appOrigin } : context;
  return (resolve || context.resolveRequest)(requestContext, name, platform);
};

module.exports = config;
