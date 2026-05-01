---
name: multimodal-intake
description: "Interpret non-text inputs and convert them into structured waste-opportunity evidence. Load for every image, audio, or video upload, and when the user verbally describes a photo, label, placard, container, site condition, or walk-through. Use to extract visible/mentioned container, label, placard, packaging, site-context, PPE, and safety signals before downstream analysis."
---

# Multimodal intake

The field agent's phone is their primary instrument. Photos, voice notes, short videos — these carry more information than the user typically knows, and less than the agent needs. Your job is to extract what's there honestly, flag what's missing, and surface anything dangerous even if nobody asked.

## What to extract from an image

For every image, work through this list silently and report only what is present:

**Container identification**
- Type: drum (55-gal / 30-gal / 5-gal), tote, IBC (~275 or 330 gal), bulk tank, roll-off, carboy, cylinder, lab bottle, sack, supersack, vac truck.
- Approximate capacity.
- Material: steel, poly, fibre, stainless, lined. Lined-steel vs bare-steel matters for caustics and acids.
- Closure: bung, cap, clamp ring, valve, unsealed, open-top.
- Markings: UN number (e.g. UN1824), manufacturer code, reconditioned marks, capacity stamp.

**Labels and placards**
- **DOT shipping label** on container — hazard class diamond (Class 3, 8, 6.1, etc.), proper shipping name, UN number, packing group (PG I / II / III).
- **DOT placard** on vehicle or truck (the larger diamond).
- **NFPA 704 diamond** — four quadrants (blue health / red fire / yellow reactivity / white special). Read all four numbers when legible.
- **HMIS bar** — horizontal coloured bars.
- **GHS pictograms** — the red-bordered diamonds with pictographs (skull, corrosion, flame, exploding bomb, etc.). List each pictogram seen.
- **Hazardous Waste label** (US) — accumulation start date, generator name, contents, waste codes if present. **Note the accumulation date** — generator-status rules (VSQG / SQG / LQG) have accumulation time limits.

**Contents cues**
- Colour, phase (liquid / solid / sludge / mixed), clarity, solids presence, foam, separation into layers, crystalline growth on threads or bungs (a crystalline deposit on an old container of an ether or picric acid is a **stop-flag**).
- Level in container.
- Any handwritten labels, tags, chain-of-custody tags, sample stickers.

**Container condition**
- Bulging, swollen, deformed — pressure inside → stop-flag.
- Leaking, staining, wet areas around the base — stop-flag.
- Corrosion, rust-through, swollen seams → attention.
- Ice, crystals, residue on outside of an old-looking container → potential peroxide-former → stop-flag.
- Unlabelled or label-damaged containers → increases uncertainty, often closes the qualification-gate on identity.

**Site context**
- Secondary containment present (pallet, tray, berm) or absent.
- Segregation from incompatible materials (acids and cyanides separated? oxidisers away from organics?).
- Storage location — satellite accumulation area (at point of generation, <55 gal limit per container), 90-day area, central storage, outdoors, covered.
- PPE visible on workers in frame (and whether adequate for the material — e.g., Tyvek-only where full acid suit is needed).
- Spill kit, eye wash, deluge shower availability.

**What is NOT in the image**
- Note missing items. A drum with no labels at all is a very different evidence point than one with a partial label. "No DOT label visible" is useful to the agent.

## What to extract from audio (voice notes)

Voice notes are the field agent's commonest capture format. Transcribe and structure; do not paraphrase into loss.

- **Material identity cues** — what did they call it? Exact words matter ("spent caustic" vs "sulfidic caustic" vs "merox spent caustic" are three different evidence strengths).
- **Process origin cues** — unit, batch, step, frequency. "From the FCC unit, goes to the slop tank, pumped out twice a month."
- **Quantity cues** — producer language ("a few drums," "around 20,000 gallons a month"). Note the qualifier — verbal ranges are softer than metered records.
- **Commercial cues** — current handling, current vendor, pain points, timeline. "Clean Harbors does it now, they want out of the contract next year."
- **Safety cues** — "don't open that one," "we had an incident last year," "last load came back rejected." These are critical.
- **Questions the agent asked and was deflected on** — the producer's deflection pattern is itself evidence.

Preserve direct quotes for anything commercial or safety-relevant — the exact phrasing often matters more than the gist.

## What to extract from video

Short site walk-throughs:
- Container count per area, layout, density.
- Route from generation point to storage to loading — does the site have the infrastructure to support what the producer is proposing?
- Site condition — housekeeping signals capability and competence.
- Any container or area the producer hurried past (a tell).

Freeze relevant frames mentally for container-level extraction as above.

## Always-on safety flagging

**This is the rule that overrides everything else.** If any of the following is visible, surface it at the top of the response regardless of what the user asked:

- Bulging, leaking, or visibly compromised containers
- Crystalline deposits on old ether / picric acid / unknown bottle threads
- Uncapped or open cylinders (especially unlabelled)
- Incompatible co-storage (oxidisers with organics, acids with cyanides, acids with sulfides)
- Placards or labels indicating acutely toxic, pyrophoric, or reactive materials in poor condition
- Absence of secondary containment where clearly needed
- Workers in frame without appropriate PPE for what is visible

Tag these as stop-flag / specialist-flag / attention-flag and hand off to `safety-flagging` for severity routing and gate implications.

## Output format

Produce a structured extraction, not prose:

```
Image 1 — source: site photo from Corpus Christi Apr 2026

Containers:
  - 6× 55-gal steel drums, closed-head, bungs sealed
  - 1× 275-gal IBC (poly, caged), unknown contents label torn
  - 2× small cylinders upright in corner, no placards visible

Labels / placards:
  Drum 1: DOT Class 8, UN1824, PG II. Hazardous Waste label, accumulation date 2026-02-14 (~60 days at time of photo).
  IBC: No labels legible.

NFPA 704: not present
GHS pictograms: corrosion (on drums 1–6)

Condition:
  Drum 3 — dent in lower side, no active leak, dry.
  IBC — appears intact.
  Cylinders — no visible damage BUT unlabelled and uncapped. SAFETY FLAG.

Site context:
  Pallet under drums — present (plastic spill pallet).
  IBC sitting directly on concrete — no containment.
  Covered storage, outdoor bay.
  PPE on worker in frame: hard hat, safety glasses, nitrile gloves. (Face shield absent given corrosive drums.)

Missing / uncertain:
  IBC contents unidentifiable from image — Required.
  Cylinder identification impossible — stop-flag to hand off to safety-flagging.

Safety flags raised:
  STOP-FLAG: uncapped unidentified cylinders (ref safety-flagging skill)
  ATTENTION: IBC on concrete without containment
  ATTENTION: corrosive drums stored with limited worker PPE (face shield)
```

## What this skill never does

- **Does not classify waste.** A corrosion pictogram is evidence, not a RCRA D002 determination. Classification belongs to Assessment-mode skills.
- **Does not identify people.** Faces in photos are not subjects of interpretation; PPE on bodies is.
- **Does not guess content from container colour.** Blue drums are not always caustics; red drums are not always flammables. Marketing trumps convention and the evidence is the label, not the shell.
- **Does not produce DOT packaging specs.** Noting UN1824 on a label is evidence; specifying the correct packaging for a shipment is Assessment.
- **Does not overstate certainty.** If the image is blurry or partial, say so. "UN1824 partially legible — appears to be UN1824, confidence MEDIUM" is better than pretending you saw it clearly.
