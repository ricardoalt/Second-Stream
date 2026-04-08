import type {
	FileCategory as AnalysisFileCategory,
	FileAIAnalysis,
} from "./analysis-parsers";

export type FileCategory = AnalysisFileCategory;

export type FileProcessingStatus =
	| "pending"
	| "processing"
	| "completed"
	| "failed";

export type FileViewMode = "grid" | "list";

export type FileSortBy = "date" | "name";

export type {
	DocumentAIAnalysis,
	DocumentAIAnalysisType,
	FileAIAnalysis,
	ImageAIAnalysis,
	ImageAnalysisConfidence,
	ImageCompositionItem,
	ImageDisposalPathway,
	ImageLifecycleStatus,
	ImageQualityGrade,
} from "./analysis-parsers";

export {
	DISPOSAL_PATHWAYS,
	DOC_TYPES,
	IMAGE_CONFIDENCE,
	IMAGE_QUALITY,
	LIFECYCLE_STATUS,
} from "./analysis-parsers";

export interface EnhancedProjectFile {
	id: string;
	filename: string;
	fileSize: number;
	fileType: string;
	category: FileCategory;
	uploadedAt: string;
	hasProcessedText: boolean;
	hasAIAnalysis: boolean;
	processingStatus: FileProcessingStatus;
	processingProgress?: number;
	aiAnalysis?: FileAIAnalysis | null;
	thumbnailUrl?: string | null;
}

export interface CategoryConfig {
	label: string;
	color: string;
	bgColor: string;
	textColor: string;
	dotColor: string;
}

export const CATEGORY_CONFIG: Record<FileCategory, CategoryConfig> = {
	lab: {
		label: "Lab",
		color: "file-lab",
		bgColor: "bg-file-lab/10",
		textColor: "text-file-lab",
		dotColor: "bg-file-lab",
	},
	sds: {
		label: "SDS",
		color: "file-sds",
		bgColor: "bg-file-sds/10",
		textColor: "text-file-sds",
		dotColor: "bg-file-sds",
	},
	photo: {
		label: "Photo",
		color: "file-photo",
		bgColor: "bg-file-photo/10",
		textColor: "text-file-photo",
		dotColor: "bg-file-photo",
	},
	general: {
		label: "General",
		color: "file-general",
		bgColor: "bg-file-general/10",
		textColor: "text-file-general",
		dotColor: "bg-file-general",
	},
};

export function getFileCategory(
	fileType: string,
	category?: string,
): FileCategory {
	if (category) {
		const categoryValue = category.toLowerCase();
		if (
			categoryValue === "lab" ||
			categoryValue === "laboratory" ||
			categoryValue === "analysis"
		)
			return "lab";
		if (
			categoryValue === "sds" ||
			categoryValue === "safety" ||
			categoryValue === "regulatory"
		)
			return "sds";
		if (
			categoryValue === "photo" ||
			categoryValue === "image" ||
			categoryValue === "photos"
		)
			return "photo";
	}

	const type = fileType.toLowerCase();
	if (type.includes("image") || type.includes("png") || type.includes("jpg")) {
		return "photo";
	}

	return "general";
}

export function parseProcessingStatus(status: string): FileProcessingStatus {
	const statusValue = status.toLowerCase();
	if (statusValue === "processing") return "processing";
	if (statusValue === "completed" || statusValue === "complete") {
		return "completed";
	}
	if (statusValue === "failed" || statusValue === "error") return "failed";
	return "pending";
}

export const VIEW_MODE_STORAGE_KEY = "stream-files-section-view-mode";
