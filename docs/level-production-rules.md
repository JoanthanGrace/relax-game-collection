# Level Production Rules

Version: v0.2

This document defines the production rules for creating new NiceTap levels. Every new level proposal, JSON config, custom script, and visual update must follow these rules before it can be merged.

## 1. Core Product Direction

NiceTap is a short-session, absurd, anti-routine puzzle game. A level is good when the player quickly understands the surface task, tries a normal solution, gets lightly tricked, then laughs at the actual solution.

Every level must satisfy these five baseline goals:

- The player can understand the surface objective within 3 seconds.
- The correct solution is surprising but fair after the reveal.
- The level has one primary joke or twist, not several unrelated tricks.
- Failure feels funny, not punishing.
- The level can be completed without external knowledge, random guessing, or pixel hunting.

## 2. Hard Layout Rules

The current game canvas is `400 x 600`. Level content is authored with normalized coordinates and must fit inside the visible game container on all supported phone sizes.

### Required Bounds

- No gameplay object may require interaction outside the `400 x 600` logical canvas.
- No object may visually escape the canvas unless the escape itself is the designed interaction and still remains controllable from inside the canvas.
- No required target may be smaller than `32 x 32` logical pixels.
- Primary touch targets should be at least `44 x 44` logical pixels.
- Required text must not be clipped, overlapped, or hidden by the page header, instruction bar, hint toast, win overlay, or fail overlay.
- Drag targets must leave enough travel distance for a finger to operate them without covering the success area completely.
- Objects using `dragBounds: "none"` must include a reason in the level notes and must not be able to permanently strand the level.

### Safe Zones

Treat these as default placement rules:

- Top 8% of the canvas: avoid placing tiny required targets unless the level is explicitly about the title or header.
- Bottom 10% of the canvas: avoid placing required targets near mobile browser gestures.
- Left/right 5% edges: avoid precision targets; use only for large draggable exits or visual staging.
- Center 70%: preferred area for the main joke, primary object, and first interaction.

## 3. Page-Level Rules

The app shell and the level canvas must stay visually and functionally separate.

- The Vue page shell is stable: back button, progress text, title, instruction, hint, win/fail overlays.
- The Phaser level canvas is chaotic: buttons, text, fake UI, objects, tricks.
- A level may reference page UI only when the joke is explicitly system-meta or fourth-wall.
- If a level uses page UI as a puzzle element, it must still be understandable after screen scaling.
- A level must never require users to use browser navigation, OS gestures, browser address bar, browser refresh, or external device settings.
- PWA/home-screen mode and normal browser mode must both remain playable.

## 4. Visual Style Rules

NiceTap should feel meme-able, expressive, and slightly wrong in a deliberate way. The early game may keep a clean white absurd UI, but later chapters are allowed to become richer, toy-like, 2.5D, or 3D when that improves the joke.

- App shell: clean, stable, readable, system UI style.
- Level content: allowed to be silly, hand-drawn, exaggerated, fake, toy-like, 2.5D, or 3D.
- Use high saturation only for one main visual focus per level.
- Do not make the entire level one color family.
- Do not rely on tiny visual differences as the solution.
- Important visual states must be readable at small phone sizes.
- If a level uses 2.5D or 3D, the extra depth must support the puzzle, not just decorate it.
- Rich visuals are encouraged for themed chapters, but they must not reduce readability, speed, or touch accuracy.

## 5. Supported Level Presentation Types

New levels may use multiple presentation styles:

### 2D

Use for text tricks, fake UI, buttons, simple drag puzzles, and fast jokes.

Rules:
- Keep silhouettes clean.
- Keep motion short and readable.
- Prefer simple shapes and text when the joke is verbal.

### 2.5D

Use for fake depth, layered objects, cards, doors, panels, stacked buttons, or perspective tricks.

Rules:
- Depth must not hide required targets unfairly.
- Parallax or layering must not break touch hit areas.
- Shadows must not be confused with real interactive objects unless that is the joke.

### 3D

Use for toy-like objects, rotating props, fake machines, absurd physical interactions, or mascot moments.

Rules:
- 3D controls must remain simple: tap, drag, rotate, or swipe.
- No level may require precise 3D camera manipulation.
- 3D object hit areas must be forgiving.
- Performance must stay smooth on mid-range mobile devices.

## 6. Interaction Rules

Allowed baseline interactions:

- click
- multi-click
- long-press
- drag
- swipe
- wait
- pinch
- toggle

Expandable interactions, only after review:

- simple 2D physics
- simple 3D rotation
- accelerometer or fake accelerometer interaction
- vibration
- orientation or tilt
- sound-related interaction
- camera-like fake UI
- typing or keypad input

Not allowed for normal levels:

- real permission prompts
- real camera/microphone access
- location access
- external login
- payments
- clipboard dependence
- real system settings dependence

Real device capabilities are allowed in later levels only when:

- The level asks for them clearly.
- The browser/platform supports them safely.
- A graceful fallback exists for unsupported devices.
- No required system permission blocks the core game loop.

## 7. Difficulty Rules

Difficulty should vary, but frustration must stay low.

### Easy

- Expected solve time: 3-10 seconds.
- One obvious object, one reversal.
- Good for onboarding and rhythm recovery after a hard level.

### Medium

- Expected solve time: 10-25 seconds.
- One misdirection plus one observation.
- Can require retrying once or twice.

### Hard

- Expected solve time: 25-60 seconds.
- Multi-step or meta reasoning allowed.
- Must include stronger hints.
- Do not place two hard levels back to back unless the second is visually very different.

### Very Hard / Special

- Reserved for chapter finales, events, or special shareable levels.
- Expected solve time may exceed 60 seconds only with explicit approval.
- Must have a strong payoff and clear post-solve feeling of "this was fair".
- Requires manual mobile testing before release.

Difficulty does not need to increase strictly. Prefer rhythm over a straight difficulty ramp, for example: easy, easy, medium, hard, easy. After a hard or special level, add a lower-pressure level to restore momentum.

## 8. Content Variety Rules

Avoid repeating the same trick too often.

- The same primary joke type cannot appear 3 times in a row.
- The same interaction type should not dominate more than 4 levels in a row.
- Every 10-level block should include at least:
  - 3 interaction types
  - 3 joke types
  - 1 visual surprise
  - 1 low-pressure easy level
  - 1 higher-share-potential level
- If a new level resembles an existing one, its solution path, emotional beat, or visual metaphor must be meaningfully different.

Themed chapters are encouraged. Candidate chapter themes include:

- fake UI and system tricks
- dog mascot mischief
- office slacking
- physics nonsense
- 3D toy box
- relationship/crush jokes
- fake ads and popups
- meta browser/PWA jokes

## 9. Fairness Rules

A level can lie, but the game must not feel broken.

- The wrong solution should produce feedback within 1 second.
- The player should never wonder whether the app froze.
- The correct solution must be inferable from the screen, title, instruction, previous learning, or hint.
- Hints must escalate from playful nudge to actionable direction.
- Randomness may add flavor but cannot determine whether the level is solvable.
- A level cannot depend on a specific phone brand, screen ratio, browser, or OS.

## 10. Failure and Hint Rules

Every non-tutorial level should define:

- One fail text that is funny and specific to the wrong assumption.
- Hint 1: a soft nudge.
- Hint 2: a stronger direction.
- Optional Hint 3 for hard levels: near-explicit answer.

Failure copy should:

- tease the action, not the player personally.
- allow light sarcasm, cute teasing, and current internet meme phrasing.
- avoid harsh insults, shame, or hostility.
- be short enough to read instantly.
- preferably be screenshot-worthy.

Hints are player-triggered by default. Do not auto-show hints just because time has passed or the player has failed. A level may highlight that a hint exists, but the player should choose to tap it.

Hints should use this escalation:

- Hint 1: playful nudge.
- Hint 2: clearer direction.
- Hint 3: near-answer, only for hard or special levels.

## 11. Mascot Rules

The dog mascot is allowed and encouraged inside levels, not only in branding.

Approved roles:

- trickster guide
- fake helper
- visual punchline
- button guardian
- emotional reaction character
- chapter host

Rules:

- The mascot should not explain every answer directly.
- The mascot may mislead the player, but the misdirection must be funny and fair.
- The mascot should not overcrowd every level; use it when it improves the joke or screenshot value.
- Mascot levels should preserve the brown-and-white border collie identity: white blaze, white muzzle/chest, brown fur, expressive ears, clever or mischievous face.

## 12. Skip and Monetization-Ready Rules

Skipping is allowed, but limited.

- Players may skip levels after repeated failure or by choosing a skip action.
- Skips should have a daily limit.
- The exact daily free skip count is TBD.
- Once the daily limit is reached, the UI may later offer ad-unlocked skips.
- MVP builds must not require ads; the design should only reserve the future flow.
- A skipped level should remain visible as skipped, not completed, unless product rules later decide otherwise.
- Skipping must not break linear unlock, progress storage, or chapter completion logic.

Ad-prep rules:

- Do not hard-code ad platform logic into level configs.
- Keep skip/ad decisions in app-level state, not individual level scripts.
- Avoid designing levels that are intentionally unfair just to force ad skips.

## 13. Share Moment Rules

Some levels should be designed for sharing, not every level.

Share-oriented levels should include at least one of:

- a funny final screen
- a dog mascot reaction
- a ridiculous fake UI state
- a punchline text that is readable in a screenshot
- a surprising before/after transformation
- a clean "what is happening here?" visual composition

Every 10-level block should include at least one screenshot-worthy level. Do not make every level visually loud; contrast helps the standout moments land.

## 14. Internet Meme Copy Rules

Internet meme phrasing is allowed.

Rules:

- Use current meme language when it improves the joke.
- Avoid making the core solution depend on knowing a meme.
- Prefer short phrases that still work after the meme ages.
- Mix light sarcasm and cute absurdity.
- Avoid overusing any one catchphrase.

## 15. Fake Ads and Popups

Fake ads, fake popups, fake close buttons, and fake system prompts are allowed, but should not dominate the game.

Rules:

- Use them as occasional high-impact jokes.
- Do not make them feel like real ad harassment.
- Do not use real brand names or real ad network UI.
- Make the fake nature clear after interaction.
- Keep close/escape behavior fair.

## 16. Technical Implementation Rules

Prefer config-only levels. Write custom code only when the existing config system cannot express the idea cleanly.

### Config-First

Use JSON config when the level can be built from:

- objects
- interactions
- conditions
- reactions
- visibility changes
- basic animations
- basic drag/click/swipe/wait/toggle behavior

### Custom Script Allowed

Use custom script when the level needs:

- multi-step internal state that is hard to express declaratively.
- fake system behavior.
- complex sequence logic.
- 2.5D/3D interaction helpers.
- special animation timing.

Custom scripts must:

- stay scoped to one level or one reusable mechanic.
- not modify global app state unless explicitly required.
- provide a fallback path if an interaction fails.
- not access browser APIs directly from core packages.

## 17. Asset Rules

- Public runtime assets must only include files needed by the shipped app.
- Concept art, source images, and discarded variants belong under `docs/assets`.
- Large assets must be justified before being added to `public`.
- New audio must be short, compressed, and tested on mobile.
- New images must be readable at the final displayed size.
- 3D assets must be optimized before shipping.

## 18. Performance Rules

Every level must feel instant.

- Initial interaction response should be immediate.
- Avoid long blocking animations.
- Avoid huge uncompressed assets.
- Avoid unnecessary runtime network requests.
- If adding 3D, test on mobile before release.
- A level may be visually rich, but it must not slow down the next-level loop.

## 19. Accessibility and Comfort Rules

- Do not rely only on color to distinguish correct and wrong objects.
- Avoid flashing effects faster than 3 times per second.
- Avoid very loud, sharp, or repeated audio.
- Do not require high precision motor control.
- Do not require reading dense paragraphs.
- Avoid jokes that target real people, protected groups, illness, disasters, or private information.

## 20. New Level Proposal Template

Every new level idea should start with this template:

```md
## Level Proposal

- Level ID:
- Title:
- Surface instruction:
- Difficulty: Easy / Medium / Hard / Special
- Presentation: 2D / 2.5D / 3D
- Primary interaction:
- Primary joke type:
- Share moment: Yes / No
- Mascot role: None / guide / trickster / reaction / obstacle / host
- Player first instinct:
- Correct solution:
- Wrong solution feedback:
- Hint 1:
- Hint 2:
- Required objects:
- Required assets:
- Config-only or custom script:
- Layout risk:
- Mobile risk:
- Skip behavior:
- Device capability required:
- Similar existing level:
- Why this level is worth adding:
```

## 21. Pre-Merge Checklist

Before a level is merged:

- [ ] It fits inside the `400 x 600` canvas.
- [ ] No required object is clipped or unreachable.
- [ ] Touch targets are large enough.
- [ ] Text is readable on mobile.
- [ ] It has one clear primary joke.
- [ ] It does not repeat the previous two levels' joke type.
- [ ] It has fail text and hints.
- [ ] Hints are player-triggered unless explicitly approved otherwise.
- [ ] Skip behavior is defined for hard or special levels.
- [ ] Device capability usage has a fallback.
- [ ] If it is share-oriented, the screenshot moment is readable.
- [ ] It passes level validation.
- [ ] It works in local preview.
- [ ] It works after `pnpm build:pages`.
- [ ] It does not add unnecessary public assets.
- [ ] It has been recorded in the relevant planning or release notes when included in a release.

## 22. Remaining Open Decisions

These decisions are still open and should be finalized before implementing the next major level batch:

- Exact daily free skip count.
- Whether skipped levels count toward chapter completion.
- Whether 3D becomes a normal production style or remains mostly for special/theme levels.
- Whether portrait mobile is the only hard requirement, or desktop parity is required for all levels.
- Maximum runtime asset budget per level.
- Whether relationship/crush jokes are allowed as a full chapter theme or only occasional one-off levels.
