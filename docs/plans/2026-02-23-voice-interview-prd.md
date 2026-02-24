# PRD: Voice Interview Intelligence for Waste Stream Capture

**Date**: 2026-02-23  
**Status**: implementation-ready  
**Owner**: Product + Engineering

## 1) Problem

Field agents lose critical information from interviews with facility managers/employees. Manual note entry is slow, incomplete, and inconsistent across locations and streams.

## 2) Outcome

Allow agents to upload interview audio (upload-only current scope), then automatically detect:
- locations mentioned
- waste streams per location
- questionnaire-relevant details per stream

All extracted content must be reviewable/editable, auditable, and safe before creation.

## 3) Users

- Primary: field sales/assessment agent.
- Secondary: reviewer/ops manager validating data quality.
- Tertiary: compliance/audit stakeholders.

## 4) Jobs to be done

- During/after site visit, capture conversation once and avoid retyping.
- Convert interview into structured multi-location waste data quickly.
- Preserve evidence trail for later audit/compliance checks.

## 5) Product principles

- Human-in-loop first.
- One approval workflow (reuse existing bulk import review/finalize).
- Reuse backend workflow/APIs; implement a voice-specific review UI.
- Multi-location native, not bolted on.
- No silent overwrite of questionnaire/canonical data.

## 6) Scope (v1)

- Input: upload audio (`mp3`, `wav`, `m4a`).
- Max upload size: 25MB.
- Processing: transcript + structured extraction.
- Review: grouped by detected location, editable stream cards, evidence snippets.
- Finalize: partial finalize allowed (resolved groups only).
- New locations from interview: created only at finalize.
- Questionnaire handoff: pending suggestions for apply/reject.
- Auditability: audio + transcript + audit events.

## 7) Out of scope (v1)

- Realtime meeting copilot.
- MP4/video upload.
- In-app audio recording.
- Fully automatic creation without human approval.
- Hard-writing questionnaire fields from AI without review.

## 8) Functional requirements

### 8.1 Capture
- User starts voice interview import from company or location context.
- Consent required before upload.
- Consent copy version used at upload time is persisted for auditability.
- Upload UX must be simple on iPhone/iPad/Android/laptop with clear helper instructions.
- Upload validation errors must be actionable and include accepted types + size limit.

### 8.2 AI processing
- System transcribes audio and extracts:
  - waste type
  - quantity + unit
  - location reference
  - disposal method
  - contamination notes
  - frequency
  - cost references
  - questionnaire hints mapped to known field catalog.

### 8.3 Review
- User can edit any extracted field.
- User can reject items/groups.
- User resolves location per group:
  - map existing (pre-selected when location confidence ≥ 90%)
  - create-on-finalize (new location row is created only during finalize)
  - reject.
- Each extracted item exposes evidence with fast verification (quote + timestamp + play action).
- Single sticky audio player with seek-to-timestamp from evidence links.
- Empty/error states defined:
  - 0 items extracted: message + retry extraction or close interview as finalized with `created_count=0`.
  - All items confidence < 50%: warning banner, user can still proceed.
  - Transcript empty/inaudible: error state + retry.
  - Transcript exceeds chunk budget: show actionable message to split shorter audio and retry.

### 8.4 Finalize
- User can finalize resolved groups while leaving unresolved groups pending.
- Resolved group means location action selected and no pending-review child items.
- Resolved groups are identified by stable run-scoped `group_id` values.
- Empty extraction can be closed only via explicit `close_reason=empty_extraction` path.
- System creates locations (if selected) only during finalize.
- System creates approved waste streams in canonical records.
- Finalize is replay-safe with idempotency key semantics.

### 8.5 Questionnaire integration
- System stores extracted questionnaire data as pending suggestions.
- User applies/rejects suggestions; no silent overwrite.

### 8.6 Success handoff UX
- After finalize/partial finalize, show success state with:
  - created streams count
  - pending questionnaire suggestions count
  - one-click CTA `Review suggestions now`.

### 8.7 Upload-first policy (current)
- Current release is upload-only.
- In-app recording considered later only if usage data justifies added complexity.

### 8.8 Diarization policy
- Speaker labels are optional metadata only in v1.
- Extraction quality must not depend on diarization being present.

### 8.9 Audit/compliance
- Keep recording + transcript available for audits under RBAC.
- Log all critical actions in audit events.
- Legacy bulk-import purge always skips voice runs; only voice retention jobs can delete voice artifacts.
- Playback/retrieval endpoints must enforce org RBAC and support audit-detail playback.

## 9) UX wireflow (target)

1. CTA `Voice Interview` (company/location page)
2. Start modal: consent + retention + upload (Dialog on desktop, Sheet on mobile)
3. Processing status (inline stepper card)
4. Review workspace:
   - Desktop (≥1024px): split-panel — transcript left, grouped cards right
   - Mobile (<1024px): tabbed layout (`Transcript | Extracted`)
5. Resolve location per group (pre-selected when confidence ≥ 90%)
6. Edit/reject stream cards
7. Duplicate warnings inline (compare drawer deferred to Sprint 2)
8. Sticky `Finalize resolved groups`
9. Success state with CTA `Review suggestions now`
10. Post-finalize questionnaire suggestion queue
11. Audit detail with playback + audit events

Responsive rule:
- Desktop: split view (transcript + extracted groups).
- Mobile/tablet: tabbed single-column view (`Transcript | Extracted`) with sticky finalize action.

## 10) Retention and privacy defaults

- Audio retention default: 180 days.
- Transcript retention default: 24 months.
- Audit events retention default: 24 months.
- Encryption in transit and at rest.
- Org RBAC enforced for all artifacts.

## 11) Success metrics

- `transcription_success_rate`
- `review_ready_rate`
- `partial_finalize_rate`
- `time_to_first_finalize_minutes`
- `location_resolution_rate`
- `questionnaire_suggestion_apply_rate`
- `manual_edit_rate`
- `audit_access_error_rate` (should stay near zero)

## 12) Risks and mitigations

- Ambiguous location mentions -> mandatory human location resolution.
- Extraction hallucinations -> evidence + edit + apply/reject gates.
- Reviewer fatigue -> keep v1 narrow (single workspace, explicit resolve actions, one-click suggestion handoff); bulk actions/confidence defaults deferred.
- Privacy concerns -> explicit consent + retention enforcement jobs.
- Long noisy interviews -> chunked extraction + consolidation before review payload.

## 13) Release plan

- Sprint 1: upload + extraction + review + partial finalize + create-on-finalize location + questionnaire suggestion review/apply/reject + retention enforcement jobs.
- Sprint 2: transcript correction/re-extract + confidence UX + robustness/observability polish.
- Sprint 3 (optional): recording decision gate by metrics + optional automation policy.
