---
name: sds-interpretation
description: "Extract, interpret, and cross-check SDS, COA, lab analysis, TCLP/SPLP, waste profile, and other composition/hazard/property documents. Load when such documents are uploaded or pasted, or when the user asks about H-statements, P-statements, pictograms, SDS sections, or analytical results. Use to extract and flag inconsistencies in Discovery mode without making final RCRA/routing classifications."
---

# SDS and lab-report interpretation (Discovery mode)

An SDS is the single richest evidence document in any opportunity. It tells you what the producer's supplier said the material **is** — not what it has **become** after use, but close enough that it anchors identity better than any other source. COAs and lab reports tell you what the material **actually is right now**, at a specific sampling point.

In Discovery mode, you **extract and flag**. You do not derive final RCRA classification or make routing decisions — those are post-Discovery compliance outputs. Hunches that affect commercial framing (likely ignitable, likely corrosive on pH, likely contains halogenated solvents) are surfaced as "flagged considerations for later compliance review," not as determinations.

## The 16 SDS sections — what to extract

Read every section. Do not skim. The most useful sections for Discovery:

### Section 1 — Identification
- Product name, product code, synonyms
- Supplier name and address
- Recommended use (is this a deliberate product or a byproduct?)
- Emergency number

### Section 2 — Hazards identification
- GHS classification category(ies)
- Signal word (Danger / Warning)
- Hazard statements (H-codes): `H314` corrosive-skin, `H225` flammable-liquid, `H300` fatal-if-swallowed, `H350` carcinogen, etc.
- Precautionary statements (P-codes)
- Pictograms
- Any statements about hazards not otherwise classified

### Section 3 — Composition
The most often-misread section. Capture every listed component with:
- Chemical name
- CAS number
- Concentration or concentration range
- Any trade-secret withholding (`confidential` or a range like 10–30%)

**Composition gaps are Required gaps in Discovery.** If section 3 uses very wide ranges or withholds components as trade secret, note that the SDS alone will not support full classification and analytical work will be needed.

### Section 4 — First aid
Usually skipped for Discovery, but worth a glance — acute-exposure routes give handling cues.

### Section 5 — Fire-fighting
Flash point, autoignition, flammability class. Incompatible extinguishing agents. If the material is fuel-rated, this affects BIF / fuel-blending viability in post-Discovery specialist review.

### Section 6 — Accidental release
Containment notes, incompatibles.

### Section 7 — Handling and storage
Storage temperatures, incompatibles, ventilation requirements.

### Section 8 — Exposure controls and PPE
PEL / REL / TWA values. Required PPE. These drive handling flags in the executive report.

### Section 9 — Physical and chemical properties
Capture all of: appearance, odour, pH, melting/freezing point, boiling point, flash point, autoignition temperature, flammable limits (LEL / UEL), vapor pressure, vapor density, relative density (specific gravity — critical for mass conversions), solubility, viscosity.

**pH and flash point are the two highest-value numbers in Discovery.** pH drives corrosivity flags; flash point drives ignitability flags.

### Section 10 — Stability and reactivity
Reactive conditions (heat, shock, water), incompatibles, hazardous decomposition products. This section drives many safety flags.

### Section 11 — Toxicology
LD50, LC50, IARC/NTP/OSHA carcinogen status.

### Section 12 — Ecology
Aquatic toxicity, biodegradability.

### Section 13 — Disposal considerations
Sometimes lists probable RCRA codes. Treat these as **supplier suggestion**, not determination. SDS authors are not the generator's RCRA classifier.

### Section 14 — Transport
UN number, proper shipping name, hazard class, packing group, ERG number, marine pollutant status. Capture everything here — transport-logistics work in Assessment depends on it.

### Section 15 — Regulatory
SARA 313, CERCLA, Prop 65 (California), TSCA inventory status, PCB thresholds, state-specific listings.

### Section 16 — Other information
Revision date and version number. **Stale SDSs (> 5 years old) are noted as aged evidence** — not invalid, but worth confirming with the supplier that the spec has not changed.

## COA / lab-report extraction

Capture every reported parameter with:
- Parameter name
- Result
- Unit (watch for unit mismatches — %, mg/L, mg/kg, ppm, ppmw all have specific meanings)
- Method (if stated)
- Sampling point and date
- Sample ID and lot / batch number
- Any notes about failed tests, non-compliance with supplier spec, or holding-time exceedances

COA data points that matter most for commercial framing in Discovery:
- **Specific gravity / density** — mass conversions
- **pH** — corrosivity direction
- **Total organics / hydrocarbons** — contamination signal, spec-fit for buyers
- **Solids / particulates** — physical spec-fit
- **Sulfide** — reactivity flag (high sulfide → H<sub>2</sub>S evolution risk, also informs Merox vs other process identity)
- **Chlorides** — often a spec-fit killer for reuse routes
- **Metals (as measured, not TCLP)** — indicative of hazardous characteristic risk
- **Appearance / colour notes** — flags rework requirements

## Cross-checking — the real value of this skill

Extraction is mechanical. The real value is surfacing inconsistencies:

**SDS vs SDS** — different site SDSs for "the same stream" often reveal process differences. Baytown merox spent caustic and Beaumont merox spent caustic are not the same material.

**SDS vs COA** — SDS says "pH 12–14," COA measures pH 13.13. Consistent. If COA measures pH 8, the material is not what the SDS described (neutralised? mislabelled? wrong sample point?).

**SDS vs photograph** — SDS says "clear yellow liquid," photo shows opaque black material with visible solids. That's an evidence conflict. Note it.

**SDS vs producer verbal** — producer says "just wastewater," SDS says "Section 2: Danger, corrosive H314, H318." Producer language does not override GHS classification.

**COA vs COA over time** — same tank, multiple sample points, trending parameters. If sulfide concentration is rising sample-to-sample, the process has drifted or contamination is accumulating. That is commercial information.

## Discovery-mode output

Structured extraction, not prose summary:

```
Document: Spent Sulfidic Caustic SDS (ExxonMobil, rev Nov 2017)
  Section 2: Danger. H314 skin corrosion 1B. Pictograms: corrosion, health-hazard.
  Section 3: Sodium hydroxide <5%, petroleum-derived neutralising agents <10%. Trade-secret balance (~85% water inferred).
  Section 9: Liquid, pH ~14 (2-step), SG not stated, flash point not stated.
  Section 14: UN1824 Sodium Hydroxide Solution, Class 8, PG II.
  Section 15: Benzene, naphthalene, toluene cited (SARA 313, Prop 65).
  Section 16: 2017 revision — AGED EVIDENCE, confirm current spec with producer.

Document: Tank 1499 COA (Baytown, sampled 2026-04-04)
  SG 1.1235
  pH 13.13
  Alkali 6.4%
  Sulfide 0.74%
  Mercaptan 1.85%
  Chlorides 11.3 mg/kg
  Free caustic 5.6%
  Hydrocarbons: POSITIVE (no quantitation)
  Solids 0%

Cross-check:
  SDS pH 12–14 vs COA pH 13.13 — consistent.
  SDS hydrocarbon presence (sections 3, 15 imply benzene/naphthalene/toluene content) vs COA hydrocarbons POSITIVE — consistent qualitatively.
  SG in COA (1.1235) unavailable in SDS — newly known evidence point.

Flagged considerations for later compliance review:
  - Likely D002 corrosive (pH ≥12.5). Also flag: possible D003 reactive-sulfide if sulfide > threshold.
  - UN1824 Class 8 PG II transport frame confirmed in SDS.
  - Benzene presence in the SDS regulatory section implies possible D018 toxicity-characteristic flag — confirmation needs quantified benzene analysis (not in this COA).
  - TSCA inventory status unchecked on the petroleum-derived neutralising agents — post-Discovery compliance question.

Required gaps (Discovery):
  - SDS is 2017 revision — confirm current material spec.
  - Composition section 3 uses wide ranges and trade-secret withholding — full COA or typical analytical workup would strengthen.
  - Benzene / BTEX concentrations not on current COA — needed for hazardous-characteristic determination in post-Discovery specialist review.
```

## What this skill never does in Discovery mode

- **Does not assign final RCRA codes.** Flags ("likely D002") are allowed; determinations ("this stream is D002 corrosive") are post-Discovery compliance review.
- **Does not specify DOT packaging or placarding specs.** Note transport UN / class / PG from the SDS; full transport design is post-Discovery compliance review.
- **Does not write the LDR notification or determine BDAT compliance.** Post-Discovery compliance review.
- **Does not name specific TSDFs, recyclers, or fuel-blenders.** Generic category language only ("permitted CWT facility").
- **Does not accept supplier disposal suggestions as authoritative.** Section 13 of an SDS is a starting hypothesis, never a conclusion.
- **Does not hide composition ambiguity.** If the SDS uses wide ranges or withholds trade secrets, say so. Commercial decisions made on an SDS that does not disclose composition are commercial decisions made on bad evidence.
