/**
 * Editorial Design System - Componentes de Sistema
 *
 * Componentes que implementan el Design System Editorial.
 * Todos usan tokens semánticos de CSS, nunca colores hardcodeados.
 *
 * @example
 * ```tsx
 * import { PageTemplate, PageHeader, PageSection, KpiGrid, KpiCard, StatusChip } from "@/components/system";
 * ```
 */

// Tablas
export {
	EditorialDataTable,
	EditorialTableCell,
	EditorialTableHead,
	EditorialTableHeader,
	EditorialTableRow,
	EditorialTableStyles,
} from "./data-table";
// Page Templates
export {
	ActionCard,
	KpiCard,
	KpiGrid,
	PageHeader,
	PageSection,
	PageTemplate,
} from "./page-template";
export type { StatusChipGroupProps } from "./status-chip";
// Componentes de estado
export { StatusChip, StatusChipGroup } from "./status-chip";
