"use client";

import { ArrowLeft, Building, MapPin, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { IntelligenceReportData } from "@/lib/types/intelligence-report";
import { IntelligenceInsights } from "./intelligence-insights";
import { IntelligenceSummary } from "./intelligence-summary";
import { ProposalSentDialog } from "./proposal-sent-dialog";
import { ProposalUploadPanel, type UploadState } from "./proposal-upload-panel";

function getAgeBadgeVariant(
	generatedAt: string,
): "outline" | "warning" | "destructive" {
	const days = Math.floor(
		(Date.now() - new Date(generatedAt).getTime()) / 86_400_000,
	);
	if (days >= 30) return "destructive";
	if (days >= 7) return "warning";
	return "outline";
}

interface IntelligenceReportViewProps {
	report: IntelligenceReportData;
}

export function IntelligenceReportView({
	report,
}: IntelligenceReportViewProps) {
	const router = useRouter();

	// Upload state machine
	const [uploadState, setUploadState] = useState<UploadState>("idle");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [showSentDialog, setShowSentDialog] = useState(false);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Cleanup interval on unmount
	useEffect(() => {
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, []);

	const handleFileSelect = useCallback((file: File) => {
		setSelectedFile(file);
		setUploadState("file_selected");
	}, []);

	const handleFileClear = useCallback(() => {
		setSelectedFile(null);
		setUploadState("idle");
	}, []);

	const handleUpload = useCallback(() => {
		setUploadState("uploading");
		setUploadProgress(0);

		// Simulated 2-second upload
		let progress = 0;
		timerRef.current = setInterval(() => {
			progress += 5;
			setUploadProgress(Math.min(progress, 100));
			if (progress >= 100) {
				if (timerRef.current) clearInterval(timerRef.current);
				timerRef.current = null;
				setUploadState("uploaded");
				toast.success("Proposal uploaded successfully");
			}
		}, 100);
	}, []);

	const handleMarkAsSent = useCallback(() => {
		setShowSentDialog(true);
	}, []);

	const handleConfirmSent = useCallback(() => {
		setShowSentDialog(false);
		toast.success("Proposal marked as sent");
		setUploadState("sent");
		setUploadProgress(0);
	}, []);

	const handleUploadReplacement = useCallback(() => {
		setUploadState("idle");
		setSelectedFile(null);
		setUploadProgress(0);
	}, []);

	const badgeVariant = useMemo(
		() => getAgeBadgeVariant(report.generatedAt),
		[report.generatedAt],
	);

	const badgeClassName =
		badgeVariant === "outline"
			? "shrink-0 border-success/40 bg-success/10 text-success-foreground dark:text-success self-start"
			: "shrink-0 self-start";

	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
				{/* Header */}
				<div className="space-y-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => router.push(routes.dashboard)}
						className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to Dashboard
					</Button>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="space-y-1.5">
							<h1 className="text-xl font-semibold text-foreground tracking-tight">
								{report.streamName}
							</h1>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
								<span className="inline-flex items-center gap-1.5">
									<Building className="h-3.5 w-3.5" />
									{report.companyName}
								</span>
								<span className="inline-flex items-center gap-1.5">
									<MapPin className="h-3.5 w-3.5" />
									{report.locationName}
								</span>
								<span className="inline-flex items-center gap-1.5">
									<User className="h-3.5 w-3.5" />
									{report.primaryContact}
								</span>
							</div>
						</div>
						<Badge variant={badgeVariant} className={badgeClassName}>
							Report generated {formatRelativeDate(report.generatedAt)}
						</Badge>
					</div>
				</div>

				{/* Summary */}
				<IntelligenceSummary
					shortDescription={report.summary.shortDescription}
					fullDescription={report.summary.fullDescription}
					composition={report.summary.composition}
					hazardClassifications={report.summary.hazardClassifications}
				/>

				{/* Insights + Upload panel */}
				<div className="flex flex-col lg:flex-row gap-6">
					<div className="flex-1 min-w-0">
						<IntelligenceInsights insights={report.insights} />
					</div>
					<ProposalUploadPanel
						uploadState={uploadState}
						selectedFile={selectedFile}
						uploadProgress={uploadProgress}
						onFileSelect={handleFileSelect}
						onFileClear={handleFileClear}
						onUpload={handleUpload}
						onMarkAsSent={handleMarkAsSent}
						onUploadReplacement={handleUploadReplacement}
					/>
				</div>
			</div>

			{/* Sent confirmation dialog */}
			<ProposalSentDialog
				open={showSentDialog}
				onOpenChange={setShowSentDialog}
				onConfirmSent={handleConfirmSent}
			/>
		</div>
	);
}
