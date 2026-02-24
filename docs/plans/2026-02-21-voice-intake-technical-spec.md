# Voice Interview Technical Spec (v2)

**Updated**: 2026-02-23  
**Intent**: implement upload pipeline and reuse existing bulk-import APIs/finalize semantics; voice review UI is a new frontend workspace.

## 1) Architecture decision

- **Canonical review/finalize**: existing `bulk_import` run/item workflow.
- **New thin source object**: `voice_interviews` for audio/transcript artifacts, consent, retention, processing status.
- **Why**: avoid parallel review engine, keep one approval surface, preserve auditability.

## 2) Locked product rules

- Partial finalize allowed: resolved groups only.
- Create new location only during finalize.
- Supported input extensions (v1): `.mp3`, `.wav`, `.m4a` only.
- `.mp4` files are not accepted in v1 (audio or video).
- In-app recording is out of scope for current implementation (upload-only).
- Default retention:
  - audio: 180 days
  - transcript: 24 months
  - audit events: 24 months (org extension policy can be added later).
- Max upload size v1: 25MB.
- Upload byte limit (normative): `MAX_UPLOAD_BYTES = 25_000_000`.
- Retry ceiling (normative): `MAX_PROCESSING_ATTEMPTS = 3`.
- Status vocabulary (normative): `uploaded|queued|transcribing|extracting|review_ready|partial_finalized|finalized|failed`.

## 3) Data model changes

### 3.1 New table: `voice_interviews`

Columns (minimum):
- `id` UUID PK
- `organization_id` UUID FK
- `company_id` UUID FK
- `location_id` UUID nullable FK (entry context only)
- `bulk_import_run_id` UUID FK NOT NULL (created atomically with `voice_interview`)
- `audio_object_key` TEXT (S3 object key)
- `transcript_object_key` TEXT nullable
- `status` ENUM(`uploaded`,`queued`,`transcribing`,`extracting`,`review_ready`,`partial_finalized`,`finalized`,`failed`)
- `error_code` TEXT nullable
- `failed_stage` TEXT nullable (`transcribing` | `extracting`)
- `processing_attempts` INT not null default 0
- `consent_at` timestamptz not null
- `consent_by_user_id` UUID not null
- `consent_copy_version` TEXT not null
- `audio_retention_expires_at` timestamptz not null
- `transcript_retention_expires_at` timestamptz not null
- `created_by_user_id` UUID not null
- `created_at`/`updated_at` timestamptz

Indexes:
- `(organization_id, created_at desc)`
- `(bulk_import_run_id)` unique
- `(status, organization_id)`

### 3.2 Existing `bulk_import_run` updates

- Naming note: DB table `import_runs`, SQLAlchemy model `ImportRun`, and prose term `bulk import run` refer to the same entity.
- Add/confirm `source_type` supports `voice_interview`.
- Add optional metrics fields:
  - `audio_duration_seconds` int nullable
  - `speaker_count` int nullable
  - `transcription_model` text nullable.

### 3.3 Existing import item artifacts

- Persist provenance/evidence per extracted item:
  - `group_id` (stable run-scoped group identity used by partial finalize)
  - `quote`
  - `start_sec`
  - `end_sec`
  - `speaker_label` (nullable)
  - `item_confidence`
  - `location_confidence`.

## 4) API surface

### 4.1 `POST /api/v1/voice-interviews`

Creates interview + linked bulk import run and stores uploaded audio.

Failure/compensation contract:
- If S3 upload fails: return error, do not persist run/interview.
- If DB commit fails after upload: delete uploaded object best-effort, rollback DB, return error.
- If cleanup delete fails: emit audit/log event `voice_upload_cleanup_failed` with object key.

Input (multipart/form-data):
- `audio_file` required
- `company_id` required
- `location_id` optional
- `consent_given` required boolean (`true` only)

Validation:
- allowlist extensions + MIME for mp3/wav/m4a
- max size: 25MB (`MAX_UPLOAD_BYTES = 25_000_000`, single shared constant for API + UI copy + tests)
- reject video containers and any extension/MIME mismatch; accept only mp3/wav/m4a audio

Response:
- `voice_interview_id`
- `bulk_import_run_id`
- initial status (`uploaded`; transitions to `queued` once async job is enqueued).

### 4.2 `GET /api/v1/voice-interviews/{id}`

Returns minimal status payload: processing status, linked run id, retention metadata.

### 4.3 `POST /api/v1/voice-interviews/{id}/retry`

Retry failed stage with idempotency guard.
- Allowed only from failed terminal state.
- Retry must reference persisted `failed_stage` (`transcribing` or `extracting`) and increment attempt count.
- Retry requires `Idempotency-Key` header.
- Replaying same retry key must be no-op and return current run status.
- Retry idempotency hash canonicalization:
  - hash input canonical JSON `{voice_interview_id, failed_stage}`
  - stable UTF-8 serialization with sorted keys
  - digest algorithm: SHA-256 (hex)
- Retry key reuse with different retry hash returns `409 RETRY_IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`.
- `processing_attempts` enforces retry ceiling (`MAX_PROCESSING_ATTEMPTS`) with backoff policy.
- Retry idempotency persistence uses same idempotency store with `operation_type=retry`.
- Concurrent/double-submit retry hardening: row lock (`FOR UPDATE`) + unique-constraint (`IntegrityError`) replay fallback; replay response stays stable and no race leaks `500`.

### 4.4 Existing review/finalize APIs

- Reuse bulk import review + finalize endpoints.
- For `import_runs.source_type=voice_interview`, extend finalize endpoint behavior to support partial finalize semantics:
  - finalize resolved groups/items
  - keep unresolved in pending state.
- Finalize operation must be idempotent (idempotency key + transaction guard).
- Concurrent finalize attempts must serialize safely (no duplicate location/stream creation).
- Voice finalize from invalid state returns `409` (`run.status != review_ready` or `voice.status` not in `review_ready|partial_finalized`).

Finalize request contract (normative):
- Input must include `idempotency_key` and `resolved_group_ids`.
- `resolved_group_ids` must be non-empty for normal partial/full finalize.
- Exception: allow empty `resolved_group_ids` only when `close_reason = empty_extraction` and run has zero extracted groups.
- `resolved_group_ids` must match run-scoped stable `group_id` values persisted on extracted items.
- If any requested group is unresolved, return `409` with group ids.
- Replaying same `idempotency_key` for same run returns previously persisted finalize result.
- Finalize transaction locks run row and targeted items (`FOR UPDATE`) before create operations.
- Replay persistence contract:
  - persist canonical finalize response JSON for (`run_id`, `idempotency_key`)
  - persist canonical HTTP status code for (`run_id`, `idempotency_key`)
  - replay returns exact persisted response body and status code
  - reject key reuse with different request hash for same run (`409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`)
- Request hash canonicalization:
  - hash input is canonical JSON of `{resolved_group_ids_sorted, close_reason, run_id}`
  - stable UTF-8 serialization with sorted keys
  - digest algorithm: SHA-256 (hex)
- Atomicity requirement:
  - idempotency row check/insert, domain writes, and status transitions must commit in one DB transaction
  - any failure rolls back all finalize-side effects.

### 4.5 Status synchronization

- `voice_interviews.status` is source of truth for voice-specific processing state.
- For `import_runs.source_type = voice_interview`, `import_runs.status` is derived-only and written only by sync logic.
- Non-voice import runs keep existing direct status writes.
- Single-writer enforcement applies to worker lifecycle paths too: claim, stale requeue, fail_exhausted, processing success/failure, no-data voice path.
- Sync rules:
  - `voice_interviews.uploaded|queued` -> `import_runs.status = uploaded`
  - `voice_interviews.transcribing|extracting` -> `import_runs.status = processing`
  - `voice_interviews.review_ready|partial_finalized` -> `import_runs.status = review_ready`
  - `voice_interviews.finalized` -> `import_runs.status = completed`
  - `voice_interviews.failed` -> `import_runs.status = failed`

### 4.6 Retrieval/playback API (v1)

- `GET /api/v1/voice-interviews/{id}/audio-url`
  - returns short-lived signed URL for playback
  - org RBAC enforced before URL generation
- `GET /api/v1/voice-interviews/{id}/transcript`
  - returns transcript text + optional segment metadata for evidence jumps
  - org RBAC enforced
  - storage miss/null transcript bytes return controlled `404`/`409` contract (never unhandled `500` decode path)

### 4.7 Review data contract (v1)

- `GET /api/v1/voice-interviews/{id}` provides orchestration metadata only:
  - status, linked `bulk_import_run_id`, retention fields, error code/stage
- `GET /api/v1/bulk-import/runs/{run_id}` provides run counters/status for review/finalize shell.
- `GET /api/v1/bulk-import/runs/{run_id}/items` provides grouped review items (including `group_id`, evidence, confidence).
- Playback and transcript bodies come from retrieval endpoints in `4.6`.

## 5) Processing pipeline

1. Upload audio object to S3 (`voice-interviews/{org}/{id}/audio.<ext>`).
2. Create `voice_interview` + linked `bulk_import_run` (`source_type=voice_interview`).
3. Queue async job.
4. Transcription stage (OpenAI STT):
   - model default: `gpt-4o-transcribe`
   - optional diarization variant when enabled.
   - diarization is non-blocking metadata only; extraction correctness cannot depend on it.
5. Extraction stage:
   - structured extraction for locations + waste streams + questionnaire hints
   - strict output schema, unknown stays empty
   - include evidence/timestamps.
6. Long-audio strategy:
   - chunk transcript by token windows (`CHUNK_TOKENS=4000`, `CHUNK_OVERLAP_TOKENS=200`)
   - run extraction per chunk
   - consolidate entities with dedupe threshold (`FIELD_OVERLAP >= 80%`)
   - max chunks per interview (`MAX_CHUNKS=20`), else return actionable size/length error
7. Optional high-noise strategy (only if metrics require):
   - pre-filter relevant interview spans
   - then strict extraction over filtered spans.
8. Convert to bulk import location groups/items.
9. Mark run/interview `review_ready`.

Reliability rules:
- idempotency key: `voice_interview.id`
- bounded retries + exponential backoff
- terminal `failed` with machine-safe `error_code`
- no hanging processing states.
- chunk overflow fails with stable code `VOICE_TRANSCRIPT_TOO_LONG` when `MAX_CHUNKS` exceeded.

## 5.1 Implementation prerequisites vs current codebase

- Add `source_type` to `import_runs` with migration and defaults for existing runs.
- Extend `BulkImportService.finalize_run` for partial finalize semantics.
- Add persistent idempotency store for finalize attempts (`run_id + idempotency_key` unique) or equivalent unique mechanism.
- Add guardrails/tests to enforce single-writer status sync for voice runs.
- Keep `import_runs` status constraint unchanged unless migration explicitly approved.

## 6) Review + partial finalize behavior

- Grouping: by extracted location reference + reviewer confirmation.
- Required group action:
  - map existing location
  - mark create-on-finalize
  - reject.
- Group is **resolved** only when location action is set and no child item remains `pending_review`.
- Stream editing always allowed before finalize.
- Duplicate handling v1: warning + explicit confirm-create-new.
- FE finalize guardrail: disable finalize action when `groups > 0` and no resolved-group selection.
- FE empty extraction guardrail: allow finalize with `close_reason=empty_extraction` only when `groups == 0`.
- FE evidence fallback: show `Evidence unavailable` when timestamp pair (`start_sec`,`end_sec`) is missing/invalid; never show broken play action.
- FE launcher guardrail: polling unlocks actions after fail/timeout/error (`pollingId` cleared in all exits).
- Finalize action:
  - creates mapped streams now
  - creates queued new locations now (during finalize only)
  - unresolved groups remain pending.

State rule (normative):
- Before first finalize action: `voice_interviews.review_ready`.
- After finalize action, if unresolved groups remain: `voice_interviews.partial_finalized`.
- After finalize action, if unresolved groups = 0: `voice_interviews.finalized` (including reject-all with `created_count = 0`).

## 7) Questionnaire handoff

- On finalize, created waste streams receive extracted questionnaire values as **pending suggestions**.
- Never overwrite `project_data.technical_sections` directly from model output.
- User applies/rejects suggestions in existing intake suggestion workflow.

## 8) Security, retention, compliance

- Encrypt in transit and at rest.
- Consent required before upload.
- RBAC follows org/company/location/project access.
- Retention enforcement jobs:
  - audio deletion at `audio_retention_expires_at` (default 180 days)
  - transcript deletion at `transcript_retention_expires_at` (default 24 months)
  - audit event retention default 24 months
- Existing bulk-import artifact purge must skip `source_type=voice_interview` runs.
- Existing immediate finalize artifact deletion path must also skip `source_type=voice_interview` runs.
- Audit events required:
  - uploaded
  - consent_captured
  - transcribe_started/succeeded/failed
  - extraction_succeeded/failed
  - mapping_edited
  - partial_finalized/finalized.

## 9) Frontend implementation

- Entry points:
  - company page
  - location page.
- Voice review is a **new component tree** (not extension of existing `import-review-section.tsx`). Shares API logic/hooks with bulk import but has its own UI.
- v1 flow:
  - upload + consent modal (responsive: `Dialog` on desktop, `Drawer/Sheet` on mobile)
  - inline upload helper copy by device context (iPhone/iPad/Android/laptop)
  - clear validation errors with exact fix guidance (unsupported type/size)
  - resilient upload states (`preparing/uploading/queued`) with retry action
  - processing state inline card with stage stepper
  - review workspace:
    - **desktop (≥1024px)**: split-panel — transcript left, grouped extraction cards right
    - **mobile (<1024px)**: tabbed layout (`Transcript | Extracted`) single-column
  - sticky audio player (single `<audio>` element) at bottom of transcript panel with seek-to-timestamp
  - location resolver pre-selects `map existing` when `location_confidence >= 0.9`
  - evidence playback action from each extracted item (`play from start_sec`)
  - duplicate warnings inline (compare drawer deferred to Sprint 2)
  - sticky finalize bar at bottom
  - success handoff screen after finalize with direct CTA `Review suggestions now`
  - post-finalize questionnaire suggestion queue.
- Empty/error states (must be defined):
  - **0 items extracted**: message + retry extraction or close interview as finalized with `created_count = 0`.
  - **All items confidence < 50%**: warning banner, user can still proceed.
  - **Transcript empty/inaudible**: error state + retry.
  - **Transcript exceeds chunk budget**: show `VOICE_TRANSCRIPT_TOO_LONG` with action guidance (split shorter audio and retry).
- next iterations (still upload-only):
  - transcript correction + re-extract
  - faster retry UX and better mobile file-picker hints.

## 10) Acceptance tests (must pass)

1. Upload valid mp3/wav/m4a -> run reaches `review_ready`.
2. Interview with multiple locations produces >1 location group.
3. Partial finalize creates only resolved groups.
4. New location selected in review is created only at finalize time.
5. Questionnaire hints land as pending suggestions, not hard writes.
6. Unauthorized user cannot access audio/transcript.
7. Retention job deletes expired audio and logs audit event.
8. Retention job deletes transcript at `transcript_retention_expires_at` and logs audit event.
9. After finalize, user reaches questionnaire suggestion review in one click from success state.
10. Reviewer can play evidence audio for extracted item from stored timestamp range.
11. Upload error messages are actionable and mention supported formats + max size.
12. User can retry failed upload without restarting the interview flow.
13. Duplicate finalize submissions do not create duplicate locations/streams.
14. Review/finalize status transitions follow normative state rules.
15. For `source_type=voice_interview`, `import_runs.status` changes only via status sync logic.
16. Reject-all completion path ends with `voice_interviews.finalized` and `import_runs.completed` with `created_count = 0`.
17. Review workspace renders correctly on mobile viewport (single-column tabbed layout).
18. Questionnaire suggestion apply/reject flow works end-to-end from success handoff CTA.
19. Empty extraction close path (`close_reason=empty_extraction`) finalizes safely with `created_count = 0`.
20. DB failure after S3 upload triggers best-effort artifact cleanup and emits `voice_upload_cleanup_failed` when cleanup fails.
21. Audio/transcript retrieval endpoints enforce org RBAC and support review playback flow.
22. Retry endpoint rejects attempts beyond `MAX_PROCESSING_ATTEMPTS` with stable error code.
23. Retry endpoint enforces `Idempotency-Key` replay and returns `409 RETRY_IDEMPOTENCY_KEY_PAYLOAD_MISMATCH` on key/hash mismatch.
