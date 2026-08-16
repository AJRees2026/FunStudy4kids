# Building BrainySpark for App Stores

This project uses Capacitor to wrap the web app into native Android and iOS apps.

## Prerequisites

### Android
- Android Studio (includes Android SDK)
- Java JDK 17+

### iOS (macOS only)
- Xcode 15+
- Apple Developer account ($99/year)

### Google Play
- Google Play Console account ($25 one-time fee)

## Step 1: Build the web assets
```bash
npm run build
```

## Step 2: Add the native platform (first time only)

### Android
```bash
npm run cap:android
```

### iOS (macOS only)
```bash
npm run cap:ios
```

## Step 3: Generate app icons & splash screen
1. Place `icon.png` (1024x1024) and `splash.png` (2732x2732) in the `resources/` folder.
2. `npm install --save-dev @capacitor/assets`
3. `npx capacitor-assets generate --android` and `npx capacitor-assets generate --ios`

## Step 4: Open the native project

### Android
```bash
npm run cap:open:android
```
Opens Android Studio — run on emulator/device, or build a release AAB.

### iOS
```bash
npm run cap:open:ios
```
Opens Xcode — select signing team, run on simulator/device, or archive for App Store.

## Step 5: After making code changes
```bash
npm run cap:sync
```

## Publishing to Google Play Store
1. In Android Studio: Build → Generate Signed Bundle / APK → Android App Bundle (.aab)
2. Create or select a keystore (keep it safe)
3. Go to Google Play Console → create application → fill in listing
4. Production → Create release → upload AAB → submit for review

## Publishing to Apple App Store
1. In Xcode: Product → Archive
2. Organizer → Distribute App → App Store Connect
3. Go to App Store Connect → create app → fill in listing
4. Select uploaded build → submit for review

## App configuration
- App ID: com.brainyspark.app (change in capacitor.config.ts)
- App Name: BrainySpark
- Splash screen: Dark (#0f172a), 2 second display
- Status bar: Dark style on dark background
