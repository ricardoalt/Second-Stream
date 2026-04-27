"use client";

import {
	BarChart3,
	BookOpen,
	DownloadIcon,
	FileText,
	Lightbulb,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";

type LucideIcon = ComponentType<
	SVGProps<SVGSVGElement> & { size?: number | string }
>;

export const PDF_DOC_CONFIGS = {
	generateDiscoveryReport: {
		label: "Executive Discovery Report",
		shimmerText: "Generating discovery report...",
		Icon: FileText as LucideIcon,
	},
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
	output?: { filename: string; download_url: string; size_bytes: number };
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
			<span className="text-destructive text-xs">
				Failed to generate {label.toLowerCase()}
			</span>
		);
	}

	if (state === "output-available" && output) {
		const { filename, download_url, size_bytes } = output;
		const sizeLabel =
			size_bytes >= 1_048_576
				? `${(size_bytes / 1_048_576).toFixed(1)} MB`
				: `${Math.round(size_bytes / 1024)} KB`;
		return (
			<a
				href={download_url}
				download={filename}
				className="group not-prose inline-flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:max-w-sm"
			>
				<Icon className="size-5 shrink-0 text-primary" />
				<div className="min-w-0 flex-1">
					<p className="truncate text-xs font-medium">{label}</p>
					<p className="truncate text-muted-foreground text-xs">
						{filename} · {sizeLabel}
					</p>
				</div>
				<DownloadIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
			</a>
		);
	}

	return (
		<Shimmer as="p" className="text-xs">
			{shimmerText}
		</Shimmer>
	);
}
