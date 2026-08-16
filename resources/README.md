# App Icons & Splash Screen Resources

Place your app icon and splash screen source files here before generating native assets.

## Required source files

- `resources/icon.png` — 1024x1024 px app icon (no transparency for iOS)
- `resources/splash.png` — 2732x2732 px splash screen image

## Generate native icons & splash screens

After adding the source files, install the Capacitor asset generator:

```bash
npm install --save-dev @capacitor/assets
```

Then run:

```bash
npx capacitor-assets generate --android
npx capacitor-assets generate --ios
```
