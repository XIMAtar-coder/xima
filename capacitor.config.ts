import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xima.app',
  appName: 'XIMA',
  webDir: 'dist',
  // No server.url: the built web assets in `dist` are bundled into the native app.
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0A0F1C',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'native',
    },
  },
};

export default config;
