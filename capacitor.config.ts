import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.tabatia.android",
  appName: "Tabatia",
  webDir: "android-www",
  server: {
    url: "https://tabata-video-app.vercel.app",
    androidScheme: "https",
    allowNavigation: [
      "tabata-video-app.vercel.app",
      "*.youtube.com",
      "*.youtu.be",
      "*.googlevideo.com",
      "*.ytimg.com",
      "*.google.com",
      "*.gstatic.com",
    ],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0b0f0c",
    webContentsDebuggingEnabled: false,
  },
};

export default config;
