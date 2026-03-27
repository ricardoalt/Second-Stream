import type { StreamDetail, StreamRow } from "./types";

const MOCK_CLIENT_IDS = {
	apexRefining: "0be834dc-7e9f-4cf8-b038-f9ce5ec7ac54",
	precisionChemTech: "f8d24fcf-5e6e-4d35-aa35-6af51b8f7dc7",
	heavyConstruct: "eaacbc0c-35d5-4b4b-b39c-ce3d96f3dcd2",
} as const;

const MOCK_LOCATION_IDS = {
	houston: "9a475d8f-22ed-4a4a-9e09-18cd44e56c9a",
	batonRouge: "8d3381cc-f0a1-4ffd-ac0c-e1955c4fe8ab",
	tulsa: "c4727ff7-a153-4de1-bf56-e8da3fd14704",
} as const;

export const allStreams: StreamRow[] = [
	{
		id: "STR-442",
		name: "Spent Isopropyl Alcohol",
		client: "PharmaTech Solutions",
		location: "Houston, TX",
		agent: "Alex Fischer",
		wasteType: "Solvent",
		volume: "5,000 gal/mo",
		lastUpdated: "10 min ago",
		phase: 2,
		status: "missing_info",
		daysSinceLastActivity: 18,
		missingFields: ["SDS", "Hazard class", "Container type"],
		priority: "urgent",
		reason: "No update in 18 days and missing SDS revision.",
		nextAction: "Call EHS manager and request latest SDS + transport profile.",
		dueDate: "Today · 4:00 PM",
	},
	{
		id: "STR-993",
		name: "Contaminated Soil",
		client: "Heavy Construct Corp",
		clientId: MOCK_CLIENT_IDS.heavyConstruct,
		location: "Tulsa, OK",
		locationId: MOCK_LOCATION_IDS.tulsa,
		agent: "Alex Fischer",
		wasteType: "Solid",
		volume: "250 tons/once",
		lastUpdated: "48 min ago",
		phase: 1,
		status: "draft",
		processMethod: "Mechanical recovery",
		units: "tons/once",
		lastEdited: "34 min ago",
	},
	{
		id: "STR-1120",
		name: "Metal Plating Sludge",
		client: "United Aerospace",
		location: "Wichita, KS",
		agent: "Marta Vega",
		wasteType: "Sludge",
		volume: "34 tons/mo",
		lastUpdated: "2 h ago",
		phase: 3,
		status: "missing_info",
		daysSinceLastActivity: 14,
		missingFields: ["Admin sign-off", "Generator mandate"],
		priority: "medium",
		reason: "Profile draft expired before admin sign-off.",
		nextAction: "Re-submit profile summary and schedule admin review.",
		dueDate: "Tomorrow · 10:00 AM",
	},
	{
		id: "STR-8841",
		name: "Chlorinated Solvent Mix",
		client: "Precision Chem-Tech",
		location: "Baton Rouge, LA",
		agent: "Alex Fischer",
		wasteType: "Hazardous Solvent",
		volume: "1,200 gal/mo",
		lastUpdated: "14 days ago",
		phase: 2,
		status: "blocked",
		daysSinceLastActivity: 21,
		missingFields: ["Lab analysis", "Flash point"],
		priority: "high",
		reason: "Lab profile pending after compliance hold.",
		nextAction: "Ping lab partner and attach interim COA in stream workspace.",
		dueDate: "Overdue · Yesterday",
	},
	{
		id: "STR-2234",
		name: "Contaminated Rags / Sorbents",
		client: "GigaFactory West",
		location: "Reno, NV",
		agent: "Sam Byrd",
		wasteType: "Absorbent",
		volume: "8 pallets/mo",
		lastUpdated: "16 days ago",
		phase: 1,
		status: "active",
	},
	{
		id: "STR-4592",
		name: "Isopropanol Wash Waste",
		client: "BioMed Solutions",
		location: "Raleigh, NC",
		agent: "Alex Fischer",
		wasteType: "Wash Solvent",
		volume: "2,850 gal/mo",
		lastUpdated: "21 days ago",
		phase: 4,
		status: "ready_for_offer",
	},
	{
		id: "DRAFT-01",
		name: "Neutralization Slurry",
		client: "Apex Refining Co.",
		clientId: MOCK_CLIENT_IDS.apexRefining,
		agent: "Alex Fischer",
		wasteType: "Neutralization Slurry",
		processMethod: "Thermal treatment",
		volume: "22",
		units: "tons/mo",
		location: "Houston, TX",
		locationId: MOCK_LOCATION_IDS.houston,
		lastUpdated: "11 min ago",
		phase: 1,
		status: "draft",
		lastEdited: "11 min ago",
	},
	{
		id: "DRAFT-02",
		name: "Pyrolysis Residue",
		client: "Precision Chem-Tech",
		clientId: MOCK_CLIENT_IDS.precisionChemTech,
		agent: "Alex Fischer",
		wasteType: "Pyrolysis Residue",
		processMethod: "Mechanical recovery",
		volume: "14",
		units: "tons/mo",
		location: "Baton Rouge, LA",
		locationId: MOCK_LOCATION_IDS.batonRouge,
		lastUpdated: "34 min ago",
		phase: 1,
		status: "draft",
		lastEdited: "34 min ago",
	},
	{
		id: "DRAFT-03",
		name: "Distillation Bottoms",
		client: "Heavy Construct Corp",
		clientId: MOCK_CLIENT_IDS.heavyConstruct,
		agent: "Marta Vega",
		wasteType: "Distillation Bottoms",
		processMethod: "Solvent wash",
		volume: "9",
		units: "tons/mo",
		location: "Tulsa, OK",
		locationId: MOCK_LOCATION_IDS.tulsa,
		lastUpdated: "1 h ago",
		phase: 1,
		status: "draft",
		lastEdited: "1 h ago",
	},
	{
		id: "STR-9923",
		name: "Spent Sulfuric Acid (98%)",
		client: "Apex Refining Co.",
		location: "Corpus Christi, TX",
		agent: "Alex Fischer",
		wasteType: "Spent acid",
		volume: "1,100 gal/mo",
		lastUpdated: "18 days ago",
		phase: 2,
		status: "missing_info",
		reason: "No update in 18 days and missing SDS revision.",
		nextAction: "Call EHS manager and request latest SDS + transport profile.",
		dueDate: "Today · 4:00 PM",
		daysSinceLastActivity: 18,
		priority: "urgent",
		missingFields: ["SDS", "Hazard class", "Container type"],
	},
];

export function getDraftStreams(): StreamRow[] {
	return allStreams.filter((stream) => stream.status === "draft");
}

export function getMissingInfoStreams(): StreamRow[] {
	return allStreams.filter(
		(stream) =>
			stream.status === "missing_info" ||
			stream.status === "blocked" ||
			(stream.daysSinceLastActivity ?? 0) > 7,
	);
}

export const streamDetails: StreamDetail[] = [
	{
		id: "STR-442",
		name: "Inland Petrochemical Mix B",
		client: "BASF Gulf Operations",
		location: "Pasadena, TX",
		status: "missing_info",
		phase: 1,
		wasteType: "Solvent blend",
		volume: "4,600 gal/mo",
		frequency: "Weekly pickup",
		assignedAgent: "Alex Fischer",
		firstLiftTarget: "May 29, 2026",
		regulatoryClass: "Hazardous D001/D002",
		attachments: [
			{
				id: "file-1",
				name: "SDS_v3_2026.pdf",
				type: "SDS",
				date: "May 10, 2026",
				status: "verified",
			},
			{
				id: "file-2",
				name: "COA_Q2_prelim.xlsx",
				type: "COA",
				date: "May 09, 2026",
				status: "pending",
			},
			{
				id: "file-3",
				name: "Client_Request_Email.msg",
				type: "Email",
				date: "May 08, 2026",
				status: "verified",
			},
		],
		timeline: [
			{
				id: "t-1",
				actor: "Alex Fischer",
				actorRole: "agent",
				message: "Uploaded revised SDS and requested lab profile refresh.",
				timestamp: "May 11 · 10:15 AM",
			},
			{
				id: "t-2",
				actor: "Steve Adams",
				actorRole: "admin",
				message:
					"Compliance verified Grade A-4 status. Continue to economic deep dive.",
				timestamp: "May 11 · 02:30 PM",
			},
			{
				id: "t-3",
				actor: "System",
				actorRole: "system",
				message: "Follow-up priority escalated due to missing COA values.",
				timestamp: "May 12 · 08:02 AM",
			},
		],
	},
];

export function getStreamDetail(streamId: string): StreamDetail {
	const selected = streamDetails.find((item) => item.id === streamId);
	if (selected) {
		return selected;
	}

	const fallback = streamDetails[0];
	if (!fallback) {
		throw new Error("Stream details mock data is empty");
	}

	return {
		...fallback,
		id: streamId,
		name: `${fallback.name} (${streamId})`,
	};
}
