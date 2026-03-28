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
		color: "blue",
		bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
		textColor: "text-blue-600 dark:text-blue-400",
		dotColor: "bg-blue-500",
	},
	sds: {
		label: "SDS",
		color: "amber",
		bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
		textColor: "text-amber-600 dark:text-amber-400",
		dotColor: "bg-amber-500",
	},
	photo: {
		label: "Photo",
		color: "violet",
		bgColor: "bg-violet-500/10 dark:bg-violet-500/20",
		textColor: "text-violet-600 dark:text-violet-400",
		dotColor: "bg-violet-500",
	},
	general: {
		label: "General",
		color: "slate",
		bgColor: "bg-slate-500/10 dark:bg-slate-500/20",
		textColor: "text-slate-500 dark:text-slate-400",
		dotColor: "bg-slate-400",
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
