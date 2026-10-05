# Visual Direction: Dog's Absurd Toy Box

Status: first home-screen and level-008 prototype implemented on `feat/amei-toybox`; not yet deployed.

The approved direction is extended on `feat/50-levels` with two additional ten-level chapters: Amei's Slacking Workshop and Absurd Repair Station. These use tactile 2D controls and the shared mascot, not real-time 3D. The chapter strip scrolls horizontally on narrow phones; all 50 levels remain available through the map. Detailed production notes live in `level-design-31-50.md`.

## Confirmed character

The dog is named Wang Amei (王阿妹). Amei is a chaotic, affectionate teammate, not a sarcastic judge. Jokes should share the player's misfortune and celebrate joint success. Amei can cause small accidents, volunteer questionable help, and take a comically oversized share of the credit, but should never humiliate the player.

## Creative ownership

- The owner supplies ideas, jokes, themes, and play feedback.
- Engineering chooses implementation details and verifies mobile usability.
- Costs, external advertising services, privacy-sensitive analytics, and irreversible changes require owner approval.

## Direction

Move beyond blank backgrounds and text-only puzzles into a colorful, tactile toy world hosted by the existing brown-and-white dog mascot. Preserve the dog's white face stripe, floppy ears, and expressive eyes. The mascot should react to play, not merely sit in the app icon.

- Home: a playable chapter map, with a dog portrait, visible progress, and themed destinations. No marketing landing page.
- Levels: recognizable physical props, generous hit areas, compact instructions, and clear silhouettes. Visual jokes must support the actual puzzle.
- Feedback: short squash-and-stretch reactions, exaggerated facial expressions, and restrained sound effects. Failed attempts can be gently teasing without insulting the player.
- Themes: start with a small number of distinct worlds, such as a messy desk, a toy workshop, and a plumbing laboratory. Romance jokes remain occasional.
- Palette: off-white and charcoal structure, with coral, sky blue, yellow, and mint accents. Avoid a predominantly green, beige, or purple interface.
- Motion: a few intentional animations per scene, with reduced-motion support in the future redesign.
- No decorative floating cards around the game; no tiny controls or textures obscuring the puzzle.

## Technology

Keep Vue, Pinia, TypeScript, and Phaser for the existing 2D game. Use real bitmap mascot and prop assets rather than decorative SVG illustrations. Add Three.js only for selected puzzles that genuinely benefit from depth or rotation; lazy-load it so ordinary levels do not pay the cost. Use Lucide for conventional UI controls.

## Rollout

1. Stabilize drag boundaries, hints, retries, and daily skip progress.
2. Validate one redesigned home screen and one representative level on mobile before reskinning all 30 levels.
3. Expand to themed chapters using reusable prop and animation conventions.

Existing level-production rules continue to govern layout, asset budgets, and progression. This direction supersedes the old visual-system requirement that every background must be plain white. The old document is historical MVP guidance, not the final target.

## First prototype

- Home keeps all 30 levels and existing progression, with themed chapter navigation and tactile level tokens.
- Level 008 keeps its original drag-to-edge win event and adds a toy cloud, sun, and Amei's dialogue and celebration.
- The mascot is an AI-generated transparent bitmap derived from the established dog icon, prepared as a 384px shared PNG. The icon itself is unchanged.
- This is a 2D Phaser scene using a 3D-style rendered mascot, not a real-time 3D level.
- Later chapters currently receive visual labels only. Their existing puzzles are not being misrepresented as new themed content.
