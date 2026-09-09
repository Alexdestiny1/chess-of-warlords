# Platforms

The hall is built **once** in `web/src`. Each store gets its own folder so a
later change can be aimed at Android, iOS, Windows, or the shared game without
touching the others.

| Path | Ships as | Touch this when |
| --- | --- | --- |
| `web/src/` | Every build | Rules, 3D, HUD, menus, ad *logic* |
| `web/` (Vite, `vercel.json`, `public/`) | Browser site (Vercel) | Hosting, `ads.txt`, share cards |
| `web/android/` | Google Play / APK | Gradle, icons, AdMob **app id**, Play listing |
| `web/ios/` | App Store | Xcode, Info.plist, Apple IAP (not generated yet) |
| `web/desktop/` | Microsoft Store / PC installer | Electron or Tauri wrapper (not generated yet) |

PC players can already use the website. A Microsoft Store package is a later
wrapper around the same `web/src` game.

## How to ask for a change

Say which target you mean:

- **shared / all platforms** — edit `web/src`
- **android only** — edit `web/android` (and AdMob ids)
- **ios only** — edit `web/ios`
- **windows / desktop only** — edit `web/desktop`

Commit scopes follow the same names: `feat(android): …`, `fix(ios): …`,
`feat(desktop): …`, `fix(ui): …` for shared interface work.

## Commands

```bash
cd web
npm run dev              # website, all platforms' game code
npm run build            # shared bundle in dist/
npm run android:sync     # copy that bundle into the Android shell
```

iOS: `npx cap add ios` on a Mac, then `npx cap sync ios`.
Desktop: add Electron or Tauri under `web/desktop/` when you are ready for
the Microsoft Store.
