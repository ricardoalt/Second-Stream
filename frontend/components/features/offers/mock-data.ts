import type { OfferRecord, OfferStage } from "./types";

export const OFFER_STAGE_LABELS: Record<OfferStage, string> = {
	requires_data: "Offer started",
	proposal_ready: "Ready to send",
	offer_sent: "Offer sent",
	in_negotiation: "In negotiation",
	accepted: "Accepted",
	declined: "Declined",
	expired: "Expired",
};

export const stageOrder: OfferStage[] = [
	"requires_data",
	"proposal_ready",
	"offer_sent",
	"in_negotiation",
	"accepted",
	"declined",
];

export const offers: OfferRecord[] = [
	{
		projectId: "project-442",
		id: "ofr-442",
		reference: "OFR-442-B",
		clientName: "BASF Mid-Atlantic Division",
		streamName: "Petrochemical Stream #442",
		location: "Houston, TX",
		stage: "in_negotiation",
		valueUsd: 142500,
		createdAt: "May 11, 2026",
		updatedAt: "May 14, 2026",
		owner: "Alex Fischer",
		executiveSummary:
			"This offer converts spent toluene into high-grade feedstock, reducing disposal overhead by 22% while securing predictable regional supply for BASF.",
		strategicInsights:
			"Regional toluene shortages are increasing close likelihood. A follow-up call within 24 hours should focus on logistics reliability and ESG reporting package availability.",
		complianceNotes: [
			"RCRA profile validated against stream manifest SS-HOU-21.",
			"Transport lane approved for UN1294 handling with certified carrier.",
			"Offer includes quarterly certificate-of-analysis requirement.",
		],
		pricing: {
			unitLabel: "USD / gallon",
			unitPriceUsd: 2.4,
			monthlyVolume: "5,000 gal/month",
			netAnnualValueUsd: 142500,
			paymentTerms: "Net 30, electronic transfer",
			expiresOn: "May 31, 2026",
		},
		linkedStreams: [
			{
				id: "str-442",
				name: "Spent Toluene",
				status: "Phase 4 complete",
				location: "Houston Refinery",
			},
		],
		timeline: [
			{
				id: "t1",
				title: "Offer sent to client procurement portal",
				description:
					"Offer package OFR-442-B uploaded with ESG and compliance appendices.",
				timestamp: "May 12, 09:42 AM",
				type: "agent",
			},
			{
				id: "t2",
				title: "Admin compliance approval",
				description:
					"Grade A-4 classification and transport documentation verified.",
				timestamp: "May 11, 02:30 PM",
				type: "system",
			},
			{
				id: "t3",
				title: "Client requested commercial follow-up",
				description:
					"BASF asked for monthly reliability projections and backup lane options.",
				timestamp: "May 14, 08:15 AM",
				type: "client",
			},
		],
	},
	{
		projectId: "project-518",
		id: "ofr-518",
		reference: "OFR-518-A",
		clientName: "Solvay Group",
		streamName: "Propylene Recovery",
		location: "Lake Charles, LA",
		stage: "offer_sent",
		valueUsd: 890200,
		createdAt: "May 03, 2026",
		updatedAt: "May 13, 2026",
		owner: "Alex Fischer",
		executiveSummary:
			"The offer secures long-term propylene recovery pricing with margin protection through indexed quarterly adjustments.",
		strategicInsights:
			"This is the highest-value deal in the current pipeline. Stakeholder map indicates procurement + operations sign-off required before final acceptance.",
		complianceNotes: [
			"State hazardous transport permits valid through Q4 2026.",
			"Secondary containment spec included in Annex C.",
		],
		pricing: {
			unitLabel: "USD / ton",
			unitPriceUsd: 430,
			monthlyVolume: "170 tons/month",
			netAnnualValueUsd: 890200,
			paymentTerms: "Net 45, milestone billing",
			expiresOn: "June 05, 2026",
		},
		linkedStreams: [
			{
				id: "str-518",
				name: "Recovered Propylene Fraction",
				status: "Phase 4 complete",
				location: "Lake Charles Unit 2",
			},
		],
		timeline: [
			{
				id: "t4",
				title: "Offer submitted",
				description: "Commercial offer sent with indexed pricing terms.",
				timestamp: "May 03, 04:20 PM",
				type: "agent",
			},
		],
	},
	{
		projectId: "project-620",
		id: "ofr-620",
		reference: "OFR-620-C",
		clientName: "Indorama Ventures",
		streamName: "Mixed Alcohol Stream",
		location: "Freeport, TX",
		stage: "requires_data",
		valueUsd: 45000,
		createdAt: "May 13, 2026",
		updatedAt: "May 14, 2026",
		owner: "Mia Vega",
		executiveSummary:
			"Draft offer prepared pending final density data and transport mode lock.",
		strategicInsights:
			"Win probability rises if we include flexible pickup schedule to fit plant turnaround windows.",
		complianceNotes: [
			"Awaiting updated SDS revision from client quality team.",
		],
		pricing: {
			unitLabel: "USD / gallon",
			unitPriceUsd: 1.35,
			monthlyVolume: "2,400 gal/month",
			netAnnualValueUsd: 45000,
			paymentTerms: "Net 30",
			expiresOn: "June 10, 2026",
		},
		linkedStreams: [
			{
				id: "str-620",
				name: "Mixed Alcohol Byproduct",
				status: "Phase 3 complete",
				location: "Freeport Processing Line",
			},
		],
		timeline: [
			{
				id: "t5",
				title: "Draft created",
				description: "Base pricing model generated from AI recommendation.",
				timestamp: "May 13, 11:05 AM",
				type: "system",
			},
		],
	},
	{
		projectId: "project-735",
		id: "ofr-735",
		reference: "OFR-735-A",
		clientName: "Nexa Manufacturing",
		streamName: "Heavy Metal Sludge",
		location: "Corpus Christi, TX",
		stage: "declined",
		valueUsd: 112800,
		createdAt: "Apr 08, 2026",
		updatedAt: "Apr 29, 2026",
		owner: "Alex Fischer",
		executiveSummary:
			"Offer was rejected due to internal budget freeze despite technical acceptance.",
		strategicInsights:
			"Re-approach in Q4 with phased ramp option and lower first-quarter commitment.",
		complianceNotes: [
			"All disposal alternatives and chain-of-custody attachments provided.",
		],
		pricing: {
			unitLabel: "USD / ton",
			unitPriceUsd: 385,
			monthlyVolume: "30 tons/month",
			netAnnualValueUsd: 112800,
			paymentTerms: "Net 30",
			expiresOn: "Apr 30, 2026",
		},
		linkedStreams: [
			{
				id: "str-735",
				name: "Heavy Metal Sludge Batch",
				status: "Phase 4 complete",
				location: "Corpus Christi Plant",
			},
		],
		timeline: [
			{
				id: "t6",
				title: "Outcome marked rejected",
				description: "Client delayed program due to capex constraints.",
				timestamp: "Apr 29, 03:10 PM",
				type: "client",
			},
		],
	},
	{
		projectId: "project-801",
		id: "ofr-801",
		reference: "OFR-801-D",
		clientName: "Stellar Refineries Co.",
		streamName: "Sulfuric Acid Grade A",
		location: "Baton Rouge, LA",
		stage: "accepted",
		valueUsd: 45200,
		createdAt: "Mar 26, 2026",
		updatedAt: "Apr 12, 2026",
		owner: "Mia Vega",
		executiveSummary:
			"Offer accepted and transitioned to onboarding with fixed monthly transport windows.",
		strategicInsights:
			"This win validates regional acid recovery playbook and can be reused for two nearby accounts.",
		complianceNotes: ["EPA manifest chain completed; onboarding docs signed."],
		pricing: {
			unitLabel: "USD / ton",
			unitPriceUsd: 265,
			monthlyVolume: "14 tons/month",
			netAnnualValueUsd: 45200,
			paymentTerms: "Net 30",
			expiresOn: "N/A",
		},
		linkedStreams: [
			{
				id: "str-801",
				name: "Sulfuric Acid Residual",
				status: "Contract active",
				location: "Baton Rouge Refinery",
			},
		],
		timeline: [
			{
				id: "t7",
				title: "Client accepted offer",
				description: "Commercial terms approved and kickoff scheduled.",
				timestamp: "Apr 12, 09:10 AM",
				type: "client",
			},
		],
	},
	{
		projectId: "project-910",
		id: "ofr-910",
		reference: "OFR-910-A",
		clientName: "BioPharma Labs Inc.",
		streamName: "Ethanol Solution 70%",
		location: "Raleigh, NC",
		stage: "expired",
		valueUsd: 12400,
		createdAt: "Feb 20, 2026",
		updatedAt: "Mar 15, 2026",
		owner: "Alex Fischer",
		executiveSummary:
			"Offer expired after procurement inactivity and no legal review response.",
		strategicInsights:
			"Re-engagement should pair commercial terms with a documented compliance acceleration checklist.",
		complianceNotes: [
			"No blocker from compliance; legal review remained pending.",
		],
		pricing: {
			unitLabel: "USD / gallon",
			unitPriceUsd: 1.1,
			monthlyVolume: "950 gal/month",
			netAnnualValueUsd: 12400,
			paymentTerms: "Net 30",
			expiresOn: "Mar 15, 2026",
		},
		linkedStreams: [
			{
				id: "str-910",
				name: "Ethanol Rinse Residual",
				status: "Dormant",
				location: "Raleigh BioPharma Campus",
			},
		],
		timeline: [
			{
				id: "t8",
				title: "Offer expired",
				description: "No response received before validity window ended.",
				timestamp: "Mar 15, 06:00 PM",
				type: "system",
			},
		],
	},
];

export function getOfferById(id: string) {
	return offers.find((offer) => offer.id === id);
}

export function formatCurrency(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(value);
}
