# Visual Direction: Dog's Absurd Toy Box

Status: proposed direction, not a shipped visual redesign.

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

## Open choices for the owner

- Does the dog have a name that should be used in the game?
- Should its personality lean toward a smug referee or a chaotic teammate?
- Which theme is most exciting for the first redesigned chapter?
