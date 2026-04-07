// ── Data Display ──

// ── Animations ──
export {
	FadeIn,
	HoverLift,
	Pressable,
	StaggerContainer,
	StaggerItem,
} from "./animations/motion-components";
export { ActionCard } from "./data-display/action-card";
export { AnimatedNumber } from "./data-display/animated-number";
export { KpiCard } from "./data-display/kpi-card";
export { StatRail } from "./data-display/stat-rail";

// ── Dialogs ──
export { ConfirmArchiveDialog } from "./dialogs/confirm-archive-dialog";
export { ConfirmDialog } from "./dialogs/confirm-dialog";
export { ConfirmPurgeDialog } from "./dialogs/confirm-purge-dialog";
export { ConfirmRestoreDialog } from "./dialogs/confirm-restore-dialog";
export {
	ConfirmModal,
	getModalWidthClass,
	Modal,
	ModalFooter,
	MODAL_WIDTH_CLASSES,
} from "./dialogs/modal";
export type { ModalSize, ModalSizeInput } from "./dialogs/modal";

// ── Feedback ──
export {
	EmptyState,
	ErrorEmptyState,
	SearchEmptyState,
	TableEmptyState,
} from "./feedback/empty-state";
export type { LoadingButtonProps } from "./feedback/loading-button";
export { LoadingButton } from "./feedback/loading-button";
export type { StatusChipGroupProps } from "./feedback/status-chip";
export { StatusChip, StatusChipGroup } from "./feedback/status-chip";
export type { FilterConfig, FilterOption } from "./inputs/filter-bar";
export { FilterBar } from "./inputs/filter-bar";
// ── Inputs ──
export { SearchBar } from "./inputs/search-bar";

// ── Layout ──
export { PageHeader } from "./layout/page-header";
export { PageSection, PageShell } from "./layout/page-shell";
export { SectionHeader } from "./layout/section-header";

// ── Navigation ──
export { TablePagination } from "./navigation/table-pagination";

// ── Tables ──
export { DataTable } from "./tables/data-table";
