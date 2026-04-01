/**
 * Editorial Design System - Componentes de Sistema
 *
 * Este módulo exporta componentes de dominio que implementan el Design System Editorial.
 * Todos los componentes usan tokens semánticos de CSS, nunca colores hardcodeados.
 *
 * @example
 * ```tsx
 * import { EditorialCard, StatusChip, GradientButton } from "@/components/system";
 *
 * <EditorialCard variant="glass" glow>
 *   <StatusChip status="go">GO Decision</StatusChip>
 *   <GradientButton>Primary Action</GradientButton>
 * </EditorialCard>
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
// Componentes de tarjeta editorial
export {
	EditorialCard,
	EditorialCardContent,
	EditorialCardDescription,
	EditorialCardFooter,
	EditorialCardHeader,
	EditorialCardTitle,
} from "./editorial-card";
// Botones
export { GradientButton, gradientButtonVariants } from "./gradient-button";
export type { StatusChipGroupProps } from "./status-chip";
// Componentes de estado
export { StatusChip, StatusChipGroup } from "./status-chip";
