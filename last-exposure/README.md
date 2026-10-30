# Please Collect Your Photos

A compact first-person horror story set in a rainy, after-hours photo lab. Designed for a laptop/desktop browser, keyboard, and mouse. The guided route takes roughly three minutes; exploration and inspecting photographs can extend it.

## Run

From the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `/last-exposure/` on the server. There is no build step. Three.js 0.170.0 is bundled locally in `vendor/` with its MIT license, so runtime code and assets do not depend on a CDN. A browser with WebGL 2 is required.

## Controls

- WASD: walk. Mouse: look. Arrow keys also control the view.
- E: interact or lower an inspected photograph.
- Escape: pause. Click **Return to the shop** to resume.
- If pointer lock is unavailable, click and drag to look.
- Sound, steady-camera mode, and mouse sensitivity are configurable before starting. The system's reduced-motion preference enables the steady camera by default.

The game pauses when the tab is hidden or loses focus. It does not persist a story between reloads. Restarting requires confirmation from the pause menu; replay is available after the ending.

## Structure

- `story.mjs`: interaction order, development timings, and collision rules.
- `scene.mjs`: procedural shop, apartment scenes, rain, materials, and photographic captures.
- `audio.mjs`: locally synthesized rain, fluorescent hum, footsteps, bell, telephone, paper, and unsettling noise. Written dialogue is subtitled; recorded voice acting is not included.
- `app.mjs`: movement, camera, interaction, story presentation, pause, and ending.
- `style.css`: interface and film overlays.

The first three prints are rendered from an apartment scene. The fourth is captured from the actual darkroom with a representation of the player's current position, then developed into a second exposure with another figure. No external photo or audio assets are fetched. No gore, pursuit, full-screen strobing, or automatic restarts.

Resolution reduces automatically when rendering is slow. Static shadows are cached, device pixel ratio is capped, and the scene stops rendering behind pause/inspection screens. Hardware-specific performance should be checked on the player's laptop.

## Validation

```sh
node last-exposure/tests/story.test.mjs
node --check last-exposure/app.mjs
node --check last-exposure/scene.mjs
node --check last-exposure/audio.mjs
```

Browser checks should exercise the full route using actual movement: collect the envelope; develop/lift print 1; check the bell; develop/lift print 2; answer the phone; develop/lift print 3; deliver the prints; develop/lift the extra print; lower it and turn around. Verify pause/resume, replay, actual photo pixels, collision at the partition, pointer-lock fallback, and no runtime errors.

`inspectState()` is a read-only export for browser diagnostics. It cannot alter the story, position, or game settings. Browser automation should poll this function using `page.evaluate` in the main page context; do not import the application into an isolated browser context, where modules have a separate lifecycle.

## Publishing

Deploy the repository through GitHub Pages. The intended public path is `/last-exposure/`. Preserve the existing site and `/pocket-slots/` when updating this experience.
