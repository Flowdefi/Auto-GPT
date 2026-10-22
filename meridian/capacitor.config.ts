import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Meridian is a server-rendered app, so the native shell points at the deployed
 * origin instead of a static export. Set MERIDIAN_NATIVE_URL before `npx cap sync`.
 */
const serverUrl = process.env.MERIDIAN_NATIVE_URL;

const config: CapacitorConfig = {
  appId: "net.debtmarket.meridian",
  appName: "Meridian",
  webDir: "public",
  ios: {
    contentInset: "never",
    preferredContentMode: "mobile",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
    backgroundColor: "#0c1620",
  },
  server: serverUrl
    ? { url: serverUrl, cleartext: serverUrl.startsWith("http://"), androidScheme: "https" }
    : { androidScheme: "https" },
  plugins: {
    Keyboard: {
      resize: "native",
      style: "dark",
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0c1620",
      overlaysWebView: true,
    },
    Haptics: {},
  },
};

export default config;
