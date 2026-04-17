"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PrimaryActionType } from "./mock-data";
import { DEMO_STREAM } from "./mock-data";

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
				? "Refresh brief"
				: "Complete discovery";

	return (
		<header className="animate-fade-in-up">
			<div className="flex flex-col gap-1.5">
				<p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
					Waste Streams &rsaquo; Discovery &rsaquo;{" "}
					<span className="font-bold text-foreground">{DEMO_STREAM.title}</span>
				</p>

				<div className="flex items-start justify-between gap-4">
					<div className="flex flex-col gap-1">
						<h1 className="font-display text-2xl font-semibold tracking-tight text-foreground leading-tight">
							{DEMO_STREAM.title}
						</h1>

						<div className="flex items-center gap-2 flex-wrap">
							<p className="text-sm text-muted-foreground">
								{DEMO_STREAM.company} · {DEMO_STREAM.owner}
							</p>
							{DEMO_STREAM.statusVariant === "warning" && (
								<Badge
									variant="warning-subtle"
									className="h-5 px-1.5 text-[10px] font-medium"
								>
									{DEMO_STREAM.status}
								</Badge>
							)}
						</div>
					</div>

					<div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
						<Button
							size="sm"
							className="text-xs font-semibold"
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
								<DropdownMenuItem className="text-sm">
									Refresh brief
								</DropdownMenuItem>
								<DropdownMenuItem className="text-sm">
									Add evidence
								</DropdownMenuItem>
								<DropdownMenuItem className="text-sm">
									Open review queue
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</div>
		</header>
	);
}
