"use client";

import {
	Download,
	ExternalLink,
	Loader2,
	Sparkles,
	Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFileSize, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
	DocumentAIAnalysis,
	EnhancedProjectFile,
	ImageAIAnalysis,
} from "./types";
import { CATEGORY_CONFIG } from "./types";

interface FilePreviewMetadataProps {
	file: EnhancedProjectFile;
	onDownload: () => void;
	onView: () => void;
	onDelete: () => void;
	disabled?: boolean;
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
	return (
		<section className="space-y-2">
			{title && <h4 className="text-sm font-medium">{title}</h4>}
			{children}
		</section>
	);
}

function AnalysisSummary({ summary }: { summary: string }) {
	return (
		<div className="glass-liquid-subtle rounded-xl p-4 space-y-2">
			<div className="flex items-center gap-2 text-sm font-medium text-primary">
				<Sparkles className="h-4 w-4" />
				<span>AI Summary</span>
			</div>
			<p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
		</div>
	);
}

function KeyFactsList({ facts }: { facts: string[] }) {
	if (facts.length === 0) return null;
	const seen = new Map<string, number>();
	const items = facts.map((fact) => {
		const count = seen.get(fact) ?? 0;
		seen.set(fact, count + 1);
		const key = count === 0 ? fact : `${fact}-${count}`;
		return { key, fact };
	});

	return (
		<ul className="space-y-1">
			{items.map((item) => (
				<li key={item.key} className="flex items-start gap-2 text-xs">
					<span className="mt-1.5 h-1 w-1 rounded-full bg-primary/40 shrink-0" />
					<span className="text-muted-foreground">{item.fact}</span>
				</li>
			))}
		</ul>
	);
}

function formatTco2(value: number): string {
	if (!Number.isFinite(value)) return "—";
	return value.toFixed(1);
}

function TruncatedList({ items }: { items: string[] }) {
	if (items.length === 0)
		return <p className="text-sm text-muted-foreground">—</p>;

	const visible = items.slice(0, 3);
	const remaining = items.length - visible.length;

	return (
		<div className="space-y-1">
			<ul className="list-disc pl-4 space-y-1">
				{visible.map((item) => (
					<li key={item} className="text-sm text-muted-foreground">
						{item}
					</li>
				))}
			</ul>
			{remaining > 0 && (
				<p className="text-xs text-muted-foreground">+{remaining} more</p>
			)}
		</div>
	);
}

function DocumentAnalysisSection({
	analysis,
}: {
	analysis: DocumentAIAnalysis;
}) {
	return (
		<div className="space-y-4">
			<AnalysisSummary summary={analysis.summary} />
			<div className="flex items-center gap-2">
				<Badge variant="outline" className="text-xs">
					{analysis.docType.toUpperCase()} Document
				</Badge>
			</div>
			{analysis.keyFacts.length > 0 && (
				<Section title="Key facts">
					<KeyFactsList facts={analysis.keyFacts} />
				</Section>
			)}
		</div>
	);
}

function ImageAnalysisSection({ analysis }: { analysis: ImageAIAnalysis }) {
	const hasComposition = analysis.estimatedComposition.length > 0;
	const hasCo2 =
		analysis.co2Savings > 0 ||
		analysis.co2IfDisposed > 0 ||
		analysis.co2IfDiverted > 0;
	const hasSafety =
		analysis.ppeRequirements.length > 0 ||
		analysis.storageRequirements.length > 0 ||
		analysis.degradationRisks.length > 0 ||
		analysis.visibleHazards.length > 0;

	return (
		<div className="space-y-4">
			<AnalysisSummary summary={analysis.summary} />
			<div className="flex flex-wrap gap-2">
				<Badge variant="secondary" className="text-xs">
					{analysis.materialType}
				</Badge>
				<Badge variant="outline" className="text-xs">
					{analysis.qualityGrade}
				</Badge>
				<Badge variant="outline" className="text-xs">
					{analysis.confidence} confidence
				</Badge>
				<Badge variant="outline" className="text-xs">
					{analysis.lifecycleStatus}
				</Badge>
			</div>
			{hasComposition && (
				<Section title="Composition">
					<ul className="space-y-1">
						{analysis.estimatedComposition.map((item) => (
							<li key={`${item.component}-${item.proportion}`}>
								<span className="text-sm text-foreground">
									{item.component}
								</span>
								<span className="text-sm text-muted-foreground">
									({item.proportion})
								</span>
							</li>
						))}
					</ul>
				</Section>
			)}

			{hasCo2 && (
				<Section title="CO2 impact">
					<div className="rounded-lg border bg-muted/20 p-3">
						<p className="text-xs font-medium text-muted-foreground">
							Current disposal pathway
						</p>
						<p className="text-sm text-foreground">
							{analysis.currentDisposalPathway}
						</p>
					</div>
					<div className="grid gap-2 sm:grid-cols-2">
						<div className="rounded-lg border bg-muted/20 p-3">
							<p className="text-xs font-medium text-muted-foreground">
								CO2 if disposed
							</p>
							<p className="text-sm text-foreground">
								{formatTco2(analysis.co2IfDisposed)} tCO2e/year
							</p>
						</div>
						<div className="rounded-lg border bg-muted/20 p-3">
							<p className="text-xs font-medium text-muted-foreground">
								CO2 if diverted
							</p>
							<p className="text-sm text-foreground">
								{formatTco2(analysis.co2IfDiverted)} tCO2e/year
							</p>
						</div>
					</div>
					{analysis.co2Savings > 0 && (
						<div className="rounded-lg border bg-success/10 p-3">
							<p className="text-xs font-medium text-success">
								Estimated savings
							</p>
							<p className="text-sm text-success">
								~{formatTco2(analysis.co2Savings)} tCO2e/year
							</p>
						</div>
					)}
					{analysis.esgStatement && (
						<div className="space-y-1">
							<p className="text-xs font-medium text-muted-foreground">
								ESG statement
							</p>
							<p className="text-sm text-muted-foreground whitespace-pre-wrap">
								{analysis.esgStatement}
							</p>
						</div>
					)}
					{analysis.lcaAssumptions && (
						<div className="space-y-1">
							<p className="text-xs font-medium text-muted-foreground">
								LCA assumptions
							</p>
							<p className="text-sm text-muted-foreground whitespace-pre-wrap">
								{analysis.lcaAssumptions}
							</p>
						</div>
					)}
				</Section>
			)}

			{hasSafety && (
				<Section title="Safety + handling">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1">
							<p className="text-xs font-medium text-muted-foreground">
								PPE requirements
							</p>
							<TruncatedList items={analysis.ppeRequirements} />
						</div>
						<div className="space-y-1">
							<p className="text-xs font-medium text-muted-foreground">
								Storage requirements
							</p>
							<TruncatedList items={analysis.storageRequirements} />
						</div>
						<div className="space-y-1">
							<p className="text-xs font-medium text-muted-foreground">
								Degradation risks
							</p>
							<TruncatedList items={analysis.degradationRisks} />
						</div>
						<div className="space-y-1">
							<p className="text-xs font-medium text-muted-foreground">
								Visible hazards
							</p>
							<TruncatedList items={analysis.visibleHazards} />
						</div>
					</div>
				</Section>
			)}
		</div>
	);
}

export function FilePreviewMetadata({
	file,
	onDownload,
	onView,
	onDelete,
	disabled = false,
}: FilePreviewMetadataProps) {
	const categoryConfig = CATEGORY_CONFIG[file.category];
	const analysis = file.aiAnalysis;
	const hasAI = Boolean(analysis);

	return (
		<div className="h-full flex flex-col">
			<div className="space-y-3 pb-4 border-b">
				<h2 className="text-lg font-semibold break-all leading-tight">
					{file.filename}
				</h2>
				<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
					<Badge
						variant="secondary"
						className={cn(
							"px-2 py-1 text-xs uppercase font-medium",
							categoryConfig.bgColor,
							categoryConfig.textColor,
						)}
					>
						{categoryConfig.label}
					</Badge>
					<span>{formatFileSize(file.fileSize)}</span>
					<span className="opacity-50">·</span>
					<span>{formatRelativeDate(file.uploadedAt)}</span>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto py-4 space-y-4">
				{file.processingStatus === "processing" && (
					<div
						className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border"
						aria-live="polite"
					>
						<Loader2 className="h-5 w-5 animate-spin text-primary" />
						<div className="space-y-0.5">
							<span className="text-sm font-medium">Processing file...</span>
							<p className="text-xs text-muted-foreground">
								AI analysis in progress
							</p>
						</div>
					</div>
				)}

				{file.processingStatus === "completed" && !hasAI && (
					<div className="text-center py-6 text-muted-foreground">
						<p className="text-sm">No AI analysis available for this file.</p>
					</div>
				)}

				{hasAI && analysis?.kind === "document" && (
					<DocumentAnalysisSection analysis={analysis} />
				)}

				{hasAI && analysis?.kind === "image" && (
					<ImageAnalysisSection analysis={analysis} />
				)}
			</div>

			<div className="pt-4 border-t flex flex-wrap gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={onDownload}
					className="flex-1 min-w-[100px] gap-2"
				>
					<Download className="h-4 w-4" />
					Download
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={onView}
					className="flex-1 min-w-[100px] gap-2"
				>
					<ExternalLink className="h-4 w-4" />
					View
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={onDelete}
					disabled={disabled}
					className="flex-1 min-w-[100px] gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
				>
					<Trash2 className="h-4 w-4" />
					Delete
				</Button>
			</div>
		</div>
	);
}
