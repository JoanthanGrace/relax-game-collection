# NiceTap

NiceTap is an open-source, mobile-first, absurd puzzle game collection.

The game is built around short anti-routine levels: the instruction looks simple, the obvious answer is often wrong, and the real solution should make the player think "this is ridiculous, but fair."

## Play

MVP web build:

https://joanthangrace.github.io/relax-game-collection/

NiceTap is a PWA. On mobile, open the link in Safari or Chrome and add it to the home screen for an app-like experience.

## Status

Current release: `v0.1.0-mvp`

The MVP includes:

- 30 playable levels
- local progress storage
- PWA install support
- mobile-first web UI
- 3D dog mascot app icon
- static GitHub Pages deployment
- CI checks for levels, tests, typecheck, and runtime asset budget

See [docs/release-log.md](docs/release-log.md) for release history.

## Design Direction

NiceTap focuses on:

- short levels, usually 3-60 seconds
- simple inputs: tap, drag, swipe, wait, long-press, pinch, toggle
- funny failure copy
- fair but surprising solutions
- no pixel hunting, pure luck, or external knowledge
- strong screenshot/share moments

New levels must follow [docs/level-production-rules.md](docs/level-production-rules.md).

Puzzle-game inspiration is collected in [docs/puzzle-game-reference.md](docs/puzzle-game-reference.md).

## Tech Stack

- Frontend: Vue 3, Vite, TypeScript, Phaser, Pinia
- Game logic: config-first level system
- Backend placeholder: NestJS
- Testing: Vitest, Playwright
- Workspace: pnpm workspace, Turborepo
- Deployment: GitHub Pages

## Repository Structure

```text
apps/
  web-app/       Vue 3 PWA shell and Phaser canvas container
  server/        NestJS backend placeholder
packages/
  shared/        shared types and validation
  game-core/     Phaser game engine core
  levels/        level configs and registry
docs/            product, architecture, release, and level-design docs
scripts/         validation, asset checks, and helper scripts
```

## Quick Start

Prerequisites:

- Node.js 18+
- pnpm 9.x

Install dependencies:

```bash
pnpm install
```

Start the web app:

```bash
pnpm dev:web -- --host 0.0.0.0
```

Build the web app:

```bash
pnpm --filter @nicetap/web-app build
```

Build for GitHub Pages:

```bash
pnpm build:pages
```

Run all CI checks locally:

```bash
pnpm run ci
```

## Useful Commands

```bash
pnpm check:levels      # validate all level configs
pnpm check:assets      # check runtime asset budget
pnpm test              # run Vitest tests
pnpm typecheck         # run TypeScript checks
pnpm build:pages       # build static GitHub Pages output
```

TinyPNG/Tinify compression helper:

```bash
TINIFY_API_KEY=<key> pnpm compress:tinypng -- apps/web-app/public/icon-512.png --in-place
```

The API key must stay local and must not be committed.

## Adding Levels

Before proposing or implementing a new level, read:

- [docs/level-production-rules.md](docs/level-production-rules.md)
- [docs/level-design-30.md](docs/level-design-30.md)
- [docs/puzzle-game-reference.md](docs/puzzle-game-reference.md)

New level proposals should include:

- surface instruction
- first wrong instinct
- correct solution
- fail copy
- hints
- interaction type
- difficulty
- layout risk
- asset budget
- whether it has a share moment

Config-only levels are preferred. Custom scripts should be used only when the declarative level system cannot express the mechanic cleanly.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

Good first contributions include:

- level ideas following the proposal template
- bug reports with device/browser details
- copywriting improvements for failure text and hints
- accessibility improvements
- mobile layout fixes
- asset-size reductions

## Release Process

1. Update [docs/release-log.md](docs/release-log.md).
2. Run `pnpm run ci`.
3. Run `pnpm build:pages`.
4. Deploy `apps/web-app/dist` to `gh-pages`.
5. Create a git tag such as `v0.1.0-mvp`.
6. Create a GitHub Release from the tag with release notes.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
