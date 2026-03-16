export interface CompositionEntry {
	substance: string;
	percentage: number;
}

export interface HazardClassification {
	code: string;
	label: string;
}

export interface IntelligenceInsight {
	id: string;
	title: string;
	iconName: string;
	content: string;
}

export interface IntelligenceReportData {
	streamName: string;
	primaryContact: string;
	companyName: string;
	locationName: string;
	ownerName: string;
	summary: {
		shortDescription: string;
		fullDescription: string;
		composition: CompositionEntry[];
		hazardClassifications: HazardClassification[];
	};
	insights: IntelligenceInsight[];
	generatedAt: string;
}
