"use client";

import { ArrowLeft, Building, MapPin, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import type { ProposalFollowUpState } from "@/lib/types/dashboard";
import { PROPOSAL_FOLLOW_UP_LABELS } from "@/lib/types/dashboard";
import type { ProposalDetailData } from "@/lib/types/proposal-detail";
import { IntelligenceReportCard } from "./intelligence-report-card";
import { NotesCard } from "./notes-card";
import { ProposalFileCard } from "./proposal-file-card";
import { StatusCard } from "./status-card";
import { StreamDetailCard } from "./stream-detail-card";
import { UploadedFilesCard } from "./uploaded-files-card";

interface ProposalDetailViewProps {
	data: ProposalDetailData;
}

export function ProposalDetailView({ data }: ProposalDetailViewProps) {
	const router = useRouter();
	const [followUpState, setFollowUpState] = useState<ProposalFollowUpState>(
		data.proposalFollowUpState,
	);
	const [notes, setNotes] = useState(data.notes);

	const handleStateChange = useCallback((next: ProposalFollowUpState) => {
		setFollowUpState(next);
		toast.success(`Status updated to ${PROPOSAL_FOLLOW_UP_LABELS[next]}`);
	}, []);

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
								{data.streamName}
							</h1>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
								<span className="inline-flex items-center gap-1.5">
									<Building className="h-3.5 w-3.5" />
									{data.companyName}
								</span>
								<span className="inline-flex items-center gap-1.5">
									<MapPin className="h-3.5 w-3.5" />
									{data.locationName}
								</span>
								<span className="inline-flex items-center gap-1.5">
									<User className="h-3.5 w-3.5" />
									{data.primaryContact}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Two-column layout */}
				<div className="flex flex-col lg:flex-row gap-6">
					{/* Left column — content */}
					<div className="flex-1 min-w-0 space-y-6">
						<StreamDetailCard
							volumeSummary={data.volumeSummary}
							frequencySummary={data.frequencySummary}
							composition={data.composition}
							hazardClassifications={data.hazardClassifications}
							safetyNotes={data.safetyNotes}
						/>
						<IntelligenceReportCard
							projectId={data.projectId}
							summary={data.intelligenceReportSummary}
							generatedAt={data.intelligenceReportGeneratedAt}
							insights={data.intelligenceReportInsights}
						/>
						<NotesCard value={notes} onChange={setNotes} />
					</div>

					{/* Right column — actions (sticky) */}
					<div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-[5.75rem] space-y-6 self-start">
						<StatusCard
							state={followUpState}
							onStateChange={handleStateChange}
						/>
						<ProposalFileCard file={data.proposalFile} />
						<UploadedFilesCard files={data.uploadedFiles} />
					</div>
				</div>
			</div>
		</div>
	);
}
