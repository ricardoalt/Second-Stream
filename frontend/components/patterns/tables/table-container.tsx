import { cn } from "@/lib/utils";

interface TableContainerProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * Standard table wrapper. Provides consistent rounding, border, and
 * background across all list pages. Use this instead of inlining the
 * same four Tailwind classes on every page.
 */
export function TableContainer({ children, className }: TableContainerProps) {
	return (
		<div
			className={cn(
				"overflow-hidden rounded-xl border border-border/60 bg-surface-container-lowest",
				className,
			)}
		>
			{children}
		</div>
	);
}
