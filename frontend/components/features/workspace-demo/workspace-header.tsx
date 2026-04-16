"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PrimaryActionType } from "./mock-data";
import { DEMO_STREAM } from "./mock-data";

// ── WorkspaceHeader ───────────────────────────────────────────────────────────
// Compact platform header — matches agent shell conventions.
// Uses breadcrumb-style context label + h1 + Badge variant (real primitives).
// Adaptive primary action: "Review N items" > "Complete Discovery"

interface WorkspaceHeaderProps {
	primaryAction: PrimaryActionType;
	reviewCount: number;
}

export function WorkspaceHeader({
	primaryAction,
	reviewCount,
}: WorkspaceHeaderProps) {
	const primaryLabel =
		primaryAction === "review"
			? `Review ${reviewCount} item${reviewCount !== 1 ? "s" : ""}`
			: primaryAction === "refresh"
				? "Refresh Brief"
				: "Complete Discovery";

	return (
		<header className="animate-fade-in-up">
			<div className="flex flex-col gap-1.5">
				{/* Breadcrumb context — matches platform convention */}
				<p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
					Waste Streams &rsaquo; Discovery &rsaquo;{" "}
					<span className="font-bold text-foreground">{DEMO_STREAM.title}</span>
				</p>

				{/* Title row */}
				<div className="flex items-start justify-between gap-4">
					<div className="flex flex-col gap-0.5">
						<h1 className="font-display text-[1.65rem] font-bold tracking-tight text-foreground leading-tight">
							{DEMO_STREAM.title}
						</h1>

						{/* Meta row */}
						<div className="flex items-center gap-2.5 flex-wrap">
							<p className="text-sm text-muted-foreground">
								Discovery workspace
							</p>
							<Badge
								variant="outline"
								className="h-5 px-1.5 text-[10px] font-medium border-border/50"
							>
								{DEMO_STREAM.company}
							</Badge>
							<Badge
								variant={
									DEMO_STREAM.statusVariant === "warning"
										? "warning-subtle"
										: "success-subtle"
								}
								className="h-5 px-1.5 text-[10px] font-medium"
							>
								{DEMO_STREAM.status}
							</Badge>
							<span
								className={cn("font-mono text-[10px] text-muted-foreground/50")}
							>
								Brief {DEMO_STREAM.briefVersion} · {DEMO_STREAM.briefTime}
							</span>
						</div>
					</div>

					{/* Right: adaptive primary CTA + overflow menu */}
					<div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
						<Button
							size="sm"
							className={cn(
								"text-[12px] font-semibold",
								primaryAction === "review" &&
									"bg-warning/[0.12] text-warning border border-warning/25 hover:bg-warning/[0.2] shadow-none",
							)}
							variant={primaryAction === "review" ? "outline" : "default"}
						>
							{primaryLabel}
						</Button>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									aria-label="More actions"
									className="h-8 w-8 p-0 border-border/60"
								>
									<svg
										width="13"
										height="13"
										viewBox="0 0 16 16"
										fill="currentColor"
										className="text-muted-foreground"
									>
										<title>More</title>
										<circle cx="3" cy="8" r="1.5" />
										<circle cx="8" cy="8" r="1.5" />
										<circle cx="13" cy="8" r="1.5" />
									</svg>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-44">
								{primaryAction !== "refresh" && (
									<DropdownMenuItem className="text-[12px]">
										Refresh Brief
									</DropdownMenuItem>
								)}
								{primaryAction !== "complete" && (
									<DropdownMenuItem className="text-[12px]">
										Complete Discovery
									</DropdownMenuItem>
								)}
								<DropdownMenuItem className="text-[12px]">
									Add Evidence
								</DropdownMenuItem>
								<DropdownMenuItem className="text-[12px] text-muted-foreground">
									Share stream
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</div>
		</header>
	);
}
