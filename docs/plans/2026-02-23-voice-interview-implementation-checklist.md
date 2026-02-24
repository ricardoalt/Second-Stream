# Tasks: Voice Interview Intelligence (Execution Checklist)

Source docs:
- `docs/plans/voice-intake-plan.md`
- `docs/plans/2026-02-21-voice-intake-technical-spec.md`
- `docs/plans/2026-02-23-voice-interview-prd.md`

Target: implementation-ready atomic tasks for implementer handoff.

Naming note:
- DB table `import_runs`, SQLAlchemy model `ImportRun`, and prose term `bulk import run` refer to same entity.

## Locked scope (do not change in Sprint 1)

- Upload-only (no in-app recording).
- Partial finalize enabled.
- New location creation only during finalize.
- Accepted formats: `.mp3`, `.wav`, `.m4a`.
- Max upload size: 25MB.
- Upload byte limit: `MAX_UPLOAD_BYTES = 25_000_000`.
- Retry ceiling: `MAX_PROCESSING_ATTEMPTS = 3`.
- Retention defaults: audio 180d, transcript 24m, audit events 24m.
- Questionnaire suggestions apply/reject included in Sprint 1.

## Sprint 1 - Core delivery

Sprint 1 delivery modes:
- **Must-ship**: T1.1, T1.2, T1.3, T1.4, T1.5, T1.6, T1.7, T1.8 (without compare drawer), T1.9, T1.11, T1.12, T1.14.
- **Can defer to Sprint 2 if schedule pressure**: T1.10 polish only; minimum Sprint 1 metrics/alerts required by T1.14 remain in scope.

### T1.1 Add DB primitives for voice interviews
- Files:
  - `backend/alembic/versions/<new_revision>.py`
  - `backend/app/models/voice_interview.py` (new)
  - `backend/app/models/bulk_import.py`
- Change:
  - create `voice_interviews` table per spec (ids, status, consent, retention, run link).
  - include `failed_stage` persistence (`transcribing|extracting`) for retry validation.
  - include `processing_attempts` persistence for retry ceiling/backoff enforcement.
  - include `consent_copy_version` persistence for auditability.
  - add `source_type` to `import_runs` and backfill defaults for existing rows.
  - add run-scoped stable group identity primitive (`group_id`) persisted on extracted items.
  - add unique/indexes:
    - `voice_interviews.bulk_import_run_id` unique
    - `voice_interviews(status, organization_id)`
    - finalize idempotency unique key (`run_id + idempotency_key`) via dedicated table.
  - idempotency table contract:
    - `operation_type`, `run_id`, `idempotency_key`, `request_hash`, `response_json`, `response_status_code`, `created_at`
    - unique on (`operation_type`, `run_id`, `idempotency_key`)
    - `request_hash` uses canonical JSON + SHA-256 per technical spec
- Acceptance:
  - migration applies/rolls back cleanly.
  - existing bulk import behavior still works for non-voice runs.

### T1.2 Add voice interview schemas
- Files:
  - `backend/app/schemas/voice_interview.py` (new)
  - `backend/app/schemas/bulk_import.py`
- Change:
  - define request/response schemas for create/get/retry.
  - extend finalize request contract with:
    - `resolved_group_ids`
    - `idempotency_key`
    - optional `close_reason=empty_extraction` exception path.
- Acceptance:
  - request schema validates shape/types; service-level finalize validation returns `409` for unresolved groups.

### T1.3 Implement voice interview API routes
- Files:
  - `backend/app/api/v1/voice_interviews.py` (new)
  - router registration file under `backend/app/api/v1/`
- Change:
  - `POST /api/v1/voice-interviews`
  - `GET /api/v1/voice-interviews/{id}`
  - `POST /api/v1/voice-interviews/{id}/retry`
  - retry contract: only from failed state, stage-aware (`transcribing|extracting`), requires `Idempotency-Key`, idempotent replay no-op.
  - retry concurrency hardening: lock rows (`FOR UPDATE`) and on idempotency unique collision (`IntegrityError`) return replay response (no 500).
  - same retry key + different retry hash returns `409 RETRY_IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`.
  - upload compensation: if DB commit fails after S3 upload, delete uploaded object best-effort and emit cleanup-failed audit/log event if delete fails.
  - strict upload validation (extension + MIME + mismatch + 25MB).
  - persist consent metadata and retention expiries.
- Acceptance:
  - endpoint returns `uploaded`, then transitions to `queued` after enqueue.

### T1.4 Build status sync single-writer module
- Files:
  - `backend/app/services/voice_status_sync.py` (new)
  - call sites in pipeline/finalize services
- Change:
  - implement one place that maps:
    - `uploaded|queued -> import_runs.uploaded`
    - `transcribing|extracting -> import_runs.processing`
    - `review_ready|partial_finalized -> import_runs.review_ready`
    - `finalized -> import_runs.completed`
    - `failed -> import_runs.failed`
  - enforce single-writer rule for `source_type=voice_interview`.
- Acceptance:
  - no direct status writes for voice runs outside sync module.
  - single-writer enforcement explicitly includes claim/requeue/fail_exhausted and voice no_data processing path.
  - tests fail if voice run status is mutated outside sync module.

### T1.5 Implement async transcription + extraction pipeline
- Files:
  - `backend/app/services/bulk_import_ai_extractor.py`
  - `backend/app/agents/bulk_import_extraction_agent.py`
  - optional new helper: `backend/app/services/voice_transcription_service.py`
- Change:
  - add audio ingestion path: S3 audio -> transcript -> structured extraction.
  - assign stable run-scoped `group_id` for every extracted group and persist on each grouped item.
  - long-audio controls:
    - chunk tokens 4000
    - overlap 200
    - max chunks 20
    - dedupe threshold >=80% field overlap
    - emit stable error code `VOICE_TRANSCRIPT_TOO_LONG` when max chunks exceeded
  - attach evidence fields (`quote`, `start_sec`, `end_sec`, `speaker_label?`) to items.
  - diarization optional; extraction correctness cannot depend on speaker labels.
- Acceptance:
  - run reaches `review_ready` with grouped location + stream items.
  - `group_id` remains stable for the run across retries/pagination.

### T1.6 Implement partial finalize safely
- Files:
  - `backend/app/services/bulk_import_service.py`
  - `backend/app/api/v1/bulk_import.py`
- Change:
  - extend finalize flow to process explicit `resolved_group_ids` only.
  - reject unresolved groups in finalize payload with `409`.
  - idempotency replay returns same result for same key.
  - same key + different request hash returns `409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`.
  - lock run + targeted items (`FOR UPDATE`) in transaction.
  - support empty extraction close path:
    - allow empty `resolved_group_ids` only when `close_reason=empty_extraction` and extracted groups == 0.
  - persist and return replay response from idempotency table (`response_json`).
  - finalize transaction includes idempotency check/insert + domain writes + status transitions in one DB commit.
  - ensure finalize path does not delete voice source artifacts immediately.
  - state invariants:
    - before first finalize: `review_ready`
    - unresolved remain: `partial_finalized`
    - unresolved 0: `finalized` (including reject-all / empty extraction with created_count=0)
  - invalid voice finalize state returns `409`.
- Acceptance:
  - no duplicate locations/streams on double submit or concurrent finalize.

### T1.7 Add questionnaire suggestion handoff
- Files:
  - `backend/app/services/intake_service.py`
  - finalize integration points in `backend/app/services/bulk_import_service.py`
  - `frontend/lib/api/intake.ts` (if API contract extension needed)
- Change:
  - on finalize, create pending questionnaire suggestions for created waste streams.
  - no direct overwrite of `project_data.technical_sections`.
- Acceptance:
  - apply/reject works end-to-end from voice success handoff.

### T1.8 Build voice upload + review frontend (new component tree)
- Files:
  - `frontend/lib/api/voice-interviews.ts` (new)
  - `frontend/app/companies/[id]/page.tsx`
  - `frontend/app/companies/[id]/locations/[locationId]/page.tsx`
  - new folder `frontend/components/features/voice-interview/*`
- Change:
  - add CTA `Voice Interview` from company/location pages.
  - upload modal/sheet with consent + helper copy (iPhone/iPad/Android/laptop).
  - processing stage UI.
  - review workspace:
    - desktop split-panel
    - mobile tabbed single-column (`Transcript | Extracted`)
  - grouped location resolver:
    - map existing / create-on-finalize / reject
    - preselect map when confidence >=90% (user confirms)
  - sticky audio player + evidence click-to-seek.
  - duplicate warnings inline (compare drawer deferred to Sprint 2).
  - sticky finalize bar.
  - disable `Finalize resolved groups` when `groups > 0` and selected resolved groups = 0.
  - evidence fallback text `Evidence unavailable` when `start_sec/end_sec` missing or invalid.
  - launcher polling always unlocks actions after fail/timeout/error.
  - success handoff with CTA `Review suggestions now`.
  - minimal audit-detail view with playback and audit events timeline.
  - empty/error states:
    - 0 extracted -> retry or close as empty extraction
    - low confidence warning
    - empty/inaudible transcript -> retry
    - transcript too long (`VOICE_TRANSCRIPT_TOO_LONG`) -> show split-audio guidance + retry
- Acceptance:
  - flow works on desktop + mobile viewport.
  - audit-detail view loads for authorized users and denies unauthorized users.

### T1.9 Add retention + compliance enforcement
- Files:
  - retention job module(s) under `backend/app/services/` or jobs package
  - `backend/app/services/storage_delete_service.py` integration points
  - audit event integration (timeline/audit service)
- Change:
  - job 1: delete audio at `audio_retention_expires_at`.
  - job 2: delete transcript at `transcript_retention_expires_at`.
  - audit event retention default 24 months.
  - ensure legacy bulk-import purge always skips `source_type=voice_interview` artifacts.
  - patch existing finalize artifact deletion path to skip `source_type=voice_interview` runs.
- Acceptance:
  - no early deletion by finalize or legacy purge paths.

### T1.10 Observability + ops runbook
- Files:
  - logging/metrics modules in backend
  - docs runbook location (team standard docs path)
- Change:
  - emit metrics:
    - transcription_success_rate
    - review_ready_rate
    - partial_finalize_rate
    - time_to_first_finalize_minutes
    - location_resolution_rate
    - questionnaire_suggestion_apply_rate
  - alerts:
    - queue lag
    - transcription failure spikes
    - finalize conflicts
    - retention job failures
  - add runbook for stuck processing, duplicate finalize, retention failures.
- Acceptance:
  - alerting + runbook linked before release.

### T1.11 Implement transcript/audio retrieval contract
- Files:
  - `backend/app/api/v1/voice_interviews.py`
  - storage access helper/services
- Change:
  - add `GET /api/v1/voice-interviews/{id}/audio-url` (short-lived signed URL).
  - add `GET /api/v1/voice-interviews/{id}/transcript` (transcript + optional segments for evidence jumps).
  - define review data contract boundaries:
    - orchestration metadata from `GET /api/v1/voice-interviews/{id}`
    - review items from `/api/v1/bulk-import/runs/{run_id}` and `/api/v1/bulk-import/runs/{run_id}/items`
    - media/text payload from retrieval endpoints above
  - enforce org RBAC for audio/transcript retrieval.
- Acceptance:
  - unauthorized access denied; authorized playback works.

### T1.12 Backend tests
- Files:
  - `backend/tests/test_bulk_import.py`
  - `backend/tests/test_voice_interviews.py` (new)
- Cases:
  - upload validation (ext/MIME/mismatch/size)
  - upload compensation path (DB failure after S3 upload) cleanup behavior
  - status sync mapping for voice runs
  - stable `group_id` persistence and finalize targeting by group ids
  - partial finalize subset behavior
  - idempotency replay (same key)
  - concurrent finalize safety
  - empty extraction close path
  - create location only on finalize
  - retention delete behavior + legacy purge skip
  - finalize path does not delete voice artifacts immediately
  - RBAC for audio/transcript access
  - retry ceiling/backoff enforcement and `VOICE_TRANSCRIPT_TOO_LONG` mapping
  - retry idempotency replay and retry key/hash mismatch behavior

### T1.13 Frontend checks
- Files:
  - voice interview feature components/tests
  - integration points to intake suggestions
- Cases:
  - mobile/desktop review layout
  - success handoff one-click to suggestion review
  - evidence playback seek
  - empty/error state rendering
  - transcript-too-long error copy/action rendering

### T1.14 Final verification
- Commands:
  - `cd backend && make check`
  - `cd frontend && bun run check:ci`
- Sprint 1 exit gates:
  - finalize error rate <2% in UAT
  - duplicate-location incidents <2% in UAT
  - upload->review_ready p50 <=10 min in UAT
  - questionnaire apply/reject flow end-to-end verified

## Sprint 2 - quality/polish (deferred)

### T2.1 Transcript correction + re-extract
- Add transcript edit and re-extract UX/actions.

### T2.2 Confidence UX improvements
- Confidence chips, low-confidence highlighting, optional bulk actions.

### T2.3 Upload acceleration
- Faster retries, better mobile picker hints.

### T2.4 Duplicate compare drawer
- Add side-by-side existing vs extracted fields compare drawer.

## Sprint 3 - optional

### T3.1 Recording decision gate
- Only consider in-app recording if metrics thresholds are met.

### T3.2 Optional automation policy
- High-confidence auto-finalize policy under explicit controls.

## Dependency order

- T1.1 -> T1.2 -> T1.3
- T1.1 + T1.4 -> T1.5
- T1.4 + T1.5 -> T1.6
- T1.6 -> T1.7
- T1.3 + T1.5 + T1.6 + T1.7 + T1.11 -> T1.8
- T1.1 + T1.9 in parallel (ensure purge exception before release)
- T1.10 + T1.11 + T1.12 + T1.13 -> T1.14

## Merge strategy

- PR1: DB/models/schemas + source_type + status sync scaffolding
- PR2: Voice APIs + pipeline extraction + tests
- PR3: Partial finalize + idempotency/concurrency + tests
- PR4: Frontend voice workspace + success handoff + intake handoff
- PR5: Retention jobs + observability/runbook + final checks
