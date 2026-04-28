"use client";

import {
	BarChart3,
	BookOpen,
	DownloadIcon,
	ExternalLink,
	Lightbulb,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";

type LucideIcon = ComponentType<
	SVGProps<SVGSVGElement> & { size?: number | string }
>;

export const PDF_DOC_CONFIGS = {
	generateIdeationBrief: {
		label: "Ideation Brief",
		shimmerText: "Generating ideation brief...",
		Icon: Lightbulb as LucideIcon,
	},
	generateAnalyticalRead: {
		label: "Analytical Read",
		shimmerText: "Generating analytical read...",
		Icon: BarChart3 as LucideIcon,
	},
	generatePlaybook: {
		label: "Discovery Playbook",
		shimmerText: "Generating discovery playbook...",
		Icon: BookOpen as LucideIcon,
	},
} as const;

export type PdfToolKey = keyof typeof PDF_DOC_CONFIGS;

type PdfDocCardProps = {
	Icon: LucideIcon;
	label: string;
	shimmerText: string;
	state: string;
	output?: { filename: string; download_url: string; view_url: string; size_bytes: number };
};

export function PdfDocumentCard({
	Icon,
	label,
	shimmerText,
	state,
	output,
}: PdfDocCardProps) {
	if (state === "output-error") {
		return (
			<span className="text-destructive text-xs" role="status">
				Could not generate {label.toLowerCase()}. Please retry.
			</span>
		);
	}

	if (state === "output-available" && output) {
		const { filename, download_url, view_url, size_bytes } = output;
		const viewUrl = view_url || download_url;
		const sizeLabel =
			size_bytes >= 1_048_576
				? `${(size_bytes / 1_048_576).toFixed(1)} MB`
				: `${Math.round(size_bytes / 1024)} KB`;
		return (
			<div className="not-prose w-full rounded-lg border bg-card px-3 py-3 sm:max-w-sm">
				<div className="flex items-start gap-3">
					<Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
					<div className="min-w-0 flex-1">
						<p className="text-xs font-semibold">{label}</p>
						<p className="truncate text-muted-foreground text-xs" title={filename}>
							{filename} · {sizeLabel}
						</p>
					</div>
				</div>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<a
						aria-label={`View ${filename} in a new tab`}
						className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						href={viewUrl}
						rel="noreferrer"
						target="_blank"
						title={`View ${filename}`}
					>
						<ExternalLink aria-hidden className="size-3.5" />
						View
					</a>
					<a
						aria-label={`Download ${filename}`}
						className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						download={filename}
						href={download_url}
						title={`Download ${filename}`}
					>
						<DownloadIcon aria-hidden className="size-3.5" />
						Download
					</a>
				</div>
			</div>
		);
	}

	return (
		<Shimmer as="p" className="text-xs">
			{shimmerText}
		</Shimmer>
	);
}
