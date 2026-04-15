# AI-Native Stream Workspace v1 — High-Fidelity Mockup

## Context
Current stream workspace is a 31-question form across 4 phases — cognitively heavy, form-centric. New product direction centers on a **Discovery Brief** as a living artifact. The broker reviews/corrects/acts on AI-generated insights instead of filling forms. This mockup demonstrates the new direction as a standalone HTML file.

## Deliverable
Single HTML file: `docs/plans/ai-native-stream-workspace-v1-mockup.html`
Two navigable tabs: **Overview** (primary) + **Structured Capture** (secondary).

## Architecture

### Single file structure
```
<head>  Google Fonts (Inter, Manrope, JetBrains Mono) + <style> (~450 lines)
<body>  Top bar + Tab bar + 2 tab panels
<script> Data objects + render functions + event listeners (~200 lines)
```

### Design tokens — port from `frontend/app/globals.css`
| Token | Value | Use |
|---|---|---|
| `--bg` | `oklch(0.965 0.01 195)` | Page bg |
| `--card` | `oklch(0.99 0.004 195)` | Panels |
| `--foreground` | `oklch(0.13 0.025 230)` | Body text |
| `--muted-fg` | `oklch(0.52 0.018 230)` | Secondary text |
| `--primary` | `oklch(0.58 0.17 172)` | Teal accents |
| `--success` | `oklch(0.62 0.18 145)` | Confirmed |
| `--warning` | `oklch(0.74 0.18 80)` | Needs review / missing |
| `--destructive` | `oklch(0.58 0.24 27)` | Conflict |
| `--info` | `oklch(0.63 0.15 235)` | Assumption / inferred |
| `--border` | `oklch(0.87 0.01 210 / 0.7)` | Subtle borders |
| `--radius` | `0.625rem` | 10px |

Typography: Manrope for headings, Inter for body, JetBrains Mono for data values.

## Tab 1: Overview

### Layout
```
grid-template-columns: minmax(0, 7fr) minmax(320px, 3fr)
```
Main column (68-72%) + Context Rail (28-32%). Max-width 1440px, centered.

### Main column sections

1. **Header** — stream title (Manrope 700), brief status badge, meta line (company + owner avatar + "updated 14 min ago"), readiness bar (thin 5-segment colored bar, 62%), action buttons (Refresh Brief secondary, Complete Discovery primary)

2. **Executive Summary** — subtle bordered card, 3-5 lines narrative prose, key entities bolded. No badges/metadata.

3. **Discovery Brief** — the heart. Four subsections:
   - What we know (Facts, Assumptions)
   - What is missing (Questions, missing items)
   - Conflicts
   - Recommended next actions

   **BriefPoint row**: `[state-dot 8px] [label 13px muted] [value 14px] [type-badge pill] [source 11px muted]`
   - State dots: green=confirmed, amber=needs_review, red=conflict, gray=missing
   - Type badges: Fact (green), Assumption (blue), Conflict (red), Question (amber), Recommendation (teal)
   - **Hover actions**: fade-in text links at right edge — Accept, Incorrect, Verify, Note. CSS opacity transition.
   - **Click**: selects point, updates rail evidence, subtle left-border highlight.

4. **Open Questions** — 3-5 items: question (14px semibold), why it matters (13px muted), priority pill, next step hint (12px italic)

5. **Next Best Actions** — 3 cards in flex row: title, rationale, status pill. First card has teal left border.

### Context Rail sections

1. **Pending Review** — 2-4 compact items. Type label + summary + "why" in 12px. Click scrolls to related brief point.
2. **Evidence Context** — default: "Select a brief point to view evidence." Active: source title, type badge, blockquote excerpt, provenance metadata. Context-linked, not a gallery.
3. **Recent Updates** — 3-5 timeline items with left dot-border, description, relative timestamp.

## Tab 2: Structured Capture

### Layout
Single column, max-width 800px, centered.

### Accordion groups (5)
`<details>` elements, JS-enforced single-open. Each header: group name (Manrope 600), state badge (Complete/Needs Review/Missing Info), field summary ("4 of 6 fields").

Groups:
1. Generator & Source
2. Material & Composition
3. Volume & Frequency
4. Handling & Logistics
5. Compliance & Documentation

### Field rows
Label (13px muted) + value or empty placeholder (14px) + state dot. AI suggestions: light teal row below field with "AI suggests: ..." + source hint + Accept/Dismiss micro-buttons.

## Dummy data
Realistic waste brokerage stream:
- **Stream**: Mixed C&D Waste — Greenfield Industrial Services
- **Owner**: Sarah Chen
- **Volume**: ~180 tons/month
- **Key facts**: material type, composition, generator location, current handler
- **Key issues**: contamination concern (concrete fines + rebar), missing compliance cert, transport frequency TBD
- **Evidence**: PDF audit report (Feb 2026), broker visit notes (Mar 2026), AI inferences
- **Conflicts**: volume estimate discrepancy (audit says 180t, broker notes say 150t)

## Interactions
- **Tab switching**: `hidden` attribute toggle, `aria-selected`
- **Brief point selection**: click sets `data-selected`, updates rail evidence via JS lookup
- **Hover actions**: CSS `opacity: 0 → 1` on `.brief-point:hover .point-actions`
- **Accordion exclusivity**: JS `toggle` event listener closes others
- **Readiness bar**: pure CSS flex segments, no interaction

## Key visual decisions
- No emoji in UI — CSS dots, pills, inline SVG
- OKLCH color space throughout (Chrome 111+, Safari 15.4+, Firefox 113+)
- No gradients on surfaces — flat + subtle shadow
- Borders use transparency for softness
- Radius: 10px cards, 6px pills, 999px dots

## Verification
1. Open the HTML file in a modern browser
2. Overview tab: verify 2-column layout, all 5 sections render, hover actions appear on brief points, clicking a point updates evidence rail
3. Structured Capture tab: verify accordion behavior (one open at a time), group states visible, AI suggestions render
4. Visual: check typography hierarchy (3 fonts), color states (confirmed/review/missing/conflict), spacing consistency
5. 5-second test: can you answer "what do we know / what's missing / what needs review / what to do next"?

## Critical source files
- `docs/plans/ai-native-workspace-ui-spec.md` — authoritative spec
- `frontend/app/globals.css` — design tokens to port
- `docs/plans/2026-04-14-secondstream-brief-spine-wireframe-v2.html` — most evolved prior wireframe
