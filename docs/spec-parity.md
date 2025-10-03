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
  - [~] Typed-shape attribute object after node id: `A@{ shape: …, label, padding, cornerRadius, icon, image }` — parser+basic keys done; extend to full shape set (icon/image specifics).
- Semantics/Validation
  - [x] Enforce only keyword `direction` before a Direction inside subgraphs (FL-DIR-KW-INVALID).
  - [x] Conflict warning when both bracket shape and `@{ shape: … }` present (FL-TYPED-SHAPE-CONFLICT).
  - [x] Typed-shape validation: unknown keys/values, numeric fields, label string (FL-TYPED-KEY-UNKNOWN, FL-TYPED-SHAPE-UNKNOWN, FL-TYPED-NUMERIC-EXPECTED, FL-TYPED-LABEL-NOT-STRING).
  - [x] Interactions validation: `click` mode/url/call/target checks; `linkStyle` indices and style presence (FL-CLICK-*, FL-LINKSTYLE-*).
  - [ ] Interactions: handle ranges (`0:3`), duplicate indices, and whitespace forms; add explicit diagnostics.
- Renderer parity
  - [ ] Edge–shape intersection: polygon/capsule intersection for stadium, parallelogram, trapezoid, hexagon; verify all joins.
  - [ ] LR/RL nested subgraphs layout width/spacing tuning (reduce vertical stacking); elbows closer to Mermaid.
  - [ ] Curve end flattening constants (link-styles) finalized; label pill size/placement match Mermaid.
  - [ ] Complex markers both ends (<-->, o--o, x--x) on multi-bend edges; overlay ordering stable.
  - [ ] HTML in labels: <b>, <i>, <u>, <br/> normalized and rendered consistently.
  - [ ] Apply linkStyle to renderer stroke/markers when we enable interaction rendering.
- Fixtures/Tests
  - [ ] Expand `typed-shapes-basic.mmd` to cover all shapes + negative cases.
  - [ ] Add `interactions-linkstyle-ranges.mmd` (invalid/valid pairs as CLI behavior allows).

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
  - [ ] Block containers (alt/opt/loop/par/critical/break/rect/box): padding, title line, dividers positions.
  - [ ] Arrowheads (size, rotation), label gap above lines; lifeline spacing/height; multi-line notes centering.
  - [ ] Title rendering (from `title`) and accessible meta.
- Fixtures/Tests
  - [ ] Promote `title-and-accessibility.mmd` and `details-and-properties.mmd` to valid when CLI accepts; until then ensure invalid diagnostics are actionable.

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
  - [ ] Implement class diagram renderer: class box, members/methods layout, stereotypes, notes, relations/markers.
- Fixtures/Tests
  - [ ] `generics-and-types.mmd` stays invalid until CLI supports; add `notes-multiline.mmd`, dual-end labels cases.

State
- Parser/Semantics
  - [x] Concurrency regions `---` inside composite states (with placement checks); fixtures invalid to mirror CLI.
  - [x] History states `H` / `H*` (shallow/deep); fixtures valid as per CLI.
  - [ ] Additional markers parity (choice/fork/join done; verify others).
- Renderer (new)
  - [ ] Implement state diagram renderer: composite states, concurrency lanes, markers, notes, direction.
- Fixtures/Tests
  - [ ] Nested concurrency, history states valid/invalid, marker edge cases.

Cross-Cutting
- [ ] Frontmatter config + themeVariables applied uniformly (sequence/class/state), unify CSS classes.
- [ ] Interactions rendering (flowchart first): reflect linkStyle stroke/width/opacity and click targets in rendered anchors.
- [ ] PNG/SVG parity harness extended to class/state once renderers exist; keep structural + visual checks.
- [ ] README “Diagram Type Coverage” kept current; docs/errors.md entries for new diagnostics.
- [ ] Auto-fix suggestions (safe) for minor issues where unambiguous (e.g., insert missing colon in notes, normalize <br/>).

Notes
- Treat this as the single source of truth for spec gaps. Update checkboxes as features land; link PRs next to items when closed.
