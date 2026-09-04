import type { CapacitorConfig } from '@capacitor/cli';

// This config points Capacitor at the static build output of the /client
// Vite project. Run `npm run build --workspace client` first so that
// ../client/dist exists, then `npm run sync --workspace mobile` (after
// `cap add android` / `cap add ios`) to copy the web assets into the
// native shell projects.
const config: CapacitorConfig = {
  appId: 'com.spacealienattack.app',
  appName: 'Space Alien Attack',
  webDir: '../client/dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
