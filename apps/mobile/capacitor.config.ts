import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.homegraph.app",
  appName: "Homegraph",
  webDir: "../web/.next/static", // placeholder; point to built web output or a copied folder
  server: {
    androidScheme: "https",
    url: "http://localhost:3000",
    cleartext: true
  }
};

export default config;

