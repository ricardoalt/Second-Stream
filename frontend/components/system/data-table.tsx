"use client";

import * as React from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * EditorialDataTable - Tabla sin líneas divisorias (No-Line Rule)
 *
 * Implementa el principio "No-Line Rule" del Design System Editorial:
 * - Sin bordes entre filas para separar contenido
 * - Usa hover:bg y alternating backgrounds para jerarquía visual
 * - Background color shifts en lugar de líneas estructurales
 *
 * @example
 * <EditorialDataTable>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Column</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     {rows.map(row => (
 *       <EditorialTableRow key={row.id}>
 *         <TableCell>{row.data}</TableCell>
 *       </EditorialTableRow>
 *     ))}
 *   </TableBody>
 * </EditorialDataTable>
 */

interface EditorialDataTableProps
	extends React.HTMLAttributes<HTMLTableElement> {
	children: React.ReactNode;
	/**
	 * Alternar colores de fondo en filas
	 * @default true
	 */
	alternatingRows?: boolean;
	/**
	 * Mostrar sutil separador en el header
	 * @default true
	 */
	headerSeparator?: boolean;
	/**
	 * Habilitar efecto hover en filas
	 * @default true
	 */
	hoverEffect?: boolean;
}

const EditorialDataTable = React.forwardRef<
	HTMLTableElement,
	EditorialDataTableProps
>(
	(
		{
			children,
			className,
			alternatingRows = true,
			headerSeparator = true,
			hoverEffect = true,
			...props
		},
		ref,
	) => {
		return (
			<div className="relative w-full overflow-auto">
				<Table
					ref={ref}
					className={cn(
						// Sin bordes por defecto entre celdas
						"border-collapse",
						className,
					)}
					data-alternating-rows={alternatingRows}
					data-header-separator={headerSeparator}
					data-hover-effect={hoverEffect}
					{...props}
				>
					{children}
				</Table>
			</div>
		);
	},
);
EditorialDataTable.displayName = "EditorialDataTable";

/**
 * EditorialTableHeader - Header de tabla con separador sutil opcional
 *
 * No-Line Rule: El separador del header es sutil (border-border/40) y solo
 * se aplica al header, no entre filas de datos.
 */
interface EditorialTableHeaderProps
	extends React.HTMLAttributes<HTMLTableSectionElement> {
	children: React.ReactNode;
}

const EditorialTableHeader = React.forwardRef<
	HTMLTableSectionElement,
	EditorialTableHeaderProps
>(({ className, children, ...props }, ref) => (
	<TableHeader
		ref={ref}
		className={cn(
			"[&_tr]:border-b",
			// Separador sutil del header - No-Line Rule permite esto
			"[&_tr]:border-border/40",
			"[&_tr]:hover:bg-transparent",
			className,
		)}
		{...props}
	>
		{children}
	</TableHeader>
));
EditorialTableHeader.displayName = "EditorialTableHeader";

/**
 * EditorialTableRow - Fila de tabla con hover effect y alternating background
 *
 * No-Line Rule: Sin border-b entre filas. La separación visual viene de:
 * - Alternating backgrounds (bg-card vs bg-muted/20)
 * - Hover effect con transición suave
 */
interface EditorialTableRowProps
	extends React.HTMLAttributes<HTMLTableRowElement> {
	children: React.ReactNode;
	/**
	 * Forzar estado de hover (útil para filas seleccionadas)
	 */
	isSelected?: boolean;
	/**
	 * Fila con atención especial (ej: alerta, error)
	 */
	isHighlighted?: boolean;
}

const EditorialTableRow = React.forwardRef<
	HTMLTableRowElement,
	EditorialTableRowProps
>(({ className, children, isSelected, isHighlighted, ...props }, ref) => (
	<TableRow
		ref={ref}
		className={cn(
			// No-Line Rule: Sin border-b entre filas
			// La separación viene de spacing y background
			"border-0 transition-colors duration-200",

			// Alternating rows se maneja via CSS :nth-child
			// Pero permitimos overrides:
			isSelected && "bg-primary/5",
			isHighlighted && "bg-warning/10",

			// Hover effect suave
			"hover:bg-muted/30",

			// Focus visible para accesibilidad
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",

			className,
		)}
		{...props}
	>
		{children}
	</TableRow>
));
EditorialTableRow.displayName = "EditorialTableRow";

/**
 * EditorialTableCell - Celda con padding consistente
 *
 * Espaciado amplio (px-6 py-4) para respiración editorial
 */
interface EditorialTableCellProps
	extends React.TdHTMLAttributes<HTMLTableCellElement> {
	children: React.ReactNode;
	/**
	 * Alinear contenido
	 * @default "left"
	 */
	align?: "left" | "center" | "right";
}

const EditorialTableCell = React.forwardRef<
	HTMLTableCellElement,
	EditorialTableCellProps
>(({ className, children, align = "left", ...props }, ref) => (
	<TableCell
		ref={ref}
		className={cn(
			// Padding amplio para respiración editorial
			"px-6 py-4",
			// Sin border en celdas (No-Line Rule)
			"border-0",
			// Alineación
			align === "center" && "text-center",
			align === "right" && "text-right",
			className,
		)}
		{...props}
	>
		{children}
	</TableCell>
));
EditorialTableCell.displayName = "EditorialTableCell";

/**
 * EditorialTableHead - Header de columna con estilo editorial
 *
 * Texto pequeño, mayúsculas, tracking amplio - estilo "industrial manifest"
 */
interface EditorialTableHeadProps
	extends React.ThHTMLAttributes<HTMLTableCellElement> {
	children: React.ReactNode;
}

const EditorialTableHead = React.forwardRef<
	HTMLTableCellElement,
	EditorialTableHeadProps
>(({ className, children, ...props }, ref) => (
	<TableHead
		ref={ref}
		className={cn(
			// Padding consistente con celdas
			"px-6 py-4",
			// Sin border (el separador viene del TableHeader)
			"border-0",
			// Estilo "industrial manifest" - Design.md
			"text-[11px] font-semibold uppercase tracking-[0.12em]",
			"text-muted-foreground/70",
			className,
		)}
		{...props}
	>
		{children}
	</TableHead>
));
EditorialTableHead.displayName = "EditorialTableHead";

/**
 * CSS para alternating rows sin usar clases condicionales
 *
 * Esto mantiene el código limpio y consistente con el Design System
 */
const EditorialTableStyles = () => (
	<style jsx global>{`
		[data-alternating-rows="true"] tbody tr:nth-child(even) {
			background-color: hsl(var(--muted) / 0.2);
		}
	`}</style>
);

export {
	EditorialDataTable,
	EditorialTableHeader,
	EditorialTableRow,
	EditorialTableCell,
	EditorialTableHead,
	EditorialTableStyles,
};
