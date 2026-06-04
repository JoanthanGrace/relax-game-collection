# Contributing

Thanks for considering a contribution to NiceTap.

NiceTap is a mobile-first, absurd puzzle game collection. Contributions should preserve the core promise: short, funny, fair, and surprising levels.

## Before You Start

Please read:

- [docs/level-production-rules.md](docs/level-production-rules.md)
- [docs/puzzle-game-reference.md](docs/puzzle-game-reference.md)
- [docs/release-log.md](docs/release-log.md)

## Development Setup

```bash
pnpm install
pnpm dev:web
```

Run checks before opening a pull request:

```bash
pnpm run ci
```

## Level Contributions

New level proposals should include:

- Level title
- Surface instruction
- Player first instinct
- Correct solution
- Wrong-solution feedback
- Hints
- Difficulty
- Interaction type
- Presentation style: 2D, 2.5D, or 3D
- Asset needs and size risk
- Why the level is worth adding

Rules:

- Keep gameplay inside the `400 x 600` logical canvas.
- Prefer config-only levels.
- Do not copy another game's exact layout, art, sequence, or name.
- No pixel hunting, pure luck, or external knowledge.
- Required touch targets should be mobile-friendly.

## Bug Reports

Please include:

- Device model
- Browser
- OS version
- Whether it was opened in WeChat, Safari, Chrome, or PWA home-screen mode
- What happened
- What you expected
- Screenshot or screen recording if possible

## Assets

Runtime assets must pass:

```bash
pnpm check:assets
```

Concept art and unused variants belong under `docs/assets`, not `apps/web-app/public`.

TinyPNG/Tinify can be used locally:

```bash
TINIFY_API_KEY=<key> pnpm compress:tinypng -- <file-or-dir> --in-place
```

Do not commit API keys or secrets.

## Pull Requests

Pull requests should:

- Describe the change clearly.
- Link related issues when applicable.
- Include test/validation results.
- Update docs when behavior or release process changes.

Small, focused pull requests are easier to review.
