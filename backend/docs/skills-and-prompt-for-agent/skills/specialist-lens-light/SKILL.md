---
name: specialist-lens-light
description: Apply a light specialist lens to each sub-stream identified by the sub-discipline-router — solids, aqueous liquids, organic liquids, sludges, gases/vapours, or containerised/lab-pack — producing profile questions, analytical needs, and red flags only. This is the Discovery-mode version of specialist analysis — no routing recommendations, no RCRA classification, no LDR analysis, no DOT specs. Trigger whenever the sub-discipline-router assigns a lens to a sub-stream. Output the questions a specialist would ask a producer about this phase, the analytical workup a specialist would want, and the safety / hazard red flags that apply. Do not advance into monetisation routing or regulatory determination — those belong to Assessment mode. Prefer this skill over skipping specialist input; even in Discovery, a phase-specific question set is far more productive than generic elicitation.
---

# Specialist lens (light) — Discovery mode

This is the Discovery-mode specialist layer. For each sub-stream assigned a lens by the router, produce three outputs:

1. **Profile questions** — what a specialist would ask the producer about this sub-stream.
2. **Analytical needs** — what a specialist would want in the lab workup.
3. **Red flags** — the safety and hazard concerns specific to this phase.

That is all. No RCRA codes, no routing recommendations, no LDR treatment standards, no DOT packaging specs. The full specialist lenses (with routing and classification) are Assessment-mode work.

The point of running this in Discovery is that **phase-specific questions produce better evidence than generic intake questions**. A specialist knows what to ask about a refinery tank-bottom sludge that a generalist does not.

## The six lenses

Each lens has a profile-question set, an analytical-needs set, and a red-flags set. Use the lens matching the router's assignment for each sub-stream.

### Lens 1 — solids-specialist

**Examples of sub-streams:** spent catalyst (FCC, hydrotreating, reforming), contaminated soil, filter cake, foundry sand, fly ash, soot, crushable solids.

**Profile questions:**
- What process generated the solid, and at what step in the process?
- What is the current handling state — drummed, supersacked, bulk, loose?
- Moisture / wetness visible? Has the solid been in contact with a process liquid?
- What is the particle size range — fines, granular, lumps, aggregate?
- Is the material pyrophoric on exposure to air? (Sulfided hydroprocessing catalyst is — always.)
- What was the immediate prior service of the unit? Sulfur content of the feed?
- Is there residual metal value (Ni, V, Mo, Pd, Pt)? Is recovery being considered today?

**Analytical needs:**
- Metals composition (bulk and/or TCLP) — characteristic metals D004–D011 and potential recovery value
- Ignitability / autoignition behaviour, especially on air exposure
- Sulfide content (if from hydroprocessing)
- BTEX / semi-volatile organics if solid has been in contact with hydrocarbon phase
- Moisture content (loss-on-drying) — affects both routing and mass conversions
- Radioactivity screen (NORM) — relevant for some oil-field and mineral-processing solids

**Red flags:**
- **Pyrophoric on air exposure** — spent sulfided catalyst, freshly discharged hydrotreating catalyst. STOP-FLAG if handling has not accounted for inerting / blanketing.
- **NORM** — oil-field solids may carry naturally-occurring radioactive material above action thresholds. SPECIALIST-FLAG.
- **Fines inhalation risk** — very fine powders with metal content; handling requires respiratory PPE beyond default.

### Lens 2 — aqueous-liquids-specialist

**Examples:** spent acids, spent caustics (merox sulfidic, ethylene, pyrolysis, general), process water, rinsate, cooling-tower blowdown, pickle liquor.

**Profile questions:**
- What process generated the aqueous stream, at what unit?
- pH range — at generation and at storage?
- Is it buffered? Does pH drift over time in storage?
- Temperature at generation, at storage, at loading?
- Is the stream being blended with anything before export?
- Sulfide or cyanide present? (Both have reactive-waste implications.)
- Any hydrocarbon or organic phase riding on top / in suspension / dissolved?
- Solids or particulates — origin, size, density, settles?
- Has the stream ever been rejected by a downstream taker? Why?

**Analytical needs:**
- pH (fresh sample)
- Alkalinity / free caustic (for caustics) or acidity (for acids)
- Sulfide and mercaptan concentration
- Chlorides, fluorides (fluoride presence changes routing dramatically)
- BTEX / TPH for hydrocarbon contamination
- TOC, COD
- Metals (TCLP for D004–D011 characteristic screening)
- Specific gravity / density — critical for mass conversions
- Solids / particulates percentage

**Red flags:**
- **H<sub>2</sub>S evolution risk** — high sulfide caustic on acidification or in enclosed transfer. STOP-FLAG on unprotected transfer; SPECIALIST-FLAG on routing decisions.
- **HF-containing streams** — hydrofluoric acid contamination (from alkylation, glass etching, semiconductor) is a specialist-only material. SPECIALIST-FLAG always.
- **Cyanide-containing aqueous streams** — D003 reactive if conditions permit HCN generation. SPECIALIST-FLAG.
- **pH ≥ 12.5 or ≤ 2.0** — likely D002 corrosive in Assessment; in Discovery, flagged as probable characteristic waste.
- **Unknown or unstable composition** — rinsate from unknown process history is a labpack-equivalent risk.

### Lens 3 — organic-liquids-specialist

**Examples:** solvents (halogenated and non-halogenated), waste oils, slop oil, off-spec fuels, distillation fractions, wet organic streams.

**Profile questions:**
- What process generated the organic stream? Was it a solvent used in a process, a fuel off-spec, or a hydrocarbon separation?
- Known constituents? Any idea of % halogens, % aromatics, % oxygenates?
- Water content — dry, wet, emulsion, two-phase?
- Colour, clarity, suspended solids, odour?
- Flash point known? From SDS, COA, or producer estimate?
- Is the stream being generated deliberately (solvent recycle) or as a process byproduct?
- Has the stream been in contact with PCBs at any point in its history? (PCB history → TSCA jurisdiction.)
- Is fuel-blending being considered? If so, what heating-value data exists?

**Analytical needs:**
- Halogens (total, and speciated for F001–F005 screening)
- Flash point (closed-cup, Pensky-Martens or equivalent)
- Benzene content (D018 threshold) and broader BTEX
- Water content (Karl Fischer or distillation)
- Metals (lead, barium, chromium — TCLP for D008, D005, D007)
- Sulfur, nitrogen (for fuel-grade considerations)
- PCBs (if any history suggests possibility — 50 ppm threshold is a TSCA line)
- Heat of combustion (BTU/lb) if fuel-blending under consideration

**Red flags:**
- **F001–F005 solvent lookback** — if the stream contains any listed solvent above threshold, it is a listed hazardous waste regardless of dilution. The mixture and derived-from rules are unforgiving here.
- **Benzene > 0.5 mg/L TCLP** — D018 toxicity characteristic.
- **PCBs ≥ 50 ppm** — TSCA jurisdiction; the material is no longer RCRA-only. SPECIALIST-FLAG.
- **Peroxide formation** — aged ethers (THF, diethyl ether, isopropyl ether) develop crystalline peroxides. STOP-FLAG on any visible crystallisation at threads or caps.
- **Flash point < 100°F** — likely D001 ignitable. Handling flag.

### Lens 4 — sludges-specialist

**Examples:** tank bottoms, API separator sludge, DAF float, refinery sludges (K048–K052), paint sludge, biological treatment sludges.

**Profile questions:**
- What was the parent process? (Refinery K-listings attach automatically to sludges from specific origins.)
- How long has the sludge been in place? (Aged tank bottoms differ from fresh.)
- Consistency — pourable, pasty, chunky, mixed solid-and-liquid?
- Water content, free-liquid content (Paint Filter Liquids Test passes or fails?)
- Is the sludge being skimmed / pumped / dug / vac-trucked?
- Has the tank or vessel ever contained leaded product? (Historic TEL or other lead gasoline contamination is a hazardous-characteristic driver.)
- Iron sulfide / pyrophoric scale concern?
- Benzene content (expected in petroleum sludges)?

**Analytical needs:**
- Full TCLP suite (D004–D043)
- Benzene (D018)
- PAHs (B2F biennial-report relevance, and routing for land disposal)
- Sulfide, iron-sulfide stability
- Moisture content, Paint Filter Liquids Test
- Organic content (TPH, oil-and-grease)
- Heavy metals (D004–D011 screening)

**Red flags:**
- **Refinery origin from listed processes** — K048 (DAF), K049 (slop oil emulsion), K050 (heat exchanger bundle), K051 (API separator), K052 (leaded tank bottoms). Listings attach regardless of characteristic.
- **Pyrophoric iron sulfide** — refinery tank bottoms frequently form FeS scale. Ignites on exposure to air; STOP-FLAG on cleanout without inerting.
- **Free liquids present** — Paint Filter Liquids Test failure means the material is not landfillable in most regions without treatment. Routing implication in Assessment; handling flag in Discovery.
- **Lead content from historic leaded tank service** — D008 and potentially also K052.

### Lens 5 — gases-vapours-specialist

**Examples:** compressed-gas cylinders (identified and unidentified), aerosols, refrigerants, lab gas drums, orphaned cylinders.

**Profile questions:**
- Is the cylinder labelled? Legibly? With what?
- Manufacturer markings, DOT stamp, last hydrotest date?
- Valve present, closed, intact? Cap present?
- Size class (cylinder, Y-cylinder, tube trailer)?
- Estimated pressure state — full, partial, empty-by-vendor-reckoning?
- Producer's knowledge of contents — confident, inferred, unknown?
- How long has the cylinder been in place?
- Known or suspected contents — flammable, toxic, inert, oxidiser, corrosive?

**Analytical needs:**
- Cylinder identification by stamp / markings / valve type
- Gas identification only by qualified specialist — never by sampling without safety plan
- For unlabelled cylinders: specialist field identification required before any disposition

**Red flags:**
- **Never accept an unidentified cylinder without specialist workup.** STOP-FLAG always. Unidentified cylinders are not a commercial opportunity in Discovery — they are a safety project.
- **Acutely toxic gases** — arsine, phosphine, silane, HCN, HF, Cl<sub>2</sub>. SPECIALIST-FLAG, specialist routing required.
- **Hydrotest overdue** — cylinders past hydrotest cannot be legally shipped. Handling flag.
- **Valve compromised** — broken or missing valve, cap missing, visible corrosion. STOP-FLAG until stabilised.
- **Aged lecture bottles** of reactive gases — common in academic cleanouts and often orphaned. SPECIALIST-FLAG.

### Lens 6 — containerised-labpack-specialist

**Examples:** mixed drums from lab cleanouts, academic or research lab clearances, historic site inventories, mixed maintenance drums with unknown contents.

**Profile questions:**
- How many containers, what sizes, what container types?
- How many labelled, how many partially labelled, how many unlabelled?
- What is the age range of the contents (2 years vs 20 years is a different risk profile)?
- Was there a prior attempt to inventory the contents?
- Are there known ethers, peroxide formers, picric acid, unknown crystallised solids?
- Any cylinders in the mix? (Route them out to the gases lens.)
- Is the producer's intent partial disposition (identified containers only) or full clearance?

**Analytical needs:**
- Per-container identification is the analytical plan. This is an inventory task, not a bulk analysis task.
- Where identified containers allow aggregation, composite analysis per compatible group.
- Unknowns require a per-container identification step before any bulk analytical planning.

**Red flags:**
- **Crystalline solids on old bottles of picric acid, ether, sodium-borohydride solutions, perchloric acid, or others** — shock-sensitive risk. STOP-FLAG and specialist-only handling.
- **P-list containers** — acutely hazardous; a single 100-lb threshold can push a generator from SQG to LQG on paperwork alone. Flag in Discovery as "P-list trigger risk to generator status."
- **Shock-sensitive or peroxide-former groups** — handle as explosive-risk until proven otherwise.
- **Unlabelled containers** — treated as unknown; cost and risk dominate the commercial framing.

## Output format

For each sub-stream (as numbered by the router), produce:

```
Sub-stream 2: Merox spent caustic  |  Lens: aqueous-liquids-specialist

Profile questions for the producer:
- At what step in the merox extractor is it drawn? Treating gasoline, kerosene, or LPG feed?
- pH at generation? At storage?
- Is it being blended with any other caustic (wash caustic, ethylene spent caustic)?
- Has the stream ever been rejected by a downstream processor?
- Do you have the DS Monitor or any COA history?
- Is the stream being stored under N<sub>2</sub> blanket or ambient?

Analytical needs (for the specialist, commissionable during Discovery):
- pH
- Free caustic / alkalinity
- Sulfide, mercaptan
- BTEX (cross-links to sub-stream 3 — one composite covers both)
- Chlorides
- Specific gravity (confirm COA value)

Red flags:
- H<sub>2</sub>S evolution risk on acidification or enclosed transfer. SPECIALIST-FLAG.
- pH likely ≥ 12.5 — probable D002 in Assessment.
- If sulfide > threshold and reactive-waste definition met — potential D003. Flag.
```

## What this skill never does in Discovery

- **Does not recommend routes.** No "send this to a CWT facility" or "regeneration is viable." Routing is Assessment work.
- **Does not produce RCRA codes.** Flags ("likely D002," "possible D003") are allowed as probability signals; determinations are Assessment.
- **Does not price.** No $/ton on outlets. Commercial-shaping produces directional ranges with arithmetic, not the lens.
- **Does not design transport.** UN / class / PG appear if visible in the SDS; full DOT packaging is Assessment.
- **Does not decide whether the opportunity is commercially viable.** That is commercial-shaping's lens. This skill produces technical inputs to that decision.
