"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type FieldAgentPageShellProps = {
	title: string;
	description: string;
	icon: LucideIcon;
	emptyTitle: string;
	emptyDescription: string;
};

export function FieldAgentPageShell({
	title,
	description,
	icon,
	emptyTitle,
	emptyDescription,
}: FieldAgentPageShellProps) {
	return (
		<div className="flex flex-col gap-6">
			<section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex items-center justify-between gap-4">
					<div className="flex flex-col gap-1">
						<h1 className="font-display text-2xl font-semibold text-foreground">
							{title}
						</h1>
						<p className="text-sm text-muted-foreground">{description}</p>
					</div>
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-3">
				<Skeleton className="h-24 rounded-xl bg-surface-container-highest" />
				<Skeleton className="h-24 rounded-xl bg-surface-container-highest" />
				<Skeleton className="h-24 rounded-xl bg-surface-container-highest" />
			</section>

			<EmptyState
				icon={icon}
				title={emptyTitle}
				description={emptyDescription}
				action={{
					label: "Continue in Sprint 1B",
					onClick: () => undefined,
					variant: "secondary",
				}}
				className="border-0 bg-surface-container-lowest shadow-sm"
			/>

			<section className="rounded-xl bg-surface-container-low p-4 text-sm text-muted-foreground">
				<div className="flex items-center gap-2 font-medium text-foreground">
					<ArrowRight className="text-primary" />
					Upcoming in next sprint
				</div>
				<p className="mt-2">
					This page is intentionally scaffolded with loading and empty states to
					unblock navigation and route migration.
				</p>
			</section>
		</div>
	);
}

export function FieldAgentLoadingShell() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<Skeleton className="h-24 rounded-xl bg-surface-container-highest" />
			<div className="grid gap-4 md:grid-cols-3">
				<Skeleton className="h-24 rounded-xl bg-surface-container-highest" />
				<Skeleton className="h-24 rounded-xl bg-surface-container-highest" />
				<Skeleton className="h-24 rounded-xl bg-surface-container-highest" />
			</div>
			<Skeleton className="h-64 rounded-xl bg-surface-container-highest" />
		</div>
	);
}
