Spec Parity TODO (Mermaid → Maid)

Purpose: track what’s left to fully support Mermaid features across all diagram types we handle. Keep bullets short and actionable. Update as items land.

Flowchart
- Parser
  - [ ] Typed-shape attribute object after node id: `A@{ shape: …, label, padding, cornerRadius, icon, image }` — support full shape set (rect, lean-l, lean-r, stadium, subroutine, circle, cylinder, diamond, trapezoid, parallelogram, hexagon, icon, image) and key validation.
  - [ ] Interactions: `click`, `href`, `linkStyle` (incl. indexed `linkStyle 1,3 ...`) and edge-level styling directives.
  - [ ] Top-level `direction` statement outside header.
- Semantics/Validation
  - [x] Enforce only keyword `direction` before a Direction inside subgraphs.
  - [ ] Conflicts: bracket shape vs `@{ shape: … }` on same node → choose one and warn.
  - [ ] Validate unknown shape keys/values in `@{ … }` with clear codes.
- Renderer parity
  - [ ] Edge–shape intersection: add precise polygon/capsule intersection for stadium, parallelogram, trapezoid, hexagon; verify all joins.
  - [ ] LR/RL nested subgraphs layout width/spacing tuning (reduce vertical stacking); elbows closer to Mermaid.
  - [ ] Curve end flattening constants (link-styles) finalized; label pill size/placement match Mermaid.
  - [ ] Complex markers both ends (<-->, o--o, x--x) on multi-bend edges; overlay ordering stable.
  - [ ] HTML in labels: <b>, <i>, <u>, <br/> normalized and rendered consistently.
- Fixtures/Tests
  - [ ] `typed-shapes-basic.mmd` extended (all shapes + errors).
  - [ ] `interactions-click-href.mmd`, `edge-ids-and-animations.mmd`.

Sequence
- Parser
  - [ ] `title`, `accTitle`, `accDescr` at top; allow whitespace-only lines between; reject elsewhere.
  - [ ] `par over A,B` form; validate branch keywords count/placement; nested blocks.
  - [ ] Message `properties` / `details` lines (accept + ignore or validate fully — decide and implement).
- Semantics/Validation
  - [ ] `create` followed by a “creating message” to/from the created actor (warning if missing).
  - [ ] Activation balance checks; clearer diagnostics around `+`/`-` suffix.
  - [ ] Box contents restricted to participant/actor lines (done), plus targeted hints for common mistakes.
- Renderer parity
  - [ ] Shared defaults with flowchart (node shapes/fonts/colors) — ensure 1:1 visuals.
  - [ ] Block containers (alt/opt/loop/par/critical/break/rect/box): padding, title line, dividers positions.
  - [ ] Arrowheads (size, rotation), label gap above lines; lifeline spacing/height; multi-line notes centering.
  - [ ] Title rendering (from `title`) and accessible meta.
- Fixtures/Tests
  - [ ] `title-and-accessibility.mmd` (invalid until supported → switch to valid when done).
  - [ ] `par-over-actors.mmd`, `details-and-properties.mmd` (+ invalid counterparts).

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
  - [ ] Generics/templated names and member types (e.g., `Class<T>`, `map<string,int>`); diagnostics for unbalanced `< >`.
  - [x] Notes on classes (`note for/on X: …`).
  - [ ] Dual-end labels/cardinalities coverage (labels near both classes).
- Renderer (new)
  - [ ] Implement class diagram renderer: class box, members/methods layout, stereotypes, notes, relations/markers.
- Fixtures/Tests
  - [ ] `generics-and-types.mmd`, `notes-multiline.mmd`, dual-end labels cases.

State
- Parser/Semantics
  - [x] Concurrency regions `---` inside composite states (with placement checks).
  - [ ] History states `H` / `H*` (shallow/deep); markers for entry/exit if applicable.
  - [ ] Additional markers parity (choice/fork/join done; verify others).
- Renderer (new)
  - [ ] Implement state diagram renderer: composite states, concurrency lanes, markers, notes, direction.
- Fixtures/Tests
  - [ ] Nested concurrency, history states valid/invalid, marker edge cases.

Cross-Cutting
- [ ] Frontmatter config + themeVariables applied uniformly (sequence/class/state), unify CSS classes.
- [ ] Interactions: `click`/`href` support where Mermaid defines them (flowchart first; assess others).
- [ ] PNG/SVG parity harness extended to class/state once renderers exist; keep structural + visual checks.
- [ ] README “Diagram Type Coverage” kept current; docs/errors.md entries for new diagnostics.

Notes
- Treat this as the single source of truth for spec gaps. Update checkboxes as features land; link PRs next to items when closed.
