import type { Sector, Subsector } from "@/lib/sectors-config";

export type ClientStatus = "active" | "prospect" | "inactive";

export type ClientLocation = {
	id: string;
	name: string;
	address: string;
	city: string;
	state: string;
	streamCount: number;
};

export type PortfolioClient = {
	id: string;
	name: string;
	industry: string;
	sector: Sector | "";
	subsector: Subsector | "";
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
	locations: ClientLocation[];
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
	sector: "chemicals_pharmaceuticals",
	subsector: "petrochemicals",
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
		sector: "chemicals_pharmaceuticals",
		subsector: "paints_coatings",
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
		sector: "manufacturing_industrial",
		subsector: "aerospace_manufacturing",
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
		sector: "chemicals_pharmaceuticals",
		subsector: "pharmaceutical_manufacturing",
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
		sector: "manufacturing_industrial",
		subsector: "machinery_equipment_manufacturing",
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
		sector: "electronics_it_ewaste",
		subsector: "electronics_manufacturers",
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

function getPortfolioClient(clientId: string): PortfolioClient {
	const client = portfolioClients.find((item) => item.id === clientId);
	if (!client) {
		throw new Error(`No portfolio client for detail record: ${clientId}`);
	}

	return client;
}

const detailRecords: Record<string, ClientDetail> = {
	"nova-industrial": {
		...novaIndustrial,
		accountId: "8829",
		summary:
			"Nova Industrial maintains 12 active streams across three facilities and is currently prioritizing document closure for two high-value recovery lines.",
		website: "https://www.nova-industrial.com",
		address: "1401 Eastgate Industrial Pkwy, Houston, TX 77029",
		locations: [
			{
				id: "loc-1",
				name: "Cambridge R&D Facility",
				address: "45 Innovation Drive",
				city: "Cambridge",
				state: "MA",
				streamCount: 4,
			},
			{
				id: "loc-2",
				name: "Austin Manufacturing",
				address: "1200 Tech Blvd",
				city: "Austin",
				state: "TX",
				streamCount: 3,
			},
			{
				id: "loc-3",
				name: "Houston Main Processing",
				address: "1401 Eastgate Industrial Pkwy",
				city: "Houston",
				state: "TX",
				streamCount: 5,
			},
		],
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
	"global-finishes": {
		...getPortfolioClient("global-finishes"),
		accountId: "8941",
		summary:
			"Global Finishes is evaluating a phased conversion away from solvent-heavy coating lines and has asked for waste profile normalization before launching full service.",
		website: "https://www.globalfinishes.com",
		address: "2701 Bay Area Blvd, Pasadena, TX 77507",
		locations: [
			{
				id: "gf-loc-1",
				name: "Pasadena Coatings Campus",
				address: "2701 Bay Area Blvd",
				city: "Pasadena",
				state: "TX",
				streamCount: 5,
			},
		],
		keyContacts: [
			{
				id: "gf-c1",
				name: "Irene Wallace",
				role: "Procurement Lead",
				email: "i.wallace@globalfinishes.com",
				phone: "+1 (281) 555-0148",
			},
			{
				id: "gf-c2",
				name: "Tomás Rivera",
				role: "EHS Program Manager",
				email: "trivera@globalfinishes.com",
				phone: "+1 (281) 555-0166",
			},
			{
				id: "gf-c3",
				name: "Nia Coleman",
				role: "Plant Scheduler",
				email: "ncoleman@globalfinishes.com",
				phone: "+1 (281) 555-0123",
			},
		],
		streams: [
			{
				id: "GF-STR-1101",
				material: "Spent Xylene Thinner",
				location: "Pasadena, TX · Coatings Hall A",
				status: "active",
				volume: "4,900 L",
				frequency: "Bi-weekly",
				lastUpdated: "6h ago",
			},
			{
				id: "GF-STR-1102",
				material: "Solvent-Contaminated Wipes",
				location: "Pasadena, TX · Finishing Line 3",
				status: "active",
				volume: "1,200 kg",
				frequency: "Weekly",
				lastUpdated: "1d ago",
			},
			{
				id: "GF-STR-1103",
				material: "Pigment Washout Slurry",
				location: "Pasadena, TX · Blend Room",
				status: "draft",
				volume: "Pending",
				frequency: "Monthly",
				lastUpdated: "3d ago",
			},
			{
				id: "GF-STR-1104",
				material: "Methyl Ethyl Ketone Residue",
				location: "Pasadena, TX · Solvent Farm",
				status: "missing_info",
				volume: "Unknown",
				frequency: "Quarterly",
				lastUpdated: "5d ago",
			},
			{
				id: "GF-STR-1105",
				material: "Booth Filter Cake",
				location: "Pasadena, TX · Spray Booth Cluster",
				status: "draft",
				volume: "640 kg",
				frequency: "Monthly",
				lastUpdated: "2d ago",
			},
		],
		offers: [
			{
				id: "GF-PR-301",
				title: "Coatings Solvent Recovery Launch",
				status: "sent",
				value: 140000,
				stage: "Technical review",
				updatedAt: "1d ago",
			},
			{
				id: "GF-PR-302",
				title: "Filter Cake Stabilization Program",
				status: "draft",
				value: 120000,
				stage: "Cost model pending",
				updatedAt: "4h ago",
			},
		],
		activityTimeline: [
			{
				id: "gf-a1",
				title: "Qualification call with EHS manager",
				description:
					"Reviewed threshold solvent concentrations needed to move stream GF-STR-1104 out of missing info.",
				at: "Today · 10:05",
				type: "call",
			},
			{
				id: "gf-a2",
				title: "Offer GF-PR-301 sent to procurement",
				description:
					"Included phased onboarding option with lower first-quarter pickup cadence.",
				at: "Yesterday · 15:10",
				type: "proposal",
			},
			{
				id: "gf-a3",
				title: "Lab request for pigment slurry characterization",
				description:
					"Awaiting solids ratio results before pricing the stabilization route.",
				at: "Mon · 11:34",
				type: "email",
			},
			{
				id: "gf-a4",
				title: "Stream GF-STR-1102 validated",
				description: "Confirmed weekly generation profile at finishing line 3.",
				at: "Fri · 13:47",
				type: "stream",
			},
		],
		stats: {
			totalStreams: 5,
			activeOffers: 2,
			openIssues: 1,
			winRate: 28.6,
		},
	},
	"aerotech-systems": {
		...getPortfolioClient("aerotech-systems"),
		accountId: "9017",
		summary:
			"AeroTech Systems runs a high-volume aerospace waste program split between degreasing and composite prep operations, with documentation quality improving but still uneven in auxiliary lines.",
		website: "https://www.aerotechsystems.com",
		address: "7810 Orbital Park Dr, Phoenix, AZ 85034",
		locations: [
			{
				id: "at-loc-1",
				name: "Phoenix Airframe Campus",
				address: "7810 Orbital Park Dr",
				city: "Phoenix",
				state: "AZ",
				streamCount: 13,
			},
			{
				id: "at-loc-2",
				name: "Mobile Turbine Components",
				address: "4400 Aviation Beltway",
				city: "Mobile",
				state: "AL",
				streamCount: 9,
			},
		],
		keyContacts: [
			{
				id: "at-c1",
				name: "Elena Garza",
				role: "EH&S Director",
				email: "egarza@aerotechsystems.com",
				phone: "+1 (832) 555-0133",
			},
			{
				id: "at-c2",
				name: "Kellan Price",
				role: "Composites Operations Manager",
				email: "kprice@aerotechsystems.com",
				phone: "+1 (251) 555-0168",
			},
			{
				id: "at-c3",
				name: "Mina Yoon",
				role: "Supply Chain Program Lead",
				email: "myoon@aerotechsystems.com",
				phone: "+1 (602) 555-0109",
			},
		],
		streams: [
			{
				id: "AT-STR-2201",
				material: "Spent Acetone Degreaser",
				location: "Phoenix, AZ · Cell 2",
				status: "active",
				volume: "18,400 L",
				frequency: "Weekly",
				lastUpdated: "2h ago",
			},
			{
				id: "AT-STR-2202",
				material: "Isopropyl Alcohol Rinse",
				location: "Phoenix, AZ · Wing Line A",
				status: "active",
				volume: "9,600 L",
				frequency: "Weekly",
				lastUpdated: "4h ago",
			},
			{
				id: "AT-STR-2203",
				material: "Chromated Conversion Bath",
				location: "Phoenix, AZ · Surface Prep",
				status: "active",
				volume: "6,200 L",
				frequency: "Bi-weekly",
				lastUpdated: "1d ago",
			},
			{
				id: "AT-STR-2204",
				material: "Composite Resin Purge",
				location: "Phoenix, AZ · Composite Bay 4",
				status: "draft",
				volume: "3,100 L",
				frequency: "Monthly",
				lastUpdated: "2d ago",
			},
			{
				id: "AT-STR-2205",
				material: "Aqueous Parts Washer Sludge",
				location: "Phoenix, AZ · Engine Prep",
				status: "active",
				volume: "2,450 kg",
				frequency: "Monthly",
				lastUpdated: "6h ago",
			},
			{
				id: "AT-STR-2206",
				material: "MEK Adhesive Cleaner",
				location: "Phoenix, AZ · Bonding Cell",
				status: "active",
				volume: "5,700 L",
				frequency: "Weekly",
				lastUpdated: "8h ago",
			},
			{
				id: "AT-STR-2207",
				material: "Hydraulic Fluid Off-Spec Lots",
				location: "Phoenix, AZ · Test Hangar",
				status: "missing_info",
				volume: "Unknown",
				frequency: "Ad hoc",
				lastUpdated: "5d ago",
			},
			{
				id: "AT-STR-2208",
				material: "Paint Booth Filter Media",
				location: "Phoenix, AZ · Paint Line 1",
				status: "active",
				volume: "980 kg",
				frequency: "Monthly",
				lastUpdated: "1d ago",
			},
			{
				id: "AT-STR-2209",
				material: "Solvent Distillation Bottoms",
				location: "Phoenix, AZ · Utilities",
				status: "active",
				volume: "4,800 L",
				frequency: "Bi-weekly",
				lastUpdated: "3h ago",
			},
			{
				id: "AT-STR-2210",
				material: "Titanium Etch Neutralization Cake",
				location: "Phoenix, AZ · Etch Lab",
				status: "draft",
				volume: "530 kg",
				frequency: "Monthly",
				lastUpdated: "3d ago",
			},
			{
				id: "AT-STR-2211",
				material: "Glycol Coolant Replacement",
				location: "Phoenix, AZ · CNC Cluster",
				status: "active",
				volume: "3,900 L",
				frequency: "Quarterly",
				lastUpdated: "2d ago",
			},
			{
				id: "AT-STR-2212",
				material: "Activated Carbon from VOC Control",
				location: "Phoenix, AZ · VOC Unit",
				status: "missing_info",
				volume: "Unknown",
				frequency: "Quarterly",
				lastUpdated: "7d ago",
			},
			{
				id: "AT-STR-2213",
				material: "Spent Alkaline Cleaner",
				location: "Phoenix, AZ · Fuselage Prep",
				status: "active",
				volume: "7,200 L",
				frequency: "Weekly",
				lastUpdated: "9h ago",
			},
			{
				id: "AT-STR-2214",
				material: "Turbine Degreaser Concentrate",
				location: "Mobile, AL · Turbine Line",
				status: "active",
				volume: "11,300 L",
				frequency: "Weekly",
				lastUpdated: "1h ago",
			},
			{
				id: "AT-STR-2215",
				material: "Nickel Plating Rinsewater",
				location: "Mobile, AL · Plating Zone",
				status: "active",
				volume: "8,100 L",
				frequency: "Weekly",
				lastUpdated: "5h ago",
			},
			{
				id: "AT-STR-2216",
				material: "Abrasive Blast Residue",
				location: "Mobile, AL · Surface Hall",
				status: "draft",
				volume: "1,400 kg",
				frequency: "Monthly",
				lastUpdated: "4d ago",
			},
			{
				id: "AT-STR-2217",
				material: "Fuel Cell Cleaning Solvent",
				location: "Mobile, AL · Integration Bay",
				status: "active",
				volume: "6,500 L",
				frequency: "Bi-weekly",
				lastUpdated: "11h ago",
			},
			{
				id: "AT-STR-2218",
				material: "Composite Dust Collection Fines",
				location: "Mobile, AL · Composite Cell",
				status: "missing_info",
				volume: "Unknown",
				frequency: "Weekly",
				lastUpdated: "6d ago",
			},
			{
				id: "AT-STR-2219",
				material: "Off-spec Paint Hardener",
				location: "Mobile, AL · Coatings Annex",
				status: "draft",
				volume: "760 L",
				frequency: "Monthly",
				lastUpdated: "2d ago",
			},
			{
				id: "AT-STR-2220",
				material: "Trichloroethylene Legacy Drums",
				location: "Mobile, AL · Hazard Storage",
				status: "active",
				volume: "3,200 L",
				frequency: "One-time",
				lastUpdated: "3d ago",
			},
			{
				id: "AT-STR-2221",
				material: "Aqueous Degreaser Overflow",
				location: "Mobile, AL · Prep Tunnel",
				status: "active",
				volume: "5,600 L",
				frequency: "Weekly",
				lastUpdated: "7h ago",
			},
			{
				id: "AT-STR-2222",
				material: "Silicone Sealant Cartridge Waste",
				location: "Mobile, AL · Final Assembly",
				status: "draft",
				volume: "420 kg",
				frequency: "Monthly",
				lastUpdated: "1d ago",
			},
		],
		offers: [
			{
				id: "AT-PR-740",
				title: "Enterprise Degreaser Recovery Program",
				status: "negotiation",
				value: 920000,
				stage: "Legal and indemnity review",
				updatedAt: "Today · 08:52",
			},
			{
				id: "AT-PR-741",
				title: "Mobile Site Composite Waste Bundle",
				status: "pending",
				value: 560000,
				stage: "Board procurement queue",
				updatedAt: "Yesterday · 17:03",
			},
			{
				id: "AT-PR-699",
				title: "Phoenix Distillation Optimization",
				status: "won",
				value: 390000,
				stage: "Awarded",
				updatedAt: "2w ago",
			},
		],
		activityTimeline: [
			{
				id: "at-a1",
				title: "Executive review call completed",
				description:
					"Aligned on multi-site rollout sequencing tied to Q3 shutdown windows.",
				at: "Today · 09:40",
				type: "call",
			},
			{
				id: "at-a2",
				title: "AT-PR-740 moved to legal review",
				description:
					"Client requested revised insurance rider language before signature.",
				at: "Today · 08:52",
				type: "proposal",
			},
			{
				id: "at-a3",
				title: "Data gap flagged for AT-STR-2218",
				description:
					"Composite dust moisture readings missing in latest manifests.",
				at: "Yesterday · 14:18",
				type: "note",
			},
			{
				id: "at-a4",
				title: "Mobile turbine stream activated",
				description: "AT-STR-2214 approved for recurring weekly pickups.",
				at: "Mon · 10:21",
				type: "stream",
			},
		],
		stats: {
			totalStreams: 22,
			activeOffers: 2,
			openIssues: 4,
			winRate: 71.4,
		},
	},
	"lexington-pharma": {
		...getPortfolioClient("lexington-pharma"),
		accountId: "9172",
		summary:
			"Lexington Pharma remains dormant after a plant consolidation and has not restarted any regulated waste streams since the prior contract sunset.",
		website: "https://www.lexingtonpharma.com",
		address: "905 Riverbend Research Dr, Lafayette, LA 70508",
		locations: [
			{
				id: "lp-loc-1",
				name: "Lafayette Formulation Site",
				address: "905 Riverbend Research Dr",
				city: "Lafayette",
				state: "LA",
				streamCount: 0,
			},
		],
		keyContacts: [
			{
				id: "lp-c1",
				name: "Jared Chen",
				role: "Operations VP",
				email: "jared.chen@lexingtonpharma.com",
				phone: "+1 (337) 555-0121",
			},
			{
				id: "lp-c2",
				name: "Maya Bolton",
				role: "Quality Compliance Manager",
				email: "maya.bolton@lexingtonpharma.com",
				phone: "+1 (337) 555-0155",
			},
		],
		streams: [],
		offers: [],
		activityTimeline: [
			{
				id: "lp-a1",
				title: "Dormancy confirmation email received",
				description:
					"Client confirmed no restart date for formulation operations in current fiscal year.",
				at: "24d ago",
				type: "email",
			},
			{
				id: "lp-a2",
				title: "Account placed in inactive watchlist",
				description:
					"Team scheduled quarterly touchpoint only; no open compliance tasks.",
				at: "31d ago",
				type: "note",
			},
		],
		stats: {
			totalStreams: 0,
			activeOffers: 0,
			openIssues: 0,
			winRate: 0,
		},
	},
	"heavy-gear-manufacturing": {
		...getPortfolioClient("heavy-gear-manufacturing"),
		accountId: "9248",
		summary:
			"Heavy Gear Manufacturing operates machining and assembly waste profiles with stable volumes, and is currently prioritizing coolant recapture economics over one-time disposal.",
		website: "https://www.heavygear.com",
		address: "1180 Forge River Rd, New Orleans, LA 70123",
		locations: [
			{
				id: "hg-loc-1",
				name: "New Orleans Machine Works",
				address: "1180 Forge River Rd",
				city: "New Orleans",
				state: "LA",
				streamCount: 5,
			},
			{
				id: "hg-loc-2",
				name: "Baton Rouge Assembly Yard",
				address: "3320 Delta Industrial Dr",
				city: "Baton Rouge",
				state: "LA",
				streamCount: 3,
			},
		],
		keyContacts: [
			{
				id: "hg-c1",
				name: "Samuel Brooks",
				role: "Plant Superintendent",
				email: "sbrooks@heavygear.com",
				phone: "+1 (504) 555-0119",
			},
			{
				id: "hg-c2",
				name: "Priya Nandakumar",
				role: "Maintenance Reliability Lead",
				email: "pnandakumar@heavygear.com",
				phone: "+1 (225) 555-0131",
			},
			{
				id: "hg-c3",
				name: "Leon Fitch",
				role: "HSSE Coordinator",
				email: "lfitch@heavygear.com",
				phone: "+1 (504) 555-0172",
			},
		],
		streams: [
			{
				id: "HG-STR-5101",
				material: "Used Metalworking Coolant",
				location: "New Orleans, LA · CNC Hall",
				status: "active",
				volume: "12,000 L",
				frequency: "Weekly",
				lastUpdated: "3h ago",
			},
			{
				id: "HG-STR-5102",
				material: "Quench Oil from Heat Treat",
				location: "New Orleans, LA · Heat Treat Bay",
				status: "active",
				volume: "8,400 L",
				frequency: "Bi-weekly",
				lastUpdated: "1d ago",
			},
			{
				id: "HG-STR-5103",
				material: "Oil-Contaminated Absorbents",
				location: "New Orleans, LA · Maintenance Shop",
				status: "draft",
				volume: "780 kg",
				frequency: "Monthly",
				lastUpdated: "4d ago",
			},
			{
				id: "HG-STR-5104",
				material: "Parts Washer Sludge",
				location: "New Orleans, LA · Wash Station",
				status: "active",
				volume: "2,100 kg",
				frequency: "Monthly",
				lastUpdated: "2d ago",
			},
			{
				id: "HG-STR-5105",
				material: "Hydraulic Oil Changeouts",
				location: "New Orleans, LA · Press Line",
				status: "missing_info",
				volume: "Unknown",
				frequency: "Quarterly",
				lastUpdated: "6d ago",
			},
			{
				id: "HG-STR-5106",
				material: "Rust Inhibitor Rinse",
				location: "Baton Rouge, LA · Assembly Yard",
				status: "active",
				volume: "3,600 L",
				frequency: "Bi-weekly",
				lastUpdated: "7h ago",
			},
			{
				id: "HG-STR-5107",
				material: "Waste Cutting Fluid Emulsion",
				location: "Baton Rouge, LA · Gear Cell",
				status: "active",
				volume: "5,300 L",
				frequency: "Weekly",
				lastUpdated: "10h ago",
			},
			{
				id: "HG-STR-5108",
				material: "Grease Trap Residuals",
				location: "Baton Rouge, LA · Utility Corridor",
				status: "draft",
				volume: "640 kg",
				frequency: "Quarterly",
				lastUpdated: "3d ago",
			},
		],
		offers: [
			{
				id: "HG-PR-880",
				title: "Coolant Reclamation Expansion",
				status: "negotiation",
				value: 360000,
				stage: "Service-level terms review",
				updatedAt: "Today · 11:03",
			},
			{
				id: "HG-PR-881",
				title: "Assembly Yard Oil Bundle",
				status: "sent",
				value: 250000,
				stage: "Awaiting procurement response",
				updatedAt: "2d ago",
			},
		],
		activityTimeline: [
			{
				id: "hg-a1",
				title: "Pricing workshop with operations",
				description:
					"Compared on-site coolant filtration versus off-site bulk recovery routes.",
				at: "Today · 11:03",
				type: "call",
			},
			{
				id: "hg-a2",
				title: "HSSE flagged stream HG-STR-5105",
				description: "Hydraulic line sample sheets missing flash point values.",
				at: "Yesterday · 13:15",
				type: "note",
			},
			{
				id: "hg-a3",
				title: "Offer HG-PR-881 delivered",
				description:
					"Sent revised schedule with split pickups for Baton Rouge yard.",
				at: "Mon · 09:28",
				type: "proposal",
			},
			{
				id: "hg-a4",
				title: "Stream HG-STR-5107 volume updated",
				description:
					"Weekly volume increased after adding second machining shift.",
				at: "Fri · 16:42",
				type: "stream",
			},
		],
		stats: {
			totalStreams: 8,
			activeOffers: 2,
			openIssues: 1,
			winRate: 52.3,
		},
	},
	"precision-circuits": {
		...getPortfolioClient("precision-circuits"),
		accountId: "9316",
		summary:
			"Precision Circuits is an early-stage electronics prospect with low current stream volume, focused on etchant handling compliance before committing to a long-term recovery contract.",
		website: "https://www.precisioncircuits.io",
		address: "402 Microchip Ave, Slidell, LA 70458",
		locations: [
			{
				id: "pc-loc-1",
				name: "Slidell PCB Fabrication Lab",
				address: "402 Microchip Ave",
				city: "Slidell",
				state: "LA",
				streamCount: 3,
			},
		],
		keyContacts: [
			{
				id: "pc-c1",
				name: "Ari Delgado",
				role: "Environmental Engineer",
				email: "ari.delgado@precisioncircuits.io",
				phone: "+1 (985) 555-0104",
			},
			{
				id: "pc-c2",
				name: "Becca Lu",
				role: "Manufacturing Program Manager",
				email: "becca.lu@precisioncircuits.io",
				phone: "+1 (985) 555-0182",
			},
		],
		streams: [
			{
				id: "PC-STR-4101",
				material: "Spent Cupric Chloride Etchant",
				location: "Slidell, LA · Wet Process Bay",
				status: "active",
				volume: "2,900 L",
				frequency: "Bi-weekly",
				lastUpdated: "5h ago",
			},
			{
				id: "PC-STR-4102",
				material: "Solder Mask Wash Solvent",
				location: "Slidell, LA · Clean Room 2",
				status: "draft",
				volume: "1,100 L",
				frequency: "Monthly",
				lastUpdated: "1d ago",
			},
			{
				id: "PC-STR-4103",
				material: "Lead-Bearing Filter Sludge",
				location: "Slidell, LA · Plating Utility",
				status: "missing_info",
				volume: "Unknown",
				frequency: "Monthly",
				lastUpdated: "3d ago",
			},
		],
		offers: [
			{
				id: "PC-PR-600",
				title: "Etchant Recovery Starter Package",
				status: "draft",
				value: 85000,
				stage: "Awaiting internal capex signoff",
				updatedAt: "6h ago",
			},
			{
				id: "PC-PR-601",
				title: "Compliance Sampling & Pickup Plan",
				status: "sent",
				value: 110000,
				stage: "Client technical review",
				updatedAt: "1d ago",
			},
		],
		activityTimeline: [
			{
				id: "pc-a1",
				title: "Prospect discovery workshop completed",
				description:
					"Mapped etchant handling constraints and discussed phased onboarding.",
				at: "Today · 09:12",
				type: "call",
			},
			{
				id: "pc-a2",
				title: "Offer PC-PR-601 sent",
				description: "Included optional quarterly compliance sampling add-on.",
				at: "Yesterday · 12:26",
				type: "proposal",
			},
			{
				id: "pc-a3",
				title: "Missing profile data request submitted",
				description:
					"Requested TCLP lab data to complete classification for PC-STR-4103.",
				at: "Mon · 15:50",
				type: "email",
			},
		],
		stats: {
			totalStreams: 3,
			activeOffers: 2,
			openIssues: 2,
			winRate: 12.5,
		},
	},
};

export function getClientDetail(clientId: string | undefined): ClientDetail {
	if (!clientId || !detailRecords[clientId]) {
		throw new Error(`No detail record for client: ${clientId}`);
	}

	return detailRecords[clientId];
}
