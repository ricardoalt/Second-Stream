/**
 * System Component Library — Transition Layer
 *
 * ⚠️  DEPRECATED: This barrel re-exports from `@/components/patterns` where possible.
 * Components unique to system/ (PageTemplate, PageSection, KpiGrid, KpiCard from page-template)
 * remain here until the admin dashboard is fully migrated.
 *
 * For NEW code, always import from `@/components/patterns`.
 */

// Re-exports from patterns (canonical source)
export { PageHeader } from "@/components/patterns/layout/page-header";
export { StatusChip } from "@/components/patterns/feedback/status-chip";

// System-only components (pending migration to patterns)
export {
	PageTemplate,
	PageSection,
	KpiGrid,
	KpiCard,
	ActionCard,
} from "./page-template";
