# Puzzle Game Reference Library

This document collects reference games and design patterns for future NiceTap levels. It is for inspiration only: do not clone level layouts, art, names, or exact mechanics. Extract the underlying puzzle design idea, then translate it into NiceTap's short, absurd, mobile-first format.

## Research Notes

- "Baby It's You" is likely **Baba Is You**, the Steam indie puzzle game about manipulating rule blocks.
- Priority references are short-session puzzle games, Sokoban-like games, route/connection games, perspective tricks, cozy sorting games, and 2.5D/3D spatial puzzles.
- NiceTap should borrow design principles, not content. The target is still: fast, funny, unfair-looking but fair, meme-able, portrait-mobile-first.

## Reference Table

| Game | Core Mechanic | What To Learn | NiceTap-Level Adaptation |
|------|---------------|---------------|---------------------------|
| [Baba Is You](https://store.steampowered.com/app/736260/Baba_Is_You/) | Rules exist as movable word blocks. Changing text changes how the level works. | A level can be solved by changing the rule system itself, not by moving toward a normal goal. Steam describes rules as blocks the player can manipulate to cause surprising interactions. | Text rules like `按钮 是 假`, `狗子 是 你`, `失败 是 通关`; player drags one Chinese word to rewrite the outcome. Keep each rule puzzle to one joke and one move for mobile. |
| [Pipe Push Paradise](https://store.steampowered.com/app/721390/Pipe_Push_Paradise/) | Push, flip, and roll pipe pieces on a tile grid. | Pipes are strong visual logic: connection, direction, rotation, blocked flow. Steam frames it as simple tile gameplay with surprising mechanical twists. | 2.5D pipe pieces that look like a normal connection puzzle, but the correct move is to connect the pipe to the dog bowl, the "wrong" button, or off-screen nonsense. |
| [Sokobond](https://store.steampowered.com/app/290260/Sokobond/) | Sokoban-style movement creates molecule bonds. | Push-box mechanics become fresher when each pushed object has meaning and constraints. Steam notes no chemistry knowledge is required. | Use symbols/emoji/Chinese words as "atoms"; player pushes `我`, `不`, `点` into a sentence or combines objects into a punchline. |
| [Patrick's Parabox](https://store.steampowered.com/app/1260520/Patricks_Parabox/) | Recursive boxes inside boxes. | Recursion creates "wait, the level is inside itself" surprise while staying visually simple. Steam says each puzzle contains a new idea and no filler. | A button opens a mini version of the same level; the real target is inside the tiny duplicate, or dragging the tiny level moves the big level. Use sparingly. |
| [Cosmic Express](https://steamdb.info/app/583270/info/) | Draw train routes through a constrained grid. | Route planning works when entries, exits, passengers, and no-overlap rules are clear. | Draw a one-stroke path for the dog to deliver a fake button. Twist: the path should avoid the obvious goal and route to "别点". |
| [Mini Motorways](https://store.steampowered.com/app/1127500) | Build roads for growing traffic. | Minimalist networks can start calm and become controlled chaos. Steam highlights roads, upgrades, changing cities, and shareable GIF exports. | One-screen road/line connection puzzle where every new road creates a worse problem; correct solution may be deleting a road or refusing to connect. |
| [A Little to the Left](https://store.steampowered.com/app/1629520/A_Little_to_the_Left/) | Sort, stack, and arrange household objects; mischievous cat disrupts order. | Cozy interaction, multiple solutions, and a cute chaos agent reduce frustration. Steam highlights drag-and-drop controls, multiple solutions, skip option, hint control, and a mischievous cat. | Dog mascot messes with a tidy layout. Player must make it "wrong enough" instead of perfect. Good for shareable dog reaction levels. |
| [Unpacking](https://store.steampowered.com/app/1135690/Unpacking) | Place belongings into rooms, revealing story through objects. | Object placement can tell a story without explicit dialogue. Steam describes it as part block-fitting puzzle, part home decoration, with life clues. | One tiny room/desk/phone screen where placing items reveals a joke: crush message, dog toy, fake homework, office slacking. Keep it one-screen and fast. |
| [Gorogoa](https://store.steampowered.com/app/557600/Gorogoa/) | Arrange and combine illustrated panels. | Panel rearrangement can make impossible visual connections feel intuitive. Steam describes lavishly illustrated panels arranged and combined in imaginative ways. | Four small panels inside the game canvas; align a dog paw, button, pipe, or text across panels to create a silly connection. |
| [The Pedestrian](https://store.steampowered.com/app/466630/The_Pedestrian/) | Rearrange and reconnect public signs in a 2.5D world. | The puzzle space can be the UI container itself. Steam describes rearranging/reconnecting signs to advance. | Move "screens", signs, modals, or app cards to reconnect exits. Useful for NiceTap's fake UI and page-meta chapters. |
| [Superliminal](https://store.steampowered.com/app/1049410/Superliminal/) | Forced perspective and optical illusions change object scale/meaning. | Perception can be the mechanic; size and distance can lie. Steam describes it as a first-person puzzle game based on forced perspective and optical illusions. | Mobile-safe version: drag object closer/farther in 2.5D to make the "tiny" button become huge, or make the huge obstacle shrink. No precision camera control. |
| [Manifold Garden](https://store.steampowered.com/app/473950/Manifold_Garden/) | Impossible architecture, repeated space, gravity manipulation. | Spatial rules can be beautiful and surreal, but must have a small readable rule. Steam describes reimagined physics/space and gravity manipulation. | Selective special levels: rotate gravity for a toy-like 3D room so a button "falls" into reach. Keep interaction simple: tap rotate, drag object. |
| [Viewfinder](https://store.steampowered.com/app/1382070/Viewfinder/) | Photos become world geometry. | Images can overwrite or reshape reality. Steam describes bringing pictures to life by placing them into the world. | A screenshot/photo card pasted onto the canvas creates a fake button or a bridge. Twist: the "photo" of the button is more real than the real button. |

## Mechanic Buckets For NiceTap

### 1. Rule Manipulation

Inspired by Baba Is You.

Possible NiceTap patterns:

- Move one word to make `失败 = 通关`.
- Swap `你` and `狗子` so the dog becomes the player.
- Delete the word `不` from `不要点`.
- Use title text as a rule object.

Constraints:

- One rule change per level at first.
- Always show the changed result immediately.
- Never require programming knowledge.

### 2. Push / Pipe / Grid Logic

Inspired by Sokobond, Pipe Push Paradise, and classic Sokoban.

Possible NiceTap patterns:

- Push a pipe to connect water to an absurd target.
- Push text blocks to create a meme sentence.
- Rotate pipes but the correct output is "leak into pass button".
- A pipe connection is visually correct but emotionally wrong; player must sabotage it.

Constraints:

- No large grids on mobile. Prefer `3x3`, `4x4`, or a single-row joke.
- Touch targets must stay large.
- Avoid long reset-heavy puzzles.

### 3. Route Drawing / Network Flow

Inspired by Cosmic Express and Mini Motorways.

Possible NiceTap patterns:

- Draw one path from dog to button, but dog refuses the obvious route.
- Connect houses to shops, but one "shop" is a fake close button.
- Draw a line that must not touch "normal logic".
- Use route deletion as the solution.

Constraints:

- Keep the route count low.
- Show route validity clearly.
- No complex traffic simulation for normal levels.

### 4. Cozy Sorting With Chaos Agent

Inspired by A Little to the Left and Unpacking.

Possible NiceTap patterns:

- Arrange desk items, but dog paw keeps nudging one object.
- Sort items by wrong criteria: "越离谱越对".
- Place a crush message in a drawer to pass.
- Tidy the screen until it is too tidy, then dog messes it up and unlocks pass.

Constraints:

- Multiple valid solutions are allowed if the level is about vibe, not exact logic.
- Avoid pixel-perfect placement.
- Good candidate for share moments.

### 5. Panel / Screen Reconnection

Inspired by Gorogoa and The Pedestrian.

Possible NiceTap patterns:

- Rearrange four panels to connect a dog paw to a button.
- Move fake app windows so an arrow exits one and enters another.
- Layer an image panel over text to change meaning.
- Use scroll/page frame as a puzzle object.

Constraints:

- Panels must be large enough to drag.
- State transitions must be clear.
- Avoid making the player manage too many panels.

### 6. Perspective / 2.5D / 3D Tricks

Inspired by Superliminal, Manifold Garden, and Viewfinder.

Possible NiceTap patterns:

- Drag object "closer" to scale it up.
- Rotate a small 3D room so gravity brings the button down.
- Paste a photo into the scene to create a real platform.
- A shadow is interactive, not the object.

Constraints:

- 3D is selective, not default.
- No precise camera manipulation.
- Must work on portrait mobile.
- Prefer one gesture per trick.

## Reference-To-Level Translation Rules

When using any reference game:

1. Identify the single core interaction.
2. Strip it down to one mobile gesture.
3. Add a NiceTap reversal, joke, or fake UI layer.
4. Add one failure response that makes the wrong assumption funny.
5. Check against `docs/level-production-rules.md`.
6. Do not copy the original game's puzzle layout, art style, naming, or exact sequence.

## Candidate New Chapter Themes

### Chapter: 狗子捣乱

References: A Little to the Left, Unpacking.

Theme: the dog mascot appears as a playful chaos agent. Levels are cute, readable, and screenshot-friendly.

Example ideas:

- Dog hides the pass button under its paw.
- Dog rearranges a tidy desk; player must stop tidying and follow the dog.
- Dog gives a fake hint that is wrong but reveals the real target through its expression.

### Chapter: 规则写错了

References: Baba Is You, Gorogoa.

Theme: text and panels change the game rules.

Example ideas:

- `按钮 是 假` can be changed to `按钮 是 狗`.
- Drag "通关" from the instruction into the scene.
- Rearrange panels so a sentence becomes true.

### Chapter: 管道和路线都不正经

References: Pipe Push Paradise, Cosmic Express, Mini Motorways.

Theme: pipes, roads, wires, and train lines connect to ridiculous destinations.

Example ideas:

- Connect water to dog bowl instead of the exit.
- Draw road away from the destination to reduce traffic.
- Rotate a pipe to spill water onto the fake button.

### Chapter: 2.5D/3D 玩具盒

References: Superliminal, Manifold Garden, Viewfinder, The Pedestrian.

Theme: selective 2.5D/3D levels with toy-like manipulation.

Example ideas:

- Rotate a cube-room to make the button fall.
- Drag a tiny photo into the level to create a bridge.
- Scale a button by changing its perceived distance.

## Source List

- Baba Is You Steam page: https://store.steampowered.com/app/736260/Baba_Is_You/
- Pipe Push Paradise Steam page: https://store.steampowered.com/app/721390/Pipe_Push_Paradise/
- Sokobond Steam page: https://store.steampowered.com/app/290260/Sokobond/
- Patrick's Parabox Steam page: https://store.steampowered.com/app/1260520/Patricks_Parabox/
- Cosmic Express SteamDB page: https://steamdb.info/app/583270/info/
- Mini Motorways Steam page: https://store.steampowered.com/app/1127500
- A Little to the Left Steam page: https://store.steampowered.com/app/1629520/A_Little_to_the_Left/
- Unpacking Steam page: https://store.steampowered.com/app/1135690/Unpacking
- Gorogoa Steam page: https://store.steampowered.com/app/557600/Gorogoa/
- The Pedestrian Steam page: https://store.steampowered.com/app/466630/The_Pedestrian/
- Superliminal Steam page: https://store.steampowered.com/app/1049410/Superliminal/
- Manifold Garden Steam page: https://store.steampowered.com/app/473950/Manifold_Garden/
- Viewfinder Steam page: https://store.steampowered.com/app/1382070/Viewfinder/
