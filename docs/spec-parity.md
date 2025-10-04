Spec Parity TODO (Mermaid → Maid)

Purpose: track what’s left to fully support Mermaid features across all diagram types we handle. Keep bullets short and actionable. Update as items land.

Status Legend
- [x] complete (merged on feat/spec-parity-round1)
- [ ] pending (planned next)
- [~] partial (parser present; CLI parity or renderer pending)

Flowchart
- Parser
  - [x] Top-level `direction` statement outside header.
  - [x] Interactions lines parsed: `click`, `linkStyle`.
  - [~] Typed-shape attribute object after node id: `A@{ shape: …, label, padding, cornerRadius, icon, image }` — parser+basic keys done; extend to full shape set (icon/image specifics + renderer mapping).
- Semantics/Validation
  - [x] Enforce only keyword `direction` before a Direction inside subgraphs (FL-DIR-KW-INVALID).
  - [x] Conflict warning when both bracket shape and `@{ shape: … }` present (FL-TYPED-SHAPE-CONFLICT).
  - [x] Typed-shape validation: unknown keys/values, numeric fields, label string (FL-TYPED-KEY-UNKNOWN, FL-TYPED-SHAPE-UNKNOWN, FL-TYPED-NUMERIC-EXPECTED, FL-TYPED-LABEL-NOT-STRING).
  - [x] Interactions validation: `click` mode/url/call/target checks; `linkStyle` indices and style presence (FL-CLICK-*, FL-LINKSTYLE-*).
  - [x] Interactions extras: range usage `0:3` flagged (FL-LINKSTYLE-RANGE-UNSUPPORTED); duplicate indices warned (FL-LINKSTYLE-DUPLICATE-INDEX).
  - [ ] Interactions: add fixtures for multi-line linkStyle, whitespace-heavy forms, and mixed valid/invalid indices; refine hints accordingly.
- Renderer parity
  - [ ] Edge–shape intersection: polygon/capsule intersection for stadium, parallelogram, trapezoid, hexagon; verify all joins.
  - [ ] LR/RL nested subgraphs layout width/spacing tuning (reduce vertical stacking); elbows closer to Mermaid.
  - [ ] Curve end flattening constants (link-styles) finalized; label pill size/placement match Mermaid (currently close but still tunable).
  - [ ] Complex markers both ends (<-->, o--o, x--x) on multi-bend edges; overlay ordering stable.
  - [ ] HTML in labels: <b>, <i>, <u>, <br/> normalized and rendered consistently.
  - [x] Apply linkStyle to renderer: path stroke/width/opacity/dasharray; overlay arrowheads pick up color and scale with stroke-width.
- Fixtures/Tests
  - [ ] Expand `typed-shapes-basic.mmd` to cover all shapes + negative cases.
  - [x] Add `interactions-linkstyle-ranges.mmd` (invalid; range unsupported today).
  - [ ] Add `interactions-linkstyle-multi.mmd` with multiple linkStyle lines and mixed indices.

Sequence
- Parser
  - [x] `title`, `accTitle`, `accDescr` at top (kept invalid fixtures to mirror CLI behavior).
  - [x] `par over A,B` form.
  - [x] Message `properties` / `details` lines parsed (fixtures invalid to match CLI).
- Semantics/Validation
  - [ ] `create` followed by a “creating message” to/from the created actor (warning if missing).
  - [ ] Activation balance checks; clearer diagnostics around `+`/`-` suffix.
  - [x] Box-only participants rule with clear messages.
- Renderer parity
  - [ ] Shared defaults with flowchart (node shapes/fonts/colors) — ensure 1:1 visuals.
  - [~] Block containers (alt/opt/loop/par/critical/break/rect/box): padding, title line, dividers (left-aligned) — initial tweaks.
  - [~] Arrowheads (size), label gap above lines, lifeline spacing — first pass landed; rotation OK for horizontal lines.
  - [ ] Title rendering (from `title`) and accessible meta.
- Fixtures/Tests
  - [ ] Promote `title-and-accessibility.mmd` and `details-and-properties.mmd` to valid when CLI accepts; until then ensure invalid diagnostics are actionable.
  - [ ] Add fixtures for nested blocks with `par over` + `and` branches (both valid and invalid placements).

Pie
- Semantics/Validation
  - [ ] Decide behavior for negative and zero values; add clear errors or acceptance with notes.
  - [ ] Label/percent formatting options parity; tiny-slice leader lines edge cases.
- Renderer parity
  - [ ] Theme variables coverage: ensure pieOpacity/section text color variants; percent decimals alignment; legend spacing on narrow canvases.
- Fixtures/Tests
  - [ ] `negative-and-zero-values.mmd`, `large-decimals.mmd`.

Class
- Parser/Semantics
  - [x] Leftward dependency/realization operators.
  - [~] Simple generic `<…>` tokenization for names/types; keep fixtures invalid to mirror CLI; add diagnostics for unbalanced `< >`.
  - [x] Notes on classes (`note for/on X: …`).
  - [ ] Dual-end labels/cardinalities coverage (labels near both classes).
- Renderer (new)
  - [x] Implement class diagram renderer: class box, members/methods layout, stereotypes, notes, relations/markers.
  - [x] Wrap long edge labels into tspans (centered over edge).
  - [~] Dual-end label/cardinality placement (perpendicular offset from endpoints) and simple note collision avoidance landed; refine rules and add fixtures.
  - [~] Dependency chevron shape/size tuning for short segments (initial tweak landed).
- Fixtures/Tests
  - [ ] `generics-and-types.mmd` stays invalid until CLI supports; add `notes-multiline.mmd`, dual-end label/cardinality cases.

State
- Parser/Semantics
  - [x] Concurrency regions `---` inside composite states (with placement checks); fixtures invalid to mirror CLI.
  - [x] History states `H` / `H*` (shallow/deep); fixtures valid as per CLI.
  - [ ] Additional markers parity (choice/fork/join/end double circle visuals).
- Renderer (new)
  - [~] Implement state diagram renderer: nodes, transitions, composite states, notes, start/history markers.
  - [x] Lane dividers inside composites for `---` (overlay).
  - [x] Per‑lane layout: lanes are real subgraphs for Dagre; dividers drawn at midpoints between lane bounds; supports TD/BT and LR/RL.
  - [x] Choice/fork/join marker visuals; [x] end drawn as double circle overlay.
  - [x] Transition routing + boundary intersection polish for diamonds/bars and composite borders (fallback to nearest boundary when colinear).
- Fixtures/Tests
  - [ ] Nested concurrency, history states valid/invalid, marker edge cases.
  - [ ] Add invalid fixtures for misplaced concurrency at block start/end (multiple separators, empty regions).

Cross-Cutting
- [~] Frontmatter config + themeVariables applied uniformly (sequence/class/state), unify CSS classes.
  - [x] Class/state share CSS and applyFlowchartTheme (node/edge/cluster, edge‑label text, notes).
  - [x] Sequence theming applied via applySequenceTheme.
  - [ ] Expand theme coverage where helpful (cluster title background sizing, arrowhead outlines).
- [ ] Interactions rendering (flowchart first): reflect linkStyle stroke/width/opacity and click targets in rendered anchors.
- [ ] PNG/SVG parity harness extended to class/state once renderers exist; keep structural + visual checks (add a couple of golden PNGs).
- [ ] README “Diagram Type Coverage” kept current; docs/errors.md entries for new diagnostics and renderer coverage.
- [ ] Auto-fix suggestions (safe) for minor issues where unambiguous (e.g., insert missing colon in notes, normalize <br/>).

Progress Snapshot (auto-updating intent)
- Flowchart: CLI parity 100%; interactions validated and rendered (style); arrowheads scale with stroke-width.
- Sequence: CLI parity 100%; advanced headers/details parsed; fixtures kept invalid pending CLI acceptance.
- State: CLI parity 100%; renderer initial with lane dividers + markers (choice/fork/join) and end double circle; per‑lane layout/intersections TODO.
- Class: CLI parity 100%; renderer implemented; edge label wrapping done; dual‑end label placement and note collision avoidance pending; generics parsed but invalid in fixtures.

Notes
- Treat this as the single source of truth for spec gaps. Update checkboxes as features land; link PRs next to items when closed.
