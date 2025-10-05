Spec Parity (Mermaid → Maid)

Purpose: single place to see where our parsers and renderers diverge from Mermaid’s docs. Use this to drive work; keep it current as we land changes.

Legend
- ✅ supported
- ⚠️ partial (works with gaps or needs polish)
- ❌ not yet

Flowchart

| Spec Feature | Parsing | Rendering | Notes / Next Actions |
| - | - | - | - |
| Direction header (TB/LR/BT/RL) | ✅ | ✅ | Top‑level and subgraph `direction` supported; invalid keywords flagged inside subgraphs (FL-DIR-KW-INVALID). |
| Nodes/shapes (rect, round, circle/double, stadium, subroutine, cylinder, diamond, hexagon, parallelogram, trapezoid/alt) | ✅ | ⚠️ | All parsed; renderer supports all with improved intersections; polish polygon/capsule edge intersections on steep/short edges. |
| Subgraphs (nested) + inner direction | ✅ | ⚠️ | Layout for LR/RL nested clusters needs spacing/elbow tuning. |
| Edge types (solid, dotted, thick, arrowheads, both‑ends) | ✅ | ⚠️ | Parsing complete. Renderer supports markers and overlays; multi‑bend both‑end markers need ordering polish. |
| Edge labels and min link length | ✅ | ⚠️ | Labels render; min‑length behavior depends on layout heuristics; fine‑tune pill size/placement and end‑flattening constants. |
| linkStyle (indices, styles, multiline) | ✅ | ✅ | Stroke/width/opacity/dasharray applied; overlay markers colored. Ranges `0:3` intentionally unsupported (error). |
| click href/call | ✅ | N/A | Parsed + validated; not a rendering concern. |
| class/classDef/style | ✅ | ✅ | Unknown targets warned; inline style precedence handled. |
| HTML in labels (<b>, <i>, <u>, <br/>) | ✅ | ⚠️ | Normalized to tspans; spacing/underline metrics can be improved. |
| Edge IDs and animation | ✅ | ✅ | Edge ids via `e1@-->`; per-edge animation via `e1@{ animate: true }` or class styles (`animation:`). |
| Markdown strings | ⚠️ | ⚠️ | Treated as text; no markdown rendering semantics. Clarify spec scope and decide. |
| Maid extension: typed‑shape `@{…}` | ✅ | ⚠️ | Non‑spec feature. Parser guards + diagnostics done; image/icon mapping rendered partially; keep separate from spec parity. |

Sequence

| Spec Feature | Parsing | Rendering | Notes / Next Actions |
| - | - | - | - |
| participants/actor + alias (`A as Alice`) | ✅ | ✅ | Participants render with shared node styles. |
| autonumber (on/off, start, step) | ✅ | ✅ | Numbers prefixed in labels; diagnostics for malformed/extra tokens. |
| Messages (sync/async, dashed, lost) with suffix `+`/`-` | ✅ | ⚠️ | Suffix diagnostics implemented; caret points at token; arrowhead sizing/rotation polish. |
| Notes (left of/right of/over A,B) | ✅ | ✅ | Multi‑line sizing implemented; continue tuning centering and width. |
| Blocks: alt/opt/loop/critical/break/rect/box | ✅ | ⚠️ | Containers render with shared block styles; padding/title/divider positions still need tuning. |
| `par` and `par over A,B` with `and` branches | ✅ | ⚠️ | Branch diagnostics implemented; divider Y placement polish. |
| title, accTitle, accDescr | ✅ | N/A | Parsed; we mirror CLI acceptance. |
| links/properties/details (spec variants) | ⚠️ | N/A | Parser recognizes; kept invalid to mirror current CLI behavior; revisit when CLI supports. |
| Create/Destroy + activations | ✅ | ⚠️ | Warnings for invalid sequences; activation bar geometry polish. |

Class

| Spec Feature | Parsing | Rendering | Notes / Next Actions |
| - | - | - | - |
| Classes with members/methods | ✅ | ✅ | Titles/members rendered with wrapping. |
| Relationships: extension, realization, dependency, aggregation, composition | ✅ | ✅ | Markers (triangles/diamonds/chevrons) in place; dashed for dependency/realization. |
| Leftward variants + lollipop | ✅ | ✅ | Supported both sides. |
| Labels and both‑end cardinalities | ✅ | ⚠️ | Parser exposes labeled fields; endpoint label placement on multi‑bend edges needs overlap avoidance improvements. |
| Generics `<…>` in names | ⚠️ | N/A | Tokenized; semantics/rendering TBD; fixture kept invalid to match CLI. |

State

| Spec Feature | Parsing | Rendering | Notes / Next Actions |
| - | - | - | - |
| Basic states, transitions, notes | ✅ | ✅ | Transition intersections polished. |
| Composite states `{ }` | ✅ | ✅ | Title gap under headers to avoid divider overlap. |
| Concurrency separators `---` | ✅ | ⚠️ | Parsed; diagnostics for placement; renderer draws lane dividers; confirm CLI parity and keep warnings where CLI rejects. |
| History nodes `[H]` and `[H*]` | ✅ | ✅ | Supported. |
| Choice / Fork / Join / End | ✅ | ✅ | Visuals present; alignment tweaks may remain in LR/RL. |

Pie

| Spec Feature | Parsing | Rendering | Notes / Next Actions |
| - | - | - | - |
| `pie` header + `showData` | ✅ | ✅ | Works with front‑matter theming. |
| `title` | ✅ | ✅ | Inline and header‑follow variants supported. |
| Slices: quoted label + number | ✅ | ✅ | Strict quotes enforced (matches mermaid‑cli). |
| Internal quotes in labels | ⚠️ | ⚠️ | Advise `&quot;` inside quotes; add more fixtures if mermaid‑cli behavior changes. |

Maid Extensions (Non‑spec)

- Typed‑shape `@{…}` on flowchart nodes with diagnostics and partial rendering for media/icon.

How to read this file
- Parsing status reflects our Chevrotain lexers/parsers + diagnostics behavior.
- Rendering status reflects our SVG generators. “Partial” means working with visible differences vs Mermaid’s renderer.
- We use Mermaid docs as the north star; if Mermaid supports it, we must too. If Mermaid rejects it, we don’t accept it either.

Next actions snapshot
- Flowchart: finalize curve end/label pill constants; multi‑bend both‑end markers ordering; polygon/capsule intersections at extremes.
- Sequence: tune container padding/dividers; arrowhead sizing; activation bar geometry.
- Class: endpoint label/cardinality placement on multi‑bend edges; smarter overlap avoidance.
- State: confirm CLI stance on `---`; keep placement diagnostics and divider gaps aligned with docs.
- Pie: add more fixtures around internal quotes; keep parity with mermaid‑cli behavior.
