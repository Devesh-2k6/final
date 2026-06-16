import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.expirygo.app',
  appName: 'ExpiryGo',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // url: 'https://app-yemk.onrender.com',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
