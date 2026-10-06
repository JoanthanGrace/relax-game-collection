# Toy Warehouse Visual Prototype

## Scope

Level 032 is the first playable visual sample for the owner's chosen refined toy/clay direction. The home and level-selection page are unchanged. Other levels keep their existing renderer; this is not a fifty-level art overhaul.

## Art Direction

- Orthographic real-time Three.js scene, with rounded miniature meshes, matte materials, soft shadows, and pale flooring.
- Coral courier robot, apricot wooden crates, mint delivery pads, and blue-gray low walls. No mandatory mascot decoration.
- Props communicate their actual state: crates move between cells, delivery pads change color, and the delivery counter updates.
- Low walls preserve visibility. Camera framing responds to the available portrait area; control buttons remain separate from the board.
- Existing authored Sokoban puzzle and immutable model remain authoritative. No visual action changes puzzle rules.

## Interaction And Compatibility

Directional touch controls and keyboard arrows; 180ms eased movement with a small walking hop. Reduced-motion preference removes travel animation. Undo/reset cancel outstanding motion and restore authoritative state. Hints remain user-triggered. Success follows the last movement, then persists through the existing game-page callbacks.

The Three.js component is loaded separately. Pixel ratio is capped at two, shadow map is 1024px, and geometry is procedural with no external model/texture requests. WebGL initialization failure or context loss falls back to the existing playable Phaser scene (the current puzzle attempt restarts; saved progress and skip quota are untouched). Animation loops, listeners, geometry, materials, and renderer are disposed when leaving the level.

## Acceptance

Automated browser checks include 320px/390px/1280px screenshots, canvas color/pixel diversity, visible movement, touch completion, hints, undo/reset, progress persistence, and WebGL fallback. These are technical checks, not owner approval of the art direction. Real-device Safari/WeChat performance remains a release prerequisite.

## Next Samples

After owner review, use a 2.5D animated pipe-workbench for level 033 and layered paper animation for rule/district puzzles. Choose the renderer to suit each mechanism rather than making every level 3D. Keep recognizable props and thinking challenges; animation is feedback, not a replacement for a puzzle.

Reference: [Three.js official documentation](https://threejs.org/docs/).
