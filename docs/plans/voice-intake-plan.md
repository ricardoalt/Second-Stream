# Voice Interview Plan (Multi-Location)

**Updated**: 2026-02-23  
**Goal**: field agent records interview -> AI extracts multi-location waste streams + questionnaire hints -> reviewer approves -> system creates clean records with full auditability.

## Locked decisions
- Partial finalize: enabled (resolved groups only).
- New locations: create only during finalize (never during review edit).
- Input formats v1: `.mp3`, `.wav`, `.m4a` only.
- In-app recording: not in current scope (upload-only now).
- Retention default: audio `180 days`, transcript `24 months`, audit events `24 months`.

## Normative constants (single source)
- Max upload size v1: `25MB`.
- Upload byte limit: `MAX_UPLOAD_BYTES = 25_000_000`.
- Retry ceiling: `MAX_PROCESSING_ATTEMPTS = 3`.
- Status vocabulary: `uploaded|queued|transcribing|extracting|review_ready|partial_finalized|finalized|failed`.
- Create-on-finalize means location rows are created only inside finalize transaction.
- Chunking defaults: `4000` tokens per chunk, `200` overlap, max `20` chunks, dedupe threshold `>=80%` field overlap.
- Single-writer rule: for `source_type=voice_interview`, only voice-status sync logic can write `import_runs.status`.

## Product shape
- Use hybrid model:
  - `voice_interviews` stores capture artifacts + processing status + consent + retention.
  - existing `bulk_import` run/item remains canonical review/finalize workflow.
- Human-in-loop mandatory in v1/v2.
- Multi-location first-class from v1.

## Core flow
1) Start from company/location page -> `Voice Interview`.
2) Consent + upload audio (guided UX for iPhone/iPad/Android/laptop).
3) Async pipeline: transcribe -> extract groups/items/questionnaire hints.
4) Review workspace:
   - transcript + summary + evidence
   - groups by detected location
   - editable stream cards
5) Resolve each group: map existing location | mark as create-new-on-finalize | reject.
6) Partial finalize:
   - resolved groups finalized now
   - unresolved groups stay pending until map/reject.
7) Success handoff (immediate):
   - success screen shows created streams count + pending questionnaire suggestions count
   - CTA `Review suggestions now` opens direct quick-review flow (no manual navigation hunt)
8) Post-finalize suggestion review:
   - user applies/rejects suggestions explicitly.

## Data model direction
- `voice_interviews` (new, minimal):
  - ids/scope: `id`, `organization_id`, `company_id`, `location_id?`, `bulk_import_run_id`
  - artifacts: `audio_object_key`, `transcript_object_key`
  - status: `uploaded|queued|transcribing|extracting|review_ready|partial_finalized|finalized|failed`
  - control/audit: `consent_at`, `consent_by_user_id`, `consent_copy_version`, `audio_retention_expires_at`, `transcript_retention_expires_at`, `error_code`, `failed_stage`, `processing_attempts`, `created_by_user_id`
- `bulk_import_run` extensions:
  - `source_type=voice_interview`
  - run-level metrics fields (`audio_duration_seconds`, `speaker_count?`, `processed_at`).
- `import_item` artifacts:
  - stable run-scoped `group_id` per extracted location group (used by partial finalize)
  - evidence payload per item: `quote`, `start_sec`, `end_sec`, `speaker_label?`
  - extraction confidence + location confidence.

## UX wireflow (v1)
1. Entry CTA: company/location pages.
2. Start modal: consent required, retention shown, upload file.
3. Upload helper sheet (inline):
   - iPhone/iPad: Voice Memos -> Share -> Save to Files -> upload
   - Android: Recorder/Files -> choose audio -> upload
   - Laptop/Desktop: drag-and-drop or file picker
   - accepted types + max size shown before selection
4. Upload screen UX:
   - immediate validation errors with exact fix guidance
   - clear states `preparing -> uploading -> queued`
   - retry action for failed upload without losing context
5. Processing status with stage indicator + retry stage action.
6. Review workspace (new component tree, not extension of existing bulk import review):
   - desktop (≥1024px): split-panel (transcript left, grouped cards right)
   - mobile (<1024px): tabbed layout (`Transcript | Extracted`) to fit single-column
7. Left panel / Transcript tab: timestamped lines, click-to-seek.
8. Right panel / Extracted tab: grouped location queue + progress (`resolved/total`).
9. Sticky audio player at bottom of transcript panel (single `<audio>` element, seek-to-timestamp).
10. Group actions: map existing / create-on-finalize / reject.
    - pre-select `map existing` when `location_confidence >= 0.9` (user confirms, not chooses).
11. Stream cards: edit waste fields + see evidence snippet/timestamp.
12. Duplicate warnings inline in v1 (compare drawer deferred to Sprint 2).
13. Bottom sticky bar: `Finalize resolved groups`.
14. Empty/error review states:
  - 0 items extracted: show message + option to retry extraction or close interview as finalized with `created_count=0`.
  - all items confidence < 50%: show warning banner, user can still proceed.
  - transcript empty/inaudible: show error + retry.
  - transcript exceeds chunk budget (`VOICE_TRANSCRIPT_TOO_LONG`): show actionable guidance to split shorter audio and retry.
15. Success screen: created count + pending suggestions + CTA `Review suggestions now`.
16. Post-finalize: pending questionnaire suggestions per created stream, reachable in 1 click.
17. Audit detail: playback, transcript, edits, approvals, audit events.

## Iteration phases

### Phase 1 (MVP)
- Upload-only voice interview (`mp3/wav/m4a`).
- Async transcription + extraction into voice-specific review workspace (reusing bulk-import APIs/services).
- Long interview handling: chunk transcript + consolidate extraction (deterministic, no giant single-pass prompt).
- Multi-location resolver + partial finalize.
- Questionnaire handoff as pending suggestions (no direct overwrite).
- Audit events + retention timestamps.
- Evidence playback from timestamp in review card (single audio player acceptable in v1).
- Upload UX hardening:
  - platform-specific helper copy
  - precise validation + actionable error copy
  - resilient retry states.
- Workflow safety must-haves:
  - state invariants enforced (`review_ready|partial_finalized|finalized`)
  - finalize idempotency + concurrency guardrails
  - retention enforcement jobs active from v1
  - status sync contract between `voice_interviews.status` and `import_runs.status`

Sprint 1 cutline (if schedule pressure)
- Must ship: upload -> review -> partial finalize, questionnaire apply/reject, idempotent finalize, retention jobs.
- Can defer to Sprint 2: compare drawer polish, confidence chips, transcript re-extract UX refinements.

### Phase 2
- Transcript correction + re-extract action.
- Quality UX: confidence chips, bulk actions (`accept high confidence`, etc.).
- Duplicate compare drawer (side-by-side existing vs extracted fields).
- Optional diarization labels when provider/model quality is stable; never required for correctness.
- Upload acceleration improvements (faster retries, better mobile picker hints).

### Phase 3
- Decision gate for in-app recording (only if data justifies):
  - enable build only if 2 of 4 hold for 2 weeks: abandonment >15%, capture->upload >2.5min, mobile voice usage >50%, sharing/support tickets >10%
  - minimum sample size: >=200 attempts/week
- Optional auto-finalize policy for high-confidence resolved groups only.
- Org-level retention/consent controls in settings.
- Advanced analytics dashboards.

## Reliability + compliance requirements
- Async queue only, idempotent by `voice_interview.id`.
- Deterministic retries with max attempts + terminal `failed` state.
- Extraction correctness must not depend on diarization availability.
- Finalize path idempotent and retry-safe (double-submit cannot duplicate location/stream creation).
- Finalize contract (normative):
  - request finalizes only explicit resolved group IDs
  - `resolved_group_ids` refer to stable run-scoped `group_id` values persisted on extracted items
  - resolved group means location action selected and no `pending_review` child items
  - unresolved group in request -> `409`
  - empty group finalize allowed only for `close_reason=empty_extraction` when extracted group count is zero
  - replay with same idempotency key returns same result (no duplicates)
  - run + affected items locked in one transaction during finalize
- Upload compensation contract:
  - if DB fails after S3 upload, delete uploaded object best-effort and emit cleanup-failed audit/log event on delete failure
- State invariants:
  - before first finalize action, status is `review_ready`
  - after finalize action, `unresolved_groups > 0` -> `partial_finalized`
  - after finalize action, `unresolved_groups = 0` -> `finalized` (including reject-all, `created_count = 0`)
- Status sync contract:
  - `voice_interviews.uploaded|queued` -> `import_runs.uploaded`
  - `voice_interviews.transcribing|extracting` -> `import_runs.processing`
  - `voice_interviews.review_ready|partial_finalized` -> `import_runs.review_ready`
  - `voice_interviews.finalized` -> `import_runs.completed`
  - `voice_interviews.failed` -> `import_runs.failed`
- Review data contract:
  - `GET /api/v1/voice-interviews/{id}` orchestrates status/run linkage only
  - review items come from `/api/v1/bulk-import/runs/{run_id}` + `/api/v1/bulk-import/runs/{run_id}/items`
  - playback/transcript content comes from dedicated retrieval endpoints
- Upload validation checks extension + MIME and rejects mismatched combinations.
- Encryption in transit/rest.
- RBAC scope equals org/company/location access.
- Retention enforcement jobs delete audio at 180d, transcript at 24 months, and keep audit events 24 months by default.
- Legacy bulk-import artifact purge and immediate finalize artifact deletion must skip `source_type=voice_interview`; retention handled only by voice retention jobs.

## Ops readiness (Sprint 1)
- Alerts: queue lag, transcription failure spike, finalize conflict spike, retention job failures.
- Owners: backend on-call owns pipeline + retention jobs; product owner owns consent copy version.
- Runbook required for: stuck processing, duplicate finalize attempts, retention deletion failures.

## Sprint 1 exit gates
- finalize error rate < 2% in UAT
- duplicate-location incident rate < 2% in UAT
- upload-to-review_ready p50 <= 10 minutes in UAT
- questionnaire suggestion apply/reject flow functional end-to-end in UAT

## KPIs
- `transcription_success_rate`
- `review_ready_rate`
- `partial_finalize_rate`
- `time_to_first_finalize_minutes`
- `location_resolution_rate`
- `questionnaire_suggestion_apply_rate`
- `manual_edit_rate`

## Out of scope (v1)
- Realtime meeting copilot.
- MP4/video ingestion.
- In-app audio recording.
- Auto-write questionnaire fields without user confirmation.
