# Pocket Slots

A phone-friendly, free slot-building score game. No accounts, payments, external dependencies, or build step. Run state, sound preference, and personal best are stored locally when browser storage is available.

## Play locally

From the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open the `/pocket-slots/` path on that server. Use a modern browser with JavaScript enabled. Tap the yellow button or press Space to spin. Sound is optional and starts only after interaction. Reduced-motion preferences are respected.

## Rules

- 20 spins; 1,000 points wins the run. All 20 spins count toward your final score.
- Each of three reels independently picks one of the six recipe slots with equal probability, using the browser's cryptographic random source. Duplicate symbols increase their probability.
- Every symbol pays base points. Two matching symbols each pay twice their base; three each pay three times their base.
- Diamonds double adjacent non-diamond symbol payouts after matching bonuses. Two adjacent diamonds multiply their shared neighbor by four. Diamonds never multiply other diamonds.
- Each clover adds 18 points when the line contains a pair or triple. Each magnet adds 36 points per coin anywhere on the line. These bonuses are added after all multipliers.
- After spins 4, 8, 12, and 16, choose one of three randomly offered special symbols and replace one recipe slot. All reels use the same recipe.
- Spin outcomes and upgrade offers are saved before animations finish. Reloading resumes the run instead of rerolling it.

## Validate

```sh
node pocket-slots/tests/engine.test.mjs
node --check pocket-slots/app.js
```

Manual browser checks: complete a run, make all four upgrades, reload during a run and a pending upgrade, check the finish/restart flow, keyboard controls, symbol guide, and sound toggle. Test a narrow phone viewport and reduced motion. No automatic spins or automatic restarts.

## Publish

The game is a static folder intended for the repository's GitHub Pages site at `/pocket-slots/`. Deployment depends on the repository's Pages settings; pushing source files alone does not confirm a successful deployment.
