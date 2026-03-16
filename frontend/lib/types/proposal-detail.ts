import type { ProposalFollowUpState } from "./dashboard";
import type {
	CompositionEntry,
	HazardClassification,
} from "./intelligence-report";

export interface UploadedFile {
	id: string;
	name: string;
	sizeBytes: number;
	uploadedAt: string;
	/** e.g. "pdf", "docx", "xlsx", "png" */
	fileType: string;
}

export interface InsightPreview {
	title: string;
	iconName: string;
}

export interface ProposalDetailData {
	projectId: string;
	streamName: string;
	companyName: string;
	locationName: string;
	primaryContact: string;
	ownerName: string;
	volumeSummary: string;
	frequencySummary: string;
	composition: CompositionEntry[];
	hazardClassifications: HazardClassification[];
	safetyNotes: string;
	intelligenceReportSummary: string;
	intelligenceReportGeneratedAt: string;
	intelligenceReportInsights: InsightPreview[];
	proposalFile: UploadedFile | null;
	uploadedFiles: UploadedFile[];
	proposalFollowUpState: ProposalFollowUpState;
	notes: string;
}
