# iOS (App Store)

Not generated yet. This folder is the App Store shell only.

The game itself stays in `../src`. On a Mac:

```bash
cd ..
npx cap add ios
npx cap sync ios
npx cap open ios
```

Do not put hall / chess / HUD changes here — those belong in `../src` so
Android and the website stay in sync.
