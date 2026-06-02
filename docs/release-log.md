# Release Log

This file records public releases, deployment notes, verification results, and follow-up risks for NiceTap.

## v0.1.0-mvp - 2026-06-02

### Release type

MVP static web release.

### Target deployment

- Platform: GitHub Pages
- Production URL: `https://joanthangrace.github.io/relax-game-collection/`
- Build command: `pnpm build:pages`
- Build output: `apps/web-app/dist`
- Deployment branch: `gh-pages`

### Highlights

- Added all 30 MVP levels.
- Enabled local browser progress storage.
- Enabled PWA support with service worker caching.
- Added installable app metadata for mobile and desktop.
- Replaced the default app icon with the 3D dog mascot icon.
- Configured the app for GitHub Pages subpath hosting.

### Verification

- `pnpm --filter @nicetap/web-app build`
- `pnpm build:pages`
- Production manifest should reference:
  - `icon-192.png`
  - `icon-512.png`
  - `apple-touch-icon.png`

### Known risks

- Browser progress is local-only. Clearing browser data or switching devices loses progress.
- GitHub Pages is static-only. Any future leaderboard, account login, or cloud save feature will need a backend.
- PWA icons can be cached by iOS/Android. Reinstalling from the home screen may be needed after icon changes.
- First load includes a large game bundle; future releases should consider route/code splitting.

### Follow-ups

- Add a stable custom domain before broader public sharing.
- Add a simple release checklist for future launches.
- Add cloud save or export/import once the gameplay loop is validated.
- Add basic analytics only after privacy expectations are clear.
