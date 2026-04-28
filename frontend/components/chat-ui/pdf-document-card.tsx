"use client";

import {
	BarChart3,
	BookOpen,
	DownloadIcon,
	ExternalLink,
	Lightbulb,
	Loader2Icon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useCallback, useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { downloadChatAttachment } from "@/lib/api/chat";

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
	output?: {
		attachment_id?: string;
		filename: string;
		download_url: string | null;
		view_url: string | null;
		size_bytes: number;
	};
};

function triggerDownload(url: string, filename: string): void {
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.rel = "noreferrer";
	document.body.append(link);
	link.click();
	link.remove();
}

export function PdfDocumentCard({
	Icon,
	label,
	shimmerText,
	state,
	output,
}: PdfDocCardProps) {
	const [activeAction, setActiveAction] = useState<"view" | "download" | null>(
		null,
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleView = useCallback(async () => {
		if (!output) return;
		setActiveAction("view");
		setErrorMessage(null);
		const pendingWindow = output.attachment_id
			? window.open("", "_blank")
			: null;
		try {
			if (output.attachment_id) {
				const blob = await downloadChatAttachment(output.attachment_id);
				const url = URL.createObjectURL(blob);
				if (pendingWindow) {
					pendingWindow.location.href = url;
					pendingWindow.opener = null;
				} else {
					const openedWindow = window.open(
						url,
						"_blank",
						"noopener,noreferrer",
					);
					if (!openedWindow) {
						triggerDownload(url, output.filename);
					}
				}
				setTimeout(() => URL.revokeObjectURL(url), 60_000);
				return;
			}

			const fallbackUrl = output.view_url || output.download_url;
			if (fallbackUrl) {
				window.open(fallbackUrl, "_blank", "noopener,noreferrer");
			}
		} catch {
			if (pendingWindow && !pendingWindow.closed) {
				pendingWindow.close();
			}
			setErrorMessage("We couldn't open this file. Please try again.");
		} finally {
			setActiveAction(null);
		}
	}, [output]);

	const handleDownload = useCallback(async () => {
		if (!output) return;
		setActiveAction("download");
		setErrorMessage(null);
		try {
			if (output.attachment_id) {
				const blob = await downloadChatAttachment(output.attachment_id);
				const url = URL.createObjectURL(blob);
				triggerDownload(url, output.filename);
				setTimeout(() => URL.revokeObjectURL(url), 0);
				return;
			}

			const fallbackUrl = output.download_url || output.view_url;
			if (fallbackUrl) {
				triggerDownload(fallbackUrl, output.filename);
			}
		} catch {
			setErrorMessage("We couldn't download this file. Please try again.");
		} finally {
			setActiveAction(null);
		}
	}, [output]);

	if (state === "output-error") {
		return (
			<output className="text-destructive text-xs">
				Could not generate {label.toLowerCase()}. Please retry.
			</output>
		);
	}

	if (state === "output-available" && output) {
		const { filename, size_bytes } = output;
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
						<p
							className="truncate text-muted-foreground text-xs"
							title={filename}
						>
							{filename} · {sizeLabel}
						</p>
					</div>
				</div>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<button
						type="button"
						aria-label={`View ${filename} in a new tab`}
						className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
						onClick={() => {
							void handleView();
						}}
						disabled={activeAction !== null}
						title={`View ${filename}`}
					>
						{activeAction === "view" ? (
							<Loader2Icon aria-hidden className="size-3.5 animate-spin" />
						) : (
							<ExternalLink aria-hidden className="size-3.5" />
						)}
						View
					</button>
					<button
						type="button"
						aria-label={`Download ${filename}`}
						className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
						onClick={() => {
							void handleDownload();
						}}
						disabled={activeAction !== null}
						title={`Download ${filename}`}
					>
						{activeAction === "download" ? (
							<Loader2Icon aria-hidden className="size-3.5 animate-spin" />
						) : (
							<DownloadIcon aria-hidden className="size-3.5" />
						)}
						Download
					</button>
				</div>
				{errorMessage ? (
					<p className="mt-2 text-destructive text-xs" role="alert">
						{errorMessage}
					</p>
				) : null}
			</div>
		);
	}

	return (
		<Shimmer as="p" className="text-xs">
			{shimmerText}
		</Shimmer>
	);
}
