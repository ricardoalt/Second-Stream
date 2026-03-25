export type ClientStatus = "active" | "prospect" | "inactive";

export type PortfolioClient = {
	id: string;
	name: string;
	industry: string;
	status: ClientStatus;
	streamCount: number;
	locationCount: number;
	pipelineValue: number;
	annualVolumeGallons: number;
	lastActivity: string;
	contactName: string;
	contactRole: string;
	contactEmail: string;
	contactPhone: string;
};

export type ClientDetail = PortfolioClient & {
	accountId: string;
	summary: string;
	website: string;
	address: string;
	keyContacts: Array<{
		id: string;
		name: string;
		role: string;
		email: string;
		phone: string;
	}>;
	streams: Array<{
		id: string;
		material: string;
		location: string;
		status: "active" | "draft" | "missing_info";
		volume: string;
		frequency: string;
		lastUpdated: string;
	}>;
	offers: Array<{
		id: string;
		title: string;
		status: "draft" | "sent" | "negotiation" | "won" | "pending";
		value: number;
		stage: string;
		updatedAt: string;
	}>;
	activityTimeline: Array<{
		id: string;
		title: string;
		description: string;
		at: string;
		type: "call" | "email" | "proposal" | "stream" | "note";
	}>;
	stats: {
		totalStreams: number;
		activeOffers: number;
		openIssues: number;
		winRate: number;
	};
};

const novaIndustrial: PortfolioClient = {
	id: "nova-industrial",
	name: "Nova Industrial",
	industry: "Petrochemical",
	status: "active",
	streamCount: 12,
	locationCount: 3,
	pipelineValue: 840000,
	annualVolumeGallons: 450000,
	lastActivity: "2h ago",
	contactName: "Marcus Thorne",
	contactRole: "Facility Manager",
	contactEmail: "marcus.thorne@nova-industrial.com",
	contactPhone: "+1 (713) 555-0142",
};

export const portfolioClients: PortfolioClient[] = [
	novaIndustrial,
	{
		id: "global-finishes",
		name: "Global Finishes",
		industry: "Surface Coatings",
		status: "prospect",
		streamCount: 5,
		locationCount: 1,
		pipelineValue: 260000,
		annualVolumeGallons: 112500,
		lastActivity: "1d ago",
		contactName: "Irene Wallace",
		contactRole: "Procurement Lead",
		contactEmail: "i.wallace@globalfinishes.com",
		contactPhone: "+1 (281) 555-0148",
	},
	{
		id: "aerotech-systems",
		name: "AeroTech Systems",
		industry: "Aerospace Manufacturing",
		status: "active",
		streamCount: 22,
		locationCount: 2,
		pipelineValue: 1480000,
		annualVolumeGallons: 890000,
		lastActivity: "45m ago",
		contactName: "Elena Garza",
		contactRole: "EH&S Director",
		contactEmail: "egarza@aerotechsystems.com",
		contactPhone: "+1 (832) 555-0133",
	},
	{
		id: "lexington-pharma",
		name: "Lexington Pharma",
		industry: "Pharmaceutical",
		status: "inactive",
		streamCount: 0,
		locationCount: 1,
		pipelineValue: 0,
		annualVolumeGallons: 0,
		lastActivity: "24d ago",
		contactName: "Jared Chen",
		contactRole: "Operations VP",
		contactEmail: "jared.chen@lexingtonpharma.com",
		contactPhone: "+1 (337) 555-0121",
	},
	{
		id: "heavy-gear-manufacturing",
		name: "Heavy Gear Manufacturing",
		industry: "Industrial Equipment",
		status: "active",
		streamCount: 8,
		locationCount: 2,
		pipelineValue: 610000,
		annualVolumeGallons: 340000,
		lastActivity: "4h ago",
		contactName: "Samuel Brooks",
		contactRole: "Plant Superintendent",
		contactEmail: "sbrooks@heavygear.com",
		contactPhone: "+1 (504) 555-0119",
	},
	{
		id: "precision-circuits",
		name: "Precision Circuits",
		industry: "Electronics",
		status: "prospect",
		streamCount: 3,
		locationCount: 1,
		pipelineValue: 195000,
		annualVolumeGallons: 87000,
		lastActivity: "6h ago",
		contactName: "Ari Delgado",
		contactRole: "Environmental Engineer",
		contactEmail: "ari.delgado@precisioncircuits.io",
		contactPhone: "+1 (985) 555-0104",
	},
];

const detailRecords: Record<string, ClientDetail> = {
	"nova-industrial": {
		...novaIndustrial,
		accountId: "8829",
		summary:
			"Nova Industrial maintains 12 active streams across three facilities and is currently prioritizing document closure for two high-value recovery lines.",
		website: "https://www.nova-industrial.com",
		address: "1401 Eastgate Industrial Pkwy, Houston, TX 77029",
		keyContacts: [
			{
				id: "c1",
				name: "Marcus Thorne",
				role: "Facility Manager",
				email: "marcus.thorne@nova-industrial.com",
				phone: "+1 (713) 555-0142",
			},
			{
				id: "c2",
				name: "Leah Morgan",
				role: "Compliance Officer",
				email: "leah.morgan@nova-industrial.com",
				phone: "+1 (713) 555-0177",
			},
			{
				id: "c3",
				name: "Diego Herrera",
				role: "Logistics Coordinator",
				email: "diego.herrera@nova-industrial.com",
				phone: "+1 (713) 555-0195",
			},
		],
		streams: [
			{
				id: "STR-2993",
				material: "Benzene Solvent Recovery",
				location: "Houston, TX · Main Plant",
				status: "missing_info",
				volume: "14,200 L",
				frequency: "Monthly",
				lastUpdated: "12d ago",
			},
			{
				id: "STR-4412",
				material: "Spent Acidic Etchant",
				location: "Baton Rouge, LA · Building 4C",
				status: "draft",
				volume: "Pending",
				frequency: "One-time",
				lastUpdated: "9d ago",
			},
			{
				id: "STR-8819",
				material: "Mixed Hydrocarbon Sludge",
				location: "Baytown, TX · Research Annex",
				status: "active",
				volume: "8,100 L",
				frequency: "Weekly",
				lastUpdated: "2h ago",
			},
		],
		offers: [
			{
				id: "PR-8821",
				title: "Hydrocarbon Recovery Program",
				status: "pending",
				value: 320000,
				stage: "Final approval",
				updatedAt: "5d ago",
			},
			{
				id: "PR-8874",
				title: "Closed-loop Solvent Reuse",
				status: "negotiation",
				value: 210000,
				stage: "Commercial negotiation",
				updatedAt: "1d ago",
			},
			{
				id: "PR-8702",
				title: "Acid Neutralization Service",
				status: "won",
				value: 180000,
				stage: "Awarded",
				updatedAt: "3w ago",
			},
		],
		activityTimeline: [
			{
				id: "a1",
				title: "Call logged with Marcus Thorne",
				description:
					"Confirmed SDS upload deadline and aligned on pickup window for STR-2993.",
				at: "Today · 09:14",
				type: "call",
			},
			{
				id: "a2",
				title: "Offer PR-8821 moved to pending approval",
				description:
					"Client procurement requested internal legal review before signature.",
				at: "Yesterday · 16:40",
				type: "proposal",
			},
			{
				id: "a3",
				title: "Follow-up email sent to compliance team",
				description: "Requested missing COA attachment for acid etchant line.",
				at: "Yesterday · 11:22",
				type: "email",
			},
			{
				id: "a4",
				title: "Stream STR-8819 advanced to active",
				description:
					"Phase 3 validation completed and route recommendation approved.",
				at: "Mon · 14:08",
				type: "stream",
			},
		],
		stats: {
			totalStreams: 12,
			activeOffers: 2,
			openIssues: 2,
			winRate: 94.2,
		},
	},
};

function getNovaDetail(): ClientDetail {
	const nova = detailRecords["nova-industrial"];
	if (!nova) throw new Error("Nova Industrial detail record missing");
	return nova;
}

export function getClientDetail(clientId: string | undefined): ClientDetail {
	if (!clientId) {
		return getNovaDetail();
	}

	return (
		detailRecords[clientId] ?? {
			...getNovaDetail(),
			id: clientId,
			name: "Client not found",
			summary:
				"No detailed profile is available for this client yet. Use portfolio data until CRM sync is connected.",
			stats: {
				totalStreams: 0,
				activeOffers: 0,
				openIssues: 0,
				winRate: 0,
			},
			streams: [],
			offers: [],
			activityTimeline: [],
		}
	);
}
