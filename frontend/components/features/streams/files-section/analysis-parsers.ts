export type FileCategory = "lab" | "sds" | "photo" | "general";

export interface FileAnalysisContext {
	fileType: string;
	category: FileCategory;
}

export const DOC_TYPES = ["sds", "lab", "general"] as const;
export type DocumentAIAnalysisType = (typeof DOC_TYPES)[number];

export interface DocumentAIAnalysis {
	kind: "document";
	summary: string;
	keyFacts: string[];
	docType: DocumentAIAnalysisType;
}

export const IMAGE_QUALITY = ["High", "Medium", "Low"] as const;
export type ImageQualityGrade = (typeof IMAGE_QUALITY)[number];

export const LIFECYCLE_STATUS = [
	"Like-new",
	"Good",
	"Used",
	"Degraded",
	"End-of-life",
] as const;
export type ImageLifecycleStatus = (typeof LIFECYCLE_STATUS)[number];

export const IMAGE_CONFIDENCE = ["High", "Medium", "Low"] as const;
export type ImageAnalysisConfidence = (typeof IMAGE_CONFIDENCE)[number];

export const DISPOSAL_PATHWAYS = [
	"Landfill",
	"Incineration",
	"Stockpiling",
	"Open burning",
	"Unknown",
] as const;

function isOneOf<T extends readonly string[]>(
	options: T,
	value: string,
): value is T[number] {
	return options.some((item) => item === value);
}

export type ImageDisposalPathway = (typeof DISPOSAL_PATHWAYS)[number];

export interface ImageCompositionItem {
	component: string;
	proportion: string;
}

export interface ImageAIAnalysis {
	kind: "image";
	summary: string;
	materialType: string;
	qualityGrade: ImageQualityGrade;
	lifecycleStatus: ImageLifecycleStatus;
	confidence: ImageAnalysisConfidence;
	estimatedComposition: ImageCompositionItem[];
	currentDisposalPathway: ImageDisposalPathway;
	co2IfDisposed: number;
	co2IfDiverted: number;
	co2Savings: number;
	esgStatement: string;
	lcaAssumptions: string;
	ppeRequirements: string[];
	storageRequirements: string[];
	degradationRisks: string[];
	visibleHazards: string[];
}

export type FileAIAnalysis = DocumentAIAnalysis | ImageAIAnalysis;

const PREVIEW_IMAGE_CATEGORY = "photo";

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): string[] | null {
	if (!Array.isArray(value)) return null;
	const strings: string[] = [];
	for (const item of value) {
		if (typeof item !== "string") return null;
		strings.push(item);
	}
	return strings;
}

function readStringArrayOrEmpty(value: unknown): string[] {
	return readStringArray(value) ?? [];
}

function readNumberOrZero(value: unknown): number {
	return readNumber(value) ?? 0;
}

function parseDocType(value: unknown): DocumentAIAnalysisType | null {
	if (typeof value !== "string") return null;
	return isOneOf(DOC_TYPES, value) ? value : null;
}

function parseQualityGrade(value: unknown): ImageQualityGrade | null {
	if (typeof value !== "string") return null;
	return isOneOf(IMAGE_QUALITY, value) ? value : null;
}

function parseLifecycleStatus(value: unknown): ImageLifecycleStatus | null {
	if (typeof value !== "string") return null;
	return isOneOf(LIFECYCLE_STATUS, value) ? value : null;
}

function parseConfidence(value: unknown): ImageAnalysisConfidence | null {
	if (typeof value !== "string") return null;
	return isOneOf(IMAGE_CONFIDENCE, value) ? value : null;
}

function parseDisposalPathway(value: unknown): ImageDisposalPathway | null {
	if (typeof value !== "string") return null;
	return isOneOf(DISPOSAL_PATHWAYS, value) ? value : null;
}

function parseCompositionItems(value: unknown): ImageCompositionItem[] {
	if (!Array.isArray(value)) return [];
	const items: ImageCompositionItem[] = [];
	for (const item of value) {
		if (!isRecord(item)) continue;
		const component = readString(item.component);
		const proportion = readString(item.proportion);
		if (!component || !proportion) continue;
		items.push({ component, proportion });
	}
	return items;
}

export function parseDocumentAnalysis(
	analysis: Record<string, unknown>,
): DocumentAIAnalysis | null {
	const summary = readString(analysis.summary);
	const keyFacts = readStringArray(analysis.key_facts);
	const docType = parseDocType(analysis.doc_type);
	if (!summary || !keyFacts || !docType) return null;

	return {
		kind: "document",
		summary,
		keyFacts,
		docType,
	};
}

export function parseImageAnalysis(
	analysis: Record<string, unknown>,
): ImageAIAnalysis | null {
	const summary = readString(analysis.summary);
	const materialType = readString(analysis.material_type);
	const qualityGrade = parseQualityGrade(analysis.quality_grade);
	const lifecycleStatus = parseLifecycleStatus(analysis.lifecycle_status);
	const confidence = parseConfidence(analysis.confidence);

	if (
		!summary ||
		!materialType ||
		!qualityGrade ||
		!lifecycleStatus ||
		!confidence
	)
		return null;

	const currentDisposalPathway =
		parseDisposalPathway(analysis.current_disposal_pathway) ?? "Unknown";

	return {
		kind: "image",
		summary,
		materialType,
		qualityGrade,
		lifecycleStatus,
		confidence,
		estimatedComposition: parseCompositionItems(analysis.estimated_composition),
		currentDisposalPathway,
		co2IfDisposed: readNumberOrZero(analysis.co2_if_disposed),
		co2IfDiverted: readNumberOrZero(analysis.co2_if_diverted),
		co2Savings: readNumberOrZero(analysis.co2_savings),
		esgStatement: readString(analysis.esg_statement) ?? "",
		lcaAssumptions: readString(analysis.lca_assumptions) ?? "",
		ppeRequirements: readStringArrayOrEmpty(analysis.ppe_requirements),
		storageRequirements: readStringArrayOrEmpty(analysis.storage_requirements),
		degradationRisks: readStringArrayOrEmpty(analysis.degradation_risks),
		visibleHazards: readStringArrayOrEmpty(analysis.visible_hazards),
	};
}

export function parseAnalysis(
	analysis: Record<string, unknown>,
	file: FileAnalysisContext,
): FileAIAnalysis | null {
	const fileType = file.fileType.toLowerCase();
	const preferImage = file.category === PREVIEW_IMAGE_CATEGORY;
	const preferDocument =
		fileType === "pdf" ||
		file.category === "lab" ||
		file.category === "sds" ||
		file.category === "general";

	if (preferImage) {
		return parseImageAnalysis(analysis) ?? parseDocumentAnalysis(analysis);
	}

	if (preferDocument) {
		return parseDocumentAnalysis(analysis) ?? parseImageAnalysis(analysis);
	}

	if ("material_type" in analysis) return parseImageAnalysis(analysis);
	if ("key_facts" in analysis) return parseDocumentAnalysis(analysis);
	return null;
}
