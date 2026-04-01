import { memo } from "react";
import { StatusChip } from "@/components/system/status-chip";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Design System: Industrial Precision & Fluidity
// KPI Card Variants - Built on shadcn Card with Editorial Design System

type KpiType =
	| "streams"
	| "missing"
	| "offers"
	| "revenue"
	| "alert"
	| "success";

interface KpiCardProps {
	type: KpiType;
	label: string;
	value: string | number;
	loading?: boolean;
	className?: string;
}

/**
 * KPI Card - Industrial Precision Design System
 *
 * Built on top of shadcn Card component with Design System Editorial tokens.
 * NUNCA usa colores Tailwind hardcodeados (cyan-100, emerald-100, etc.)
 *
 * @example
 * <KpiCard type="streams" label="Total Streams" value={128} />
 * <KpiCard type="missing" label="Missing Information" value={14} />
 */
export const KpiCard = memo(function KpiCard({
	type,
	label,
	value,
	loading = false,
	className,
}: KpiCardProps) {
	const displayValue = loading ? "—" : value;

	// Icon SVGs
	const icons = {
		streams: (
			<svg
				// size-* en lugar de h-* w-*
				className="size-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				strokeWidth={2}
				role="img"
				aria-label="Streams icon"
			>
				<title>Streams</title>
				<path d="M2 12h20M2 12c0-5 4-9 9-9s9 4 9 9M2 12c0 5 4 9 9 9s9-4 9-9" />
				<path d="M12 2v20" />
			</svg>
		),
		missing: (
			<svg
				className="size-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				strokeWidth={2}
				role="img"
				aria-label="Alert icon"
			>
				<title>Missing Information</title>
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
		),
		offers: (
			<svg
				className="size-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				strokeWidth={2}
				role="img"
				aria-label="Offers icon"
			>
				<title>Offers</title>
				<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
				<polyline points="14 2 14 8 20 8" />
				<line x1="16" y1="13" x2="8" y2="13" />
				<line x1="16" y1="17" x2="8" y2="17" />
				<line x1="10" y1="9" x2="8" y2="9" />
			</svg>
		),
		revenue: (
			<svg
				className="size-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				strokeWidth={2}
				role="img"
				aria-label="Revenue icon"
			>
				<title>Revenue</title>
				<line x1="12" y1="1" x2="12" y2="23" />
				<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
			</svg>
		),
		alert: (
			<svg
				className="size-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				strokeWidth={2}
				role="img"
				aria-label="Alert icon"
			>
				<title>Alert</title>
				<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
				<line x1="12" y1="9" x2="12" y2="13" />
				<line x1="12" y1="17" x2="12.01" y2="17" />
			</svg>
		),
		success: (
			<svg
				className="size-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				strokeWidth={2}
				role="img"
				aria-label="Success icon"
			>
				<title>Success</title>
				<line x1="12" y1="1" x2="12" y2="23" />
				<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
			</svg>
		),
	};

	/**
	 * Design System Editorial - Tokens semánticos
	 *
	 * Antes: Colores Tailwind hardcodeados (cyan-100, emerald-100, red-100, etc.)
	 * Después: Tokens semánticos con variantes de fondo sutil
	 *
	 * streams: info (cyan → primary/info)
	 * missing: destructive (red → destructive)
	 * offers: secondary (slate → secondary/muted)
	 * revenue: success (emerald → success)
	 * alert: destructive (red → destructive)
	 * success: success (emerald → success)
	 */
	const styles: Record<
		KpiType,
		{
			iconBg: string;
			iconColor: string;
			badgeStatus: React.ComponentProps<typeof StatusChip>["status"];
			badgeText?: string;
			alert?: boolean;
		}
	> = {
		streams: {
			// Info: Primary para métricas de flujo
			iconBg: "bg-primary/10",
			iconColor: "text-primary",
			badgeStatus: "success",
			badgeText: "+12 MoM",
		},
		missing: {
			// Destructive: Alertas críticas
			iconBg: "bg-destructive/10",
			iconColor: "text-destructive",
			badgeStatus: "error",
			alert: true,
		},
		offers: {
			// Secondary: Estados neutrales
			iconBg: "bg-secondary",
			iconColor: "text-secondary-foreground",
			badgeStatus: "info",
			badgeText: "PIPELINE",
		},
		revenue: {
			// Success: Métricas positivas
			iconBg: "bg-success/10",
			iconColor: "text-success",
			badgeStatus: "success",
		},
		alert: {
			// Destructive: Alertas
			iconBg: "bg-destructive/10",
			iconColor: "text-destructive",
			badgeStatus: "warning",
			alert: true,
		},
		success: {
			// Success: Estados positivos
			iconBg: "bg-success/10",
			iconColor: "text-success",
			badgeStatus: "success",
			badgeText: "On Track",
		},
	};

	const style = styles[type];

	return (
		<Card
			className={cn(
				"border shadow-sm transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5",
				className,
			)}
		>
			<CardContent className="p-5">
				{/* gap en lugar de space-x/items-start */}
				<div className="flex items-start justify-between gap-3">
					<div
						className={cn(
							// size-* en lugar de h-* w-*
							"flex size-10 items-center justify-center rounded-lg",
							style.iconBg,
							style.iconColor,
						)}
					>
						{icons[type]}
					</div>

					{style.alert ? (
						// Alert icon usando token destructivo
						<svg
							className="size-5 text-destructive"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
							role="img"
							aria-label="Warning"
						>
							<title>Warning</title>
							<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
							<line x1="12" y1="9" x2="12" y2="13" />
							<line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
					) : style.badgeText ? (
						// Usar StatusChip en lugar de badge custom
						<StatusChip
							status={style.badgeStatus}
							variant="subtle"
							size="xs"
							shape="pill"
						>
							{style.badgeText}
						</StatusChip>
					) : null}
				</div>

				{/* gap en lugar de space-y */}
				<div className="mt-4 flex flex-col gap-1">
					<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
						{label}
					</p>
					<p className="text-3xl font-bold tracking-tight text-foreground">
						{displayValue}
					</p>
				</div>
			</CardContent>
		</Card>
	);
});
