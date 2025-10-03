# Agents Guide: Rendering Parity Workflow

This repository includes helper scripts to compare our experimental renderer (Maid) with Mermaid CLI for visual parity. Use this guide when you need to debug or improve rendering fidelity across diagram types.

## Prerequisites

- Node.js ≥ 18
- Project built: `npm run build`
- Mermaid CLI is installed via devDependencies and used by the scripts.
- PNG rasterizer (any of the following):
  - `@resvg/resvg-js` (preferred, bundled as devDependency) — used when available
  - `rsvg-convert` (librsvg) or ImageMagick `convert` as fallbacks

Optional:
- Puppeteer no-sandbox config exists at `scripts/puppeteer-ci.json` (used by Mermaid CLI to run headless safely).

## What the comparison scripts do

For each valid diagram fixture, the scripts:

1) Render the diagram with Mermaid CLI to SVG (and then to PNG)
2) Render the same diagram with Maid to SVG (and then to PNG)
3) Save both outputs side-by-side
4) Produce a structural summary (counts of `<path>`, `<rect>`, colors, viewBox, etc.) and a diff JSON

Outputs live under `.tmp-compare-all/<type>/<name>/`:

- `<name>.mermaid.svg` / `<name>.mermaid.png`
- `<name>.maid.svg`    / `<name>.maid.png`
- `summary.mermaid.json` / `summary.maid.json`
- `diff.json` — tag deltas, palette differences, viewBoxA/B

A top-level `.tmp-compare-all/REPORT.json` indexes all items.

## Common commands

Always build first:

```
npm run build
```

Compare a single type (recommended for iteration):

```
# sequence | flowchart | pie
npm run compare:renderers:sequence
```

Compare all supported types:

```
npm run compare:renderers
```

Compare one diagram quickly and print a summary (SVG only):

```
node scripts/compare-render-svg.js test-fixtures/sequence/valid/basic.mmd
```

This writes Mermaid/Maid SVGs to `.tmp-compare/` and prints shape/color counts to stdout.

## Workflow to tighten parity

1) Pick a target set (e.g., sequence). Run:

```
npm run build
npm run compare:renderers:sequence
```

2) Open the PNGs for a diagram that looks off (e.g., `.tmp-compare-all/sequence/alt-minimal/`).
   - Check `diff.json` to see what’s different (viewBox, tag counts, color set).
   - Check `summary.*.json` to confirm differences are consistent.

3) Tweak renderer code:
   - Layout: `src/renderer/*-layout.ts`
   - SVG drawing: `src/renderer/svg-generator.ts` (flowchart) or `src/renderer/sequence-renderer.ts` / `pie-renderer.ts`
   - Theming/CSS: `src/renderer/index.ts` theme mappers and default styles

4) Re-run comparison for the single type. Iterate until PNGs/metrics converge.

5) When satisfied, regenerate previews and ensure CI matches snapshots:

```
npm run build
npm run generate:previews
git add -A && git commit -m "chore(previews): regenerate after renderer tweaks"
```

## Interpreting `diff.json`

- `tagDelta` — Differences in element counts. Large gaps often indicate extra wrappers or missing shapes.
- `fills` / `strokes` — Palette differences. Color mismatches may come from default CSS or theme variables.
- `viewBoxA/B` — SVG coordinate systems. If they differ greatly, normalize margins/padding in the renderer.

## Troubleshooting

- Mermaid CLI sometimes returns an error page with exit code 0. The scripts handle this internally, but if you see odd SVGs, open them to confirm.
- If PNGs are not produced, ensure one of these is available: `@resvg/resvg-js`, `rsvg-convert`, or `convert` (ImageMagick).
- Long runs: Puppeteer rendering can be slow. Prefer per-type comparisons while iterating.

## CI considerations

- Previews: `npm run ci:previews` regenerates previews and fails on drift.
- Tests: `npm run ci:test` runs error-code tests and renderer smoke tests.

## Quick iteration loop (copy/paste)

```
npm run build && \
  npm run compare:renderers:sequence && \
  code .tmp-compare-all/sequence/basic && \
  code src/renderer/sequence-renderer.ts && \
  npm run build && \
  npm run compare:renderers:sequence
```

