# Mobile (Capacitor) wrapper

This package wraps the built `/client` web app with [Capacitor](https://capacitorjs.com/)
to produce Android/iOS shells. It is a **scaffold only** — the native
`android/` and `ios/` projects are not generated yet (they are gitignored
once created, since they're large generated platform projects).

## Current status

- `capacitor.config.ts` is configured with `webDir: '../client/dist'`, so it
  will package whatever the client's Vite build produces.
- No native platforms have been added yet.

## Next steps to get a real native build running

1. Build the client so `client/dist` exists:
   ```sh
   npm run build --workspace client
   ```
2. From the `mobile/` folder, add the platform(s) you need:
   ```sh
   npm run add:android   # requires Android Studio + Android SDK installed
   npm run add:ios       # requires Xcode, macOS only
   ```
3. Sync the latest web build into the native project whenever the client changes:
   ```sh
   npm run sync
   ```
4. Open the native project in its IDE to run on a device/emulator or produce a store build:
   ```sh
   npm run open:android  # opens Android Studio
   npm run open:ios      # opens Xcode (macOS only)
   ```

### Android prerequisites
- Android Studio (latest stable) with an installed SDK platform + build tools.
- A configured emulator or a physical device with USB debugging enabled.

### iOS prerequisites
- macOS with Xcode installed (iOS builds cannot be produced on Windows/Linux).
- A valid Apple Developer signing setup for device builds.
