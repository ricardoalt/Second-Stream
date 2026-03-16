import type { ProposalDetailData } from "@/lib/types/proposal-detail";

const MOCK_DATA: ProposalDetailData = {
	projectId: "proj-001",
	streamName: "Mixed Plastic Waste — Injection Molding Rejects",
	companyName: "Iberian Polymers S.L.",
	locationName: "Valencia — Paterna Industrial Park",
	primaryContact: "Laura Martinez",
	ownerName: "Carlos Ruiz",
	volumeSummary: "14 tonnes/month",
	frequencySummary: "Weekly collection",
	composition: [
		{ substance: "Polypropylene (PP)", percentage: 45 },
		{ substance: "HDPE", percentage: 30 },
		{ substance: "ABS", percentage: 12 },
		{ substance: "Mixed / Unknown", percentage: 8 },
		{ substance: "Contaminants (labels, adhesive)", percentage: 5 },
	],
	hazardClassifications: [
		{ code: "HP4", label: "Irritant" },
		{ code: "HP5", label: "Specific Target Organ Toxicity" },
	],
	safetyNotes:
		"No hazardous additives detected in recent FTIR analyses. Cadmium-based pigments were historically used but discontinued in 2023. Standard PPE required for handling. Store in dry, ventilated area away from ignition sources.",
	intelligenceReportSummary:
		"Iberian Polymers generates approximately 14 tonnes/month of mixed plastic rejects from their injection molding operations. Current disposal costs 180 EUR/tonne through a general waste contractor with no material recovery. Implementing a polymer-sorted recycling pathway could reduce net waste costs by 60-70%.",
	intelligenceReportGeneratedAt: "2026-03-10T14:30:00Z",
	intelligenceReportInsights: [
		{ title: "Executive Summary", iconName: "Sparkles" },
		{ title: "Regulations", iconName: "Shield" },
		{ title: "Logistics", iconName: "Truck" },
	],
	proposalFile: {
		id: "file-001",
		name: "Proposal_IberianPolymers_MixedPlastic_v2.pdf",
		sizeBytes: 2_456_000,
		uploadedAt: "2026-03-11T09:15:00Z",
		fileType: "pdf",
	},
	uploadedFiles: [
		{
			id: "file-001",
			name: "Proposal_IberianPolymers_MixedPlastic_v2.pdf",
			sizeBytes: 2_456_000,
			uploadedAt: "2026-03-11T09:15:00Z",
			fileType: "pdf",
		},
		{
			id: "file-002",
			name: "FTIR_Analysis_Report_2026.pdf",
			sizeBytes: 845_000,
			uploadedAt: "2026-03-08T14:22:00Z",
			fileType: "pdf",
		},
		{
			id: "file-003",
			name: "Waste_Stream_Photo_Samples.png",
			sizeBytes: 3_200_000,
			uploadedAt: "2026-03-07T11:05:00Z",
			fileType: "png",
		},
		{
			id: "file-004",
			name: "Compliance_Certificate_LER120105.docx",
			sizeBytes: 128_000,
			uploadedAt: "2026-03-06T16:30:00Z",
			fileType: "docx",
		},
	],
	proposalFollowUpState: "waiting_response",
	notes:
		"Laura confirmed the facility can accommodate a NIR sorter in the existing waste dock area. Need to follow up on electrical capacity — she's checking with the facilities team. Carlos mentioned they have budget approval for Q2 capex up to 50k EUR. Priority is reducing the PreZero contract cost before July renewal.",
};

export function getProposalDetail(_projectId: string): ProposalDetailData {
	return MOCK_DATA;
}
