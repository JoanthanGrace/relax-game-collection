# Release Log

This file records public releases, deployment notes, verification results, and follow-up risks for NiceTap.

## Unreleased - Gameplay polish - 2026-10-05

### Changes

- Keep dragged objects inside the game canvas. Legacy "drag off screen" puzzles now resolve at the edge instead of requiring an object to disappear.
- Show progressive hints only when the player presses the hint control.
- Allow three free skips per local calendar day, stored separately from progress so clearing progress does not reset the quota.
- Distinguish skipped levels from manually solved levels, unlock the next level after skipping, and allow skipped levels to be solved later.
- Reload the scene on every retry, including retries using the same level configuration.
- Keep the current level URL in sync with progression so refreshing does not return to an earlier level.
- Resize the canvas when its container changes, and remove duplicate desktop centering.
- Fix Tinify downloads, add request timeouts, and replace files atomically only after a successful download.
- Record a richer dog-led toy-box visual direction; the full visual redesign is not included in this change.
- Exclude compiled test copies from test discovery so results count source tests once rather than depending on whether a previous build exists.

### Release status and limitations

- Development branch: `feat/gameplay-polish`. Not deployed to production yet.
- Existing `nicetap:progress:v1` saves remain compatible; `skippedLevelIds` is additive.
- Daily quota is browser-local. Changing device, clearing site storage, or changing the local clock can bypass it. A real rewarded-ad system will require trustworthy reward verification; no fake ads are provided here.
- No paid advertising provider has been installed. When the quota is exhausted, the UI explicitly says advertising unlock is not available.
- Tinify tests use simulated network responses; live API compression still requires an owner-provided key and may consume the provider's allowance.

### Verification

- `pnpm run ci`: passed; 30 level configurations, asset budgets, 209 source unit tests, and all workspace type checks.
- Previous 410-test totals included compiled copies of the 205 original source tests. The new total excludes duplicates and adds four source regression tests.
- `pnpm test:e2e`: 15 passed, including mobile-size hints, skip quotas, progress migration, manual replay, final-level progression, drag-to-edge puzzles, and failed-scene retries.
- `pnpm build:pages`: passed. The existing large Phaser bundle warning remains.
- Screenshot checks cover 390 x 844 and 1280 x 800; real-device Safari, WeChat browser behavior, and audible sound still need owner testing.

## v0.1.0-mvp - 2026-06-02

### Release type

MVP static web release.

### Target deployment

- Platform: GitHub Pages
- Production URL: `https://joanthangrace.github.io/relax-game-collection/`
- Build command: `pnpm build:pages`
- Build output: `apps/web-app/dist`
- Deployment branch: `gh-pages`
- SPA fallback: `404.html` is copied from `index.html` for GitHub Pages history routing.

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
- Audio files should be loaded with the configured app base path on GitHub Pages.
- Production manifest should reference:
  - `icon-192.png`
  - `icon-512.png`
  - `apple-touch-icon.png`
- `apps/web-app/dist/404.html` should exist after `pnpm build:pages`.

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
