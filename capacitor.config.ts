import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sederek.app',
  appName: 'Sederek Kopi',
  webDir: 'dist',
  server: {
    url: 'https://pos.sederek-kopi.my.id',
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#1B6B3A',
    initialFocus: false,
    overScrollMode: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 5000,
      launchAutoHide: false,
      backgroundColor: '#0A2D1A',
      androidSplashResourceName: 'splash_screen',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    CapacitorSQLite: {
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
      },
    },

    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1B6B3A',
      overlaysWebView: false,
    },

    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#1B6B3A',
      sound: 'beep.wav',
    },

    Geolocation: {},

    Camera: {},
  },
};

export default config;
