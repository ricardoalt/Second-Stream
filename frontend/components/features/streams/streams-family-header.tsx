import type { ReactNode } from "react";

type StreamsFamilyHeaderProps = {
	title: string;
	subtitle: string;
	actions: ReactNode;
	breadcrumb?: string;
};

export function StreamsFamilyHeader({
	title,
	subtitle,
	actions,
	breadcrumb,
}: StreamsFamilyHeaderProps) {
	return (
		<section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
			<div className="flex flex-col gap-1">
				{breadcrumb ? (
					<p className="text-xs font-medium uppercase tracking-[0.05em] text-primary">
						{breadcrumb}
					</p>
				) : null}
				<h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
					{title}
				</h1>
				<p className="text-sm text-muted-foreground">{subtitle}</p>
			</div>
			<div className="flex flex-wrap gap-2">{actions}</div>
		</section>
	);
}
