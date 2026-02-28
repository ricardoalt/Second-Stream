# Release B Runbook - Company Contacts Cleanup

Scope: operational guardrails for Release B (`companies.contact_*` removal). No feature behavior changes.

## Required deploy order

1. Deploy app version that no longer reads/writes `companies.contact_name/contact_email/contact_phone`.
2. Drain/terminate old pods so no process still expecting legacy columns.
3. Apply migration B (`20260227_1200-drop_company_legacy_contact_columns`).

Rationale: prevent old code from querying dropped columns.

## Preflight queries (before migration B)

```sql
-- 1) Legacy->new backfill missing count (should be 0)
SELECT COUNT(*) AS missing_backfill_count
FROM companies c
WHERE (
  NULLIF(BTRIM(c.contact_name), '') IS NOT NULL
  OR NULLIF(BTRIM(c.contact_email), '') IS NOT NULL
  OR NULLIF(BTRIM(c.contact_phone), '') IS NOT NULL
)
AND NOT EXISTS (
  SELECT 1
  FROM company_contacts cc
  WHERE cc.organization_id = c.organization_id
    AND cc.company_id = c.id
);

-- 2) Duplicate primaries per (organization_id, company_id) (should be 0)
SELECT COUNT(*) AS duplicate_primary_company_pairs
FROM (
  SELECT organization_id, company_id
  FROM company_contacts
  WHERE is_primary IS TRUE
  GROUP BY organization_id, company_id
  HAVING COUNT(*) > 1
) dup;

-- 3) Invalid identity rows (should be 0)
SELECT COUNT(*) AS invalid_identity_rows
FROM company_contacts
WHERE num_nonnulls(
  NULLIF(BTRIM(name), ''),
  NULLIF(BTRIM(email), ''),
  NULLIF(BTRIM(phone), '')
) = 0;
```

## Migration

```bash
alembic upgrade head
```

## Postflight queries

```sql
-- A) Confirm legacy columns are gone (should return 0 rows)
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'companies'
  AND column_name IN ('contact_name', 'contact_email', 'contact_phone')
ORDER BY column_name;

-- B) Re-run integrity checks (all should be 0)
SELECT COUNT(*) AS duplicate_primary_company_pairs
FROM (
  SELECT organization_id, company_id
  FROM company_contacts
  WHERE is_primary IS TRUE
  GROUP BY organization_id, company_id
  HAVING COUNT(*) > 1
) dup;

SELECT COUNT(*) AS invalid_identity_rows
FROM company_contacts
WHERE num_nonnulls(
  NULLIF(BTRIM(name), ''),
  NULLIF(BTRIM(email), ''),
  NULLIF(BTRIM(phone), '')
) = 0;
```

## Rollback caveat

`alembic downgrade -1` re-adds legacy columns as nullable, but does not reconstruct historical values from `company_contacts`.
