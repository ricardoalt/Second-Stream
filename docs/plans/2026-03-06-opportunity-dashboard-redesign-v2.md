# SecondStream Main Dashboard — Clean Redesign v2

**Date:** 2026-03-06  
**Scope:** dashboard principal only  
**Context:** portfolio-level home, not Discovery workspace  
**Inputs:** `docs/SecondStream Product Discovery.md`, `docs/SecondStream-mvp.md`, `docs/plans/discovery-phase-analysis2.md.resolved`, current dashboard UI patterns in repo

---

## 1. Goal

Redesign the main dashboard to be:

- cleaner
- more useful
- more intuitive
- more portfolio-aware
- less dashboard-SaaS
- less visually noisy

Core rule:

> Dashboard = prioritize work across the portfolio.  
> Discovery workspace = resolve one stream in depth.

The dashboard's primary job is:

1. show what needs attention today
2. keep portfolio visibility
3. separate confirmed streams from AI-detected drafts
4. make proposal readiness obvious

---

## 2. What was wrong with the previous direction

The prior mockup improved visual quality, but still had issues:

- too much "control room" feeling
- too much density in the wrong places
- featured stream block was too dominant
- status/stage language was inconsistent
- drafts were still not fully isolated as a different object class
- some sections were informational but not action-driving

Most important correction:

**Do not organize the screen around visual drama. Organize it around operator decisions.**

---

## 3. Final design direction

## Name

**Action-First Portfolio Dashboard**

## Product posture

This is not a CRM overview.

This is not a data-heavy cockpit.

This is a clean operational screen that tells the broker:

- what is confirmed
- what is blocked by missing information
- what is ready for proposal
- what AI found but still needs human confirmation

## Visual posture

- dark mineral base
- crisp typography
- fewer heavy panels
- stronger whitespace between groups
- compact, readable operational lists
- clear separation between confirmed and draft objects

---

## 4. Final architecture

## A. Portfolio Pulse

Top strip with only the metrics that matter:

- `Streams discovered`
- `Confirmed streams`
- `Missing information`
- `Proposal-ready`
- `Drafts pending review`

Purpose: maintain portfolio awareness without stealing focus.

## B. Bucket Bar

A simple action filter bar for confirmed streams only:

- `Clients`
- `All confirmed`
- `Missing info`
- `Proposal ready`
- `Drafts`
- `Complete`

Important decision:

- `Clients` is allowed in the bar because it matches current mental models
- but it behaves as a scoped view/filter, not as the same semantic category as status buckets
- `Drafts` opens or filters the draft queue, not the confirmed table

## C. Main Work Area

This is the center of gravity.

Show only **confirmed streams**.

Use a clean ledger/list structure with these columns:

1. `Waste stream`
2. `Company / Location`
3. `Volume`
4. `Missing information`
5. `Status`

Why this is correct:

- stream name is the primary object
- company/location gives portfolio grounding
- volume changes commercial importance
- missing info tells the operator what is incomplete
- status tells where the stream sits now

## D. Draft Queue

Separate module for AI-detected candidate streams.

These are not yet confirmed waste streams.

They are:

- extracted from interview notes, uploads, or AI processing
- not fully confirmed by a human
- not yet assigned to a company/location

They stay isolated until the user confirms them.

## E. Bottom Support Layer

Only keep support blocks that improve decisions:

- `Where Confirmed Streams Are Sitting`
- `Top Missing Info Patterns`
- `Recent Signals`

Remove anything that is decorative or duplicates the main queue.

---

## 5. What to remove from the old design

Remove these from the main dashboard redesign:

- large featured-stream hero as the main focal point
- stage-track narrative block in the top-center
- duplicated readiness storytelling in multiple places
- overly descriptive copy paragraphs in critical zones
- heavy cockpit-like paneling where a clean list would work better
- mixing drafts and confirmed semantics
- any visual block that does not help choose the next action

New rule:

**If a section does not help prioritize, filter, confirm, or advance a stream, it should be reduced or removed.**

---

## 6. Final desktop layout

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Main Dashboard                                                     [Search] [Filters] [+ Add]│
│ Portfolio pulse                                                                             │
│ Streams 184   Confirmed 126   Missing info 31   Proposal-ready 18   Drafts 58              │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Clients] [All confirmed] [Missing info] [Proposal ready] [Drafts] [Complete]              │
├───────────────────────────────────────────────────────────────┬──────────────────────────────┤
│ CONFIRMED STREAMS                                             │ DRAFT WASTE STREAMS          │
│ Priority queue for active portfolio                           │ AI detected, not confirmed   │
│                                                               │                              │
│ Waste stream     Company / Location   Volume  Missing   Status│ Mixed metal scrap            │
│───────────────────────────────────────────────────────────────│ ~8 t/mo                      │
│ Spent Acetone    Meridian / Monterrey 20 drums/mo 2 miss Wait│ Missing company + location   │
│ Paint Sludge     NorChem / Ohio       8 t/mo       1 miss Rev │ Review draft                 │
│ Used Glycol      Apex / Texas         4,500 gal/mo 2 miss Disc│                              │
│ Solvent Blend    Delta / California   12 drums/wk  3 miss Block│ Used oil stream            │
│                                                               │ 4 t/mo                       │
│ [View all confirmed streams]                                  │ Location not assigned        │
│                                                               │ Confirm draft                │
├───────────────────────────────────────────────────────────────┴──────────────────────────────┤
│ WHERE CONFIRMED STREAMS ARE SITTING   | TOP MISSING INFO PATTERNS | RECENT SIGNALS          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Desktop rules

- confirmed list dominates the screen
- draft queue is secondary but always visible
- top metrics are concise, not storytelling panels
- bottom row is compact support context
- stream names are clickable; no redundant row button needed

---

## 7. Final mobile layout

```text
┌──────────────────────────────┐
│ Main Dashboard               │
│ [Search] [Filters]           │
├──────────────────────────────┤
│ Streams 184                  │
│ Confirmed 126                │
│ Missing info 31              │
│ Ready 18 · Drafts 58         │
├──────────────────────────────┤
│ [Clients] [Confirmed] [Info] │
│ [Ready] [Drafts] [Complete]  │
├──────────────────────────────┤
│ Draft Waste Streams          │
│ Mixed metal scrap            │
│ ~8 t/mo                      │
│ Missing company + location   │
│ [Review draft]               │
├──────────────────────────────┤
│ Confirmed Streams            │
│ Spent Acetone Recovery       │
│ Meridian Chemical            │
│ 20 drums/mo                  │
│ Missing: Water %, SDS        │
│ Status: Waiting on client    │
├──────────────────────────────┤
│ Paint Sludge                 │
│ NorChem Foundry              │
│ 8 t/mo                       │
│ Missing: Classification      │
│ Status: Analyst review       │
├──────────────────────────────┤
│ Top Missing Info Patterns    │
│ Recent Signals               │
└──────────────────────────────┘
```

### Mobile rules

- one column only
- drafts appear before confirmed streams only if the selected bucket is `Drafts` or if draft review is urgent
- otherwise confirmed work queue remains primary
- every stream card must be readable in 3-4 lines max

---

## 8. Buckets and behavior

## Final bucket decision

Use buckets, but with discipline.

### Recommended bucket set

- `Clients`
- `All confirmed`
- `Missing info`
- `Proposal ready`
- `Drafts`
- `Complete`

### Behavior rules

- `All confirmed`, `Missing info`, `Proposal ready`, `Complete` act on confirmed streams
- `Drafts` acts on the draft queue only
- `Clients` switches the dashboard into a client-centric view, not a status view

This preserves the useful simplicity of the alternative sketch without collapsing distinct semantics.

---

## 9. Status model

Replace `deal stage` with `status` in the main list.

Recommended visible statuses:

- `In discovery`
- `Waiting on client`
- `Analyst review`
- `Blocked`
- `Proposal-ready`
- `Complete`

Status is metadata, not primary navigation.

That is a critical design decision.

The dashboard is organized around action buckets, not around status taxonomy.

---

## 10. Draft model

Draft waste streams are:

- AI-detected candidate streams
- extracted from notes, interviews, or files
- not yet human-confirmed
- not yet assigned to a company/location

Drafts should display:

- candidate stream name
- inferred volume if available
- source type
- what's still missing
- confidence or review urgency

Recommended actions:

- `Review draft`
- `Assign company`
- `Assign location`
- `Confirm stream`
- `Discard`

Core rule:

**Drafts are not part of the active confirmed portfolio until a human confirms them.**

---

## 11. Copy recommendations

## Page title

- `Main Dashboard`
- subtitle: `Portfolio pulse and active stream priorities`

## Metrics

- `Streams discovered`
- `Confirmed streams`
- `Missing information`
- `Proposal-ready`
- `Drafts pending review`

## Main list title

- `Confirmed Streams`
- subtitle: `Priority queue for active portfolio work`

## Draft module

- `Draft Waste Streams`
- subtitle: `AI detected, not yet confirmed`

## Bottom blocks

- `Where Confirmed Streams Are Sitting`
- `Top Missing Info Patterns`
- `Recent Signals`

Avoid vague titles like:

- `Pipeline`
- `Overview`
- `Open items`
- `Insights`

---

## 12. UX principles

1. **Action first**  
   The screen must answer: what needs attention now?

2. **Portfolio aware**  
   Metrics keep the broader picture visible without stealing focus.

3. **Confirmed and draft are different object classes**  
   Never blend them visually or semantically.

4. **Status is descriptive, not structural**  
   Use it in rows/cards, not as the whole IA.

5. **Buckets must filter real work, not just look nice**  
   Every bucket should change the user's next action.

6. **Reduce storytelling, increase decision support**  
   Less hero, more useful lists.

7. **The stream name is the main interaction target**  
   Cleaner than adding redundant CTA buttons everywhere.

8. **Volume must be visible**  
   Because commercial importance changes with quantity.

9. **Clients are a view, not the entire model**  
   Useful filter, not the main organizing principle.

10. **Clean beats dramatic**  
   Especially on a screen operators will use every day.

---

## 13. Final recommendation

Build the new dashboard around this logic:

- top = portfolio pulse
- next = bucket filter bar
- center = confirmed stream priority list
- right = draft queue
- bottom = compact portfolio support context

If there is one design decision to protect above all:

> **Keep confirmed streams at the center, and keep AI drafts isolated until the user confirms them.**
