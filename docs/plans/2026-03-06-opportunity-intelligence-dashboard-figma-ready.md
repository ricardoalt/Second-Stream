# Opportunity Intelligence Dashboard — Figma Ready Structure

**Use case:** copiar esta estructura en Figma y montar el dashboard rapido para presentacion interna.  
**Goal:** mostrar una home principal moderna, premium, operacional.  
**Important:** esto representa el dashboard principal, no el Discovery workspace.

---

## 1. Archivo Figma recomendado

Crear 4 frames principales:

1. `00 Cover`
2. `01 Desktop / Opportunity Intelligence Dashboard`
3. `02 Mobile / Opportunity Intelligence Dashboard`
4. `03 Components / Dashboard`

---

## 2. Design tokens

## Color styles

- `bg/base`: `#0B0F14`
- `bg/sidebar`: `#0F141B`
- `bg/panel`: `#121923`
- `bg/panel-alt`: `#161F2B`
- `border/subtle`: `#202938`
- `border/strong`: `#2C374A`
- `text/primary`: `#EEF2F7`
- `text/secondary`: `#A2AFBF`
- `text/muted`: `#738195`
- `accent/ready`: `#21C37E`
- `accent/waiting`: `#F0A53A`
- `accent/risk`: `#D96B4D`
- `accent/ai`: `#4C8DFF`
- `accent/info`: `#62C2D4`

## Typography styles

- `Display / 28 / Semibold`: `IBM Plex Sans`, 28, 34, semibold
- `Heading / 18 / Semibold`: `IBM Plex Sans`, 18, 24, semibold
- `Body / 14 / Regular`: `IBM Plex Sans`, 14, 20, regular
- `Body / 13 / Medium`: `IBM Plex Sans`, 13, 18, medium
- `Label / 11 / Medium`: `IBM Plex Sans`, 11, 14, medium, letter spacing `4%`
- `Number / 28 / Medium`: `IBM Plex Mono`, 28, 32, medium
- `Number / 14 / Medium`: `IBM Plex Mono`, 14, 18, medium

## Effects

- `panel shadow`: `0 12 36 0 rgba(0,0,0,0.32)`
- `soft inner border`: `0 0 0 1 rgba(255,255,255,0.02)`

## Radius scale

- `r/12`
- `r/16`
- `r/20`
- `r/pill = 999`

## Spacing scale

- `4, 8, 12, 16, 20, 24, 32, 40`

---

## 3. Cover frame

## Frame

- Name: `00 Cover`
- Size: `1600 x 900`
- Fill: `bg/base`

## Layout

- top-left small label:
  - `SECONDSTREAM`
  - style: `Label / 11 / Medium`
  - color: `accent/info`
- big title:
  - `Opportunity Intelligence Dashboard`
  - style: `Display / 28 / Semibold`
- subtitle:
  - `Portfolio-level control tower for discovery operations`
  - style: `Body / 14 / Regular`
  - color: `text/secondary`
- right side simple summary chips:
  - `Discovered Streams`
  - `Missing Information`
  - `Deal Stage`
  - `Proposal Readiness`

---

## 4. Desktop frame

## Frame

- Name: `01 Desktop / Opportunity Intelligence Dashboard`
- Size: `1440 x 1240`
- Fill: `bg/base`
- Layout grid:
  - columns: `12`
  - margin: `40`
  - gutter: `20`

## Structure

### A. Sidebar

- Frame name: `Sidebar / Main`
- Size: `88 x 1240`
- Fill: `bg/sidebar`
- Stroke right: `border/subtle`
- Auto layout: vertical
- Padding: `20`
- Gap: `20`

Add items as icon + label stacks:
- `Dashboard`
- `Streams`
- `Companies`
- `Proposals`
- `Search`

Keep selected item = `Dashboard` with subtle active pill background `bg/panel-alt`.

### B. Main shell

- Frame name: `Content / Shell`
- Position next to sidebar
- Size: `1352 x 1240`
- Auto layout: vertical
- Padding: `28 32 32 32`
- Gap: `24`

### C. Header

- Frame name: `Header / Top`
- Height: `84`
- Auto layout: horizontal, space-between

Left block:
- overline: `DISCOVERY COMMAND`
- title: `Opportunity Intelligence Dashboard`
- subtitle: `Portfolio-level command view for discovery operations`

Right block:
- search field `300 x 44`
- filters as pills:
  - `Owner`
  - `Stage`
  - `Readiness`
  - `Facility`
- CTA button: `+ New Stream`

### D. Signal strip

- Frame name: `Signals / Strip`
- Height: `140`
- Auto layout: horizontal
- Gap: `16`

Use 4 cards, each `fill container`.

Card spec:
- Name: `Signal Tile / Default`
- Fill: `bg/panel`
- Stroke: `border/subtle`
- Radius: `20`
- Padding: `20`
- Auto layout: vertical
- Gap: `10`

Top small label uses `Label / 11 / Medium`.
Big number uses `Number / 28 / Medium`.
Bottom line uses `Body / 13 / Medium`.

Cards:

1. `Discovered Streams`
   - value: `128`
   - sub: `+8 this week`

2. `Blocked by Missing Info`
   - value: `19`
   - sub: `11 high-risk`
   - accent bar top = `accent/waiting`

3. `Proposal-ready`
   - value: `14`
   - sub: `9 near-ready`
   - accent bar top = `accent/ready`

4. `Avg. Stall Time`
   - value: `6.2d`
   - sub: `3 deals > 10 days stalled`

### E. Main content band

- Frame name: `Body / Main`
- Auto layout: horizontal
- Gap: `20`
- Height: `560`

#### Left primary panel

- Name: `Panel / Streams In Motion`
- Width: `fill`
- Fill: `bg/panel`
- Stroke: `border/subtle`
- Radius: `20`
- Padding: `24`
- Auto layout: vertical
- Gap: `20`

Header inside panel:
- title: `Streams in Motion`
- subtitle: `Ranked by urgency, blocker age, readiness, and commercial potential`

Then create column header row:
- `STREAM`
- `STAGE`
- `MISSING`
- `BLOCKER`
- `READY`

Use `Label / 11 / Medium`, muted.

Then 4 stream rows.

#### Stream row component

- Name: `Stream Row / Default`
- Height: `108`
- Fill: `transparent`
- Stroke bottom: `border/subtle`
- Auto layout: horizontal
- Padding: `14 0`
- Align center

Columns:

1. `Stream identity` width `32%`
   - line 1: stream name
   - line 2: facility + family + location
   - line 3: owner

2. `Stage` width `16%`
   - stage pill + sublabel

3. `Missing` width `18%`
   - `Water %, SDS`
   - `2 critical`

4. `Blocker` width `18%`
   - `Lab pending`
   - `Aging 4d`

5. `Readiness` width `10%`
   - number + mini bar

6. `CTA` width `6%`
   - ghost button `Open`

#### Example row content

Row 1:
- Stream: `Spent Acetone Recovery`
- Meta: `Meridian Chemical · Solvents · Monterrey`
- Owner: `Owner: Raul`
- Stage pill: `Waiting on client`
- Missing: `Water %, SDS`
- Missing sub: `2 critical`
- Blocker: `Lab pending`
- Blocker sub: `Aging 4d`
- Ready: `78%`

Row 2:
- Stream: `Paint Sludge`
- Meta: `NorChem Foundry · Metals · Ohio`
- Owner: `Owner: Ana`
- Stage pill: `Analyst review`
- Missing: `Classification`
- Missing sub: `1 critical`
- Blocker: `Waste/Product ambiguity`
- Blocker sub: `Pricing hold`
- Ready: `52%`

Row 3:
- Stream: `Used Glycol`
- Meta: `Apex Auto Parts · Liquids · Texas`
- Owner: `Owner: Luis`
- Stage pill: `In discovery`
- Missing: `Cost, recurrence`
- Missing sub: `2 missing`
- Blocker: `Baseline unknown`
- Blocker sub: `Slow progress`
- Ready: `46%`

Row 4:
- Stream: `Solvent Blend`
- Meta: `Delta Coatings · Solvents · California`
- Owner: `Owner: Sofia`
- Stage pill: `Blocked`
- Missing: `SDS, flash point`
- Missing sub: `3 missing`
- Blocker: `No fresh docs`
- Blocker sub: `12d stalled`
- Ready: `34%`

#### Right rail

- Name: `Rail / Intelligence`
- Width: `320`
- Auto layout: vertical
- Gap: `20`

##### Panel 1: Critical Gaps

- Name: `Panel / Critical Gaps`
- Fill: `bg/panel`
- Stroke: `border/subtle`
- Radius: `20`
- Padding: `20`
- Auto layout: vertical
- Gap: `16`

Items:

1.
- title: `Lab analysis`
- sub: `Waiting on EHS`
- meta: `4d · blocks proposal`

2.
- title: `Process origin`
- sub: `Waiting on Ops`
- meta: `8d · blocks classification`

3.
- title: `Current cost`
- sub: `Waiting on Accounting`
- meta: `5d · blocks pricing`

Footer link: `View all gaps ->`

##### Panel 2: Ready Now

- Name: `Panel / Ready Now`
- same shell as above

Items:
- `Meridian · 78% ready · Missing lab`
- `NorChem · 52% ready · 1 blocker`
- `Apex · Missing cost only`

Footer button: `Review ready deals`

### F. Lower band

- Frame name: `Body / Lower`
- Auto layout: horizontal
- Gap: `20`

#### Panel: Stage Distribution
- Width: `40%`
- Fill: `bg/panel`
- Radius: `20`
- Padding: `20`

Rows:
- `New 12`
- `In discovery 61`
- `Waiting on client 19`
- `Analyst review 22`
- `Proposal-ready 14`

#### Panel: Top Missing Info Patterns
- Width: `60%`
- Fill: `bg/panel`
- Radius: `20`
- Padding: `20`

Rows:
- `SDS / profile missing 14`
- `Volume / recurrence unknown 11`
- `Lab / testing missing 10`
- `Generating process unclear 9`
- `Current cost / invoice missing 8`

### G. Bottom strip

- Name: `Panel / Recent Signals`
- Height: `68`
- Fill: `bg/panel`
- Radius: `20`
- Padding: `20`
- Content:
  - `+ 8 new streams discovered`
  - `5 blockers resolved`
  - `3 moved to ready`
  - `2 stale evidence flags`

---

## 5. Mobile frame

## Frame

- Name: `02 Mobile / Opportunity Intelligence Dashboard`
- Size: `390 x 1180`
- Fill: `bg/base`
- Auto layout: vertical
- Padding: `16`
- Gap: `16`

## Layout order

1. `Header`
2. `Signal summary`
3. `Filter pills`
4. `Stream cards`
5. `Critical gaps`
6. `Ready now`
7. `Missing info patterns`

### Header
- title: `Opportunity Intelligence`
- right icon button: filters/menu
- search field full width under title

### Compact signal card
- single full-width card
- show 3 lines:
  - `128 streams`
  - `19 blocked · 14 ready`
  - `6.2d avg stall`

### Toggle row
- pills:
  - `All`
  - `Blocked`
  - `Ready`
  - `My deals`

### Stream card component

- Name: `Stream Card / Mobile`
- Width: `358`
- Fill: `bg/panel`
- Radius: `18`
- Padding: `16`
- Auto layout: vertical
- Gap: `10`

Structure:
- row 1: stream name + stage pill
- row 2: facility
- row 3: readiness text + thin bar
- row 4: missing chips
- row 5: blocker text
- row 6: button `Open stream`

Example card copy:
- `Spent Acetone Recovery`
- `Meridian Chemical`
- `Waiting on client · 78% ready`
- `Missing: Water %, SDS`
- `Blocker: Lab pending · 4d`
- `Evidence: Aging SDS`

---

## 6. Components frame

## Frame

- Name: `03 Components / Dashboard`
- Size: `1600 x 1200`
- Fill: `bg/base`

Create these reusable components:

1. `Signal Tile / Default`
2. `Stage Pill / New`
3. `Stage Pill / In discovery`
4. `Stage Pill / Waiting`
5. `Stage Pill / Review`
6. `Stage Pill / Ready`
7. `Stage Pill / Blocked`
8. `Missing Chip / Default`
9. `Readiness Meter / 34`
10. `Readiness Meter / 52`
11. `Readiness Meter / 78`
12. `Stream Row / Default`
13. `Stream Card / Mobile`
14. `Gap Item / Default`
15. `Ready Item / Default`
16. `Recent Signal / Inline`

---

## 7. Stage pill specs

Use pill height `28`, radius `999`, padding `10 8`.

- `New`
  - fill: `rgba(98,194,212,0.12)`
  - text: `accent/info`
- `In discovery`
  - fill: `rgba(76,141,255,0.14)`
  - text: `accent/ai`
- `Waiting on client`
  - fill: `rgba(240,165,58,0.14)`
  - text: `accent/waiting`
- `Analyst review`
  - fill: `rgba(160,170,185,0.14)`
  - text: `text/secondary`
- `Proposal-ready`
  - fill: `rgba(33,195,126,0.14)`
  - text: `accent/ready`
- `Blocked`
  - fill: `rgba(217,107,77,0.14)`
  - text: `accent/risk`

---

## 8. Paste-ready copy blocks

## Page title block

```text
Opportunity Intelligence Dashboard
Portfolio-level command view for discovery operations
```

## Signal strip labels

```text
Discovered Streams
Blocked by Missing Info
Proposal-ready Opportunities
Avg. Stall Time
```

## Right rail labels

```text
Critical Gaps
Ready Now
```

## Lower band labels

```text
Stage Distribution
Top Missing Info Patterns
Recent Signals
```

## Stream examples

```text
Spent Acetone Recovery
Meridian Chemical · Solvents · Monterrey
Owner: Raul
Waiting on client
Water %, SDS
Lab pending
78%
```

```text
Paint Sludge
NorChem Foundry · Metals · Ohio
Owner: Ana
Analyst review
Classification
Waste/Product ambiguity
52%
```

---

## 9. Presentation tip

Cuando lo muestres, explícalo así:

> `Dashboard = portafolio y priorización.`  
> `Discovery = resolución del deal.`

Y recorre la pantalla en este orden:

1. signal strip
2. streams in motion
3. critical gaps
4. ready now
5. lower band
