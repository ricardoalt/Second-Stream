import type { IntelligenceReportData } from "@/lib/types/intelligence-report";

const MOCK_REPORT: IntelligenceReportData = {
	streamName: "Mixed Plastic Waste — Injection Molding Rejects",
	primaryContact: "Laura Martinez",
	companyName: "Iberian Polymers S.L.",
	locationName: "Valencia — Paterna Industrial Park",
	ownerName: "Carlos Ruiz",
	summary: {
		shortDescription:
			"High-volume mixed plastic reject stream from injection molding, predominantly PP/PE with minor ABS contamination. Suitable for mechanical recycling with pre-sorting.",
		fullDescription:
			"This stream originates from the injection molding production line at the Paterna facility. Rejects include short shots, flash defects, and off-spec colour runs. The material is predominantly polypropylene (PP) and high-density polyethylene (HDPE), with occasional acrylonitrile butadiene styrene (ABS) parts from a shared tooling line. Current disposal is via general industrial waste contractor at approximately 180 EUR/tonne. A mechanical recycling pathway could recover 70-80% of material value, reducing disposal costs and generating a secondary raw material revenue stream. Pre-sorting by polymer type is recommended to maximise recyclate quality and pricing. No hazardous additives have been detected in recent FTIR analyses, though cadmium-based pigments were historically used (discontinued 2023).",
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
	},
	insights: [
		{
			id: "executive-summary",
			title: "Executive Summary",
			iconName: "Sparkles",
			content:
				"Iberian Polymers generates approximately 14 tonnes/month of mixed plastic rejects from their injection molding operations. Current disposal costs 180 EUR/tonne through a general waste contractor with no material recovery. Our analysis indicates that implementing a polymer-sorted recycling pathway could reduce net waste costs by 60-70% while generating secondary material revenue of approximately 400-600 EUR/tonne for clean PP flake. The recommended approach is a phased implementation: Phase 1 deploys on-site NIR sorting to separate PP, HDPE, and ABS fractions; Phase 2 establishes off-take agreements with regional compounders. Payback period is estimated at 8-12 months based on current commodity pricing.",
		},
		{
			id: "stream-description",
			title: "Stream Description",
			iconName: "FlaskConical",
			content:
				"The waste stream comprises injection molding rejects from three production lines operating 16 hours/day, 5 days/week. Reject rates average 3.2% of throughput, with seasonal peaks during colour changeovers (up to 5.1% in Q4). Material arrives in gaylord boxes, loosely packed, with no current segregation by polymer type. Average piece weight is 45g (range: 8-320g). The stream is dry, with residual mold release agent on approximately 15% of parts. No post-consumer material is included — this is exclusively post-industrial waste. Bulk density averages 180 kg/m3 as received.",
		},
		{
			id: "regulations",
			title: "Regulations",
			iconName: "Shield",
			content:
				"Under Spanish transposition of EU Waste Framework Directive (2008/98/EC), this stream is classified as non-hazardous industrial waste (LER code 12 01 05 — plastics shavings and turnings). The facility holds an integrated environmental authorisation (AAI) that covers on-site temporary storage up to 30 days. Key compliance requirements: (1) Waste transfer notes (documento de identificacion) required for each shipment; (2) Annual waste declaration (DARI) to Comunitat Valenciana environmental authority; (3) If sorted recyclate is shipped cross-border, REACH and POP regulations apply to contaminant thresholds; (4) End-of-waste criteria under EU 2023/2055 may apply once processed recyclate meets quality standards.",
		},
		{
			id: "logistics",
			title: "Logistics",
			iconName: "Truck",
			content:
				"Current logistics: weekly collection by Cespa (now PreZero) using 20m3 open-top containers. Average fill rate is 72%, indicating potential for bi-weekly collection with compaction. The facility has a dedicated waste dock with forklift access, operating hours 06:00-22:00. Nearest polymer recycling facilities: (1) Repetco Polymers, Almussafes — 18km, specialises in PP recycling; (2) Acteco, Ibi — 112km, mixed polymer processing; (3) Plasticos Romero, Murcia — 195km, HDPE focus. Recommended logistics optimisation: install a baler to increase bulk density to 450 kg/m3, reducing transport frequency by ~60% and improving container utilisation.",
		},
		{
			id: "environmental",
			title: "Environmental",
			iconName: "Leaf",
			content:
				"Diverting this stream from landfill/incineration to mechanical recycling would avoid approximately 28 tonnes CO2-eq/year (using DEFRA emission factors for plastic waste). Additional environmental benefits: (1) Reduced virgin polymer demand equivalent to 134 tonnes/year of crude oil feedstock; (2) Elimination of microplastic generation from landfill degradation; (3) Compliance with corporate ESG targets — Iberian Polymers has committed to 80% waste diversion by 2026 (currently at 52%). The recycling pathway also contributes to EU Circular Economy Action Plan targets and supports the facility's ISO 14001:2015 environmental management system objectives.",
		},
	],
	generatedAt: "2026-03-10T14:30:00Z",
};

/**
 * Retrieve mock intelligence report data for a given project.
 * In production this would be an API call; for now returns static mock data.
 */
export function getIntelligenceReport(
	_projectId: string,
): IntelligenceReportData {
	return MOCK_REPORT;
}
