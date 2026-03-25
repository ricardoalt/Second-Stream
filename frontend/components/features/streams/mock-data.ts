import type {
	DraftStreamRow,
	FollowUpItem,
	StreamDetail,
	StreamRow,
} from "./types";

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
	},
	{
		id: "STR-993",
		name: "Contaminated Soil",
		client: "Heavy Construct Corp",
		location: "Tulsa, OK",
		agent: "Alex Fischer",
		wasteType: "Solid",
		volume: "250 tons/once",
		lastUpdated: "48 min ago",
		phase: 1,
		status: "draft",
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
		status: "in_review",
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
];

export const draftStreams: DraftStreamRow[] = [
	{
		id: "DRAFT-01",
		materialType: "Neutralization Slurry",
		processMethod: "Thermal treatment",
		volume: "22",
		units: "tons/mo",
		location: "Houston, TX",
		lastEdited: "11 min ago",
	},
	{
		id: "DRAFT-02",
		materialType: "Pyrolysis Residue",
		processMethod: "Mechanical recovery",
		volume: "14",
		units: "tons/mo",
		location: "Baton Rouge, LA",
		lastEdited: "34 min ago",
	},
	{
		id: "DRAFT-03",
		materialType: "Distillation Bottoms",
		processMethod: "Solvent wash",
		volume: "9",
		units: "tons/mo",
		location: "Tulsa, OK",
		lastEdited: "1 h ago",
	},
];

export const followUps: FollowUpItem[] = [
	{
		id: "FU-9923",
		streamName: "Spent Sulfuric Acid (98%)",
		client: "Apex Refining Co.",
		reason: "No update in 18 days and missing SDS revision.",
		nextAction: "Call EHS manager and request latest SDS + transport profile.",
		dueDate: "Today · 4:00 PM",
		daysSinceLastActivity: 18,
		priority: "urgent",
		missingFields: ["SDS", "Hazard class", "Container type"],
	},
	{
		id: "FU-8841",
		streamName: "Chlorinated Solvent Mix",
		client: "Precision Chem-Tech",
		reason: "Lab profile pending after compliance hold.",
		nextAction: "Ping lab partner and attach interim COA in stream workspace.",
		dueDate: "Overdue · Yesterday",
		daysSinceLastActivity: 21,
		priority: "overdue",
		missingFields: ["Lab analysis", "Flash point"],
	},
	{
		id: "FU-1120",
		streamName: "Metal Plating Sludge",
		client: "United Aerospace",
		reason: "Profile draft expired before admin sign-off.",
		nextAction: "Re-submit profile summary and schedule admin review.",
		dueDate: "Tomorrow · 10:00 AM",
		daysSinceLastActivity: 14,
		priority: "upcoming",
		missingFields: ["Admin sign-off", "Generator mandate"],
	},
];

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

	const fallback = streamDetails[0]!;
	return {
		...fallback,
		id: streamId,
		name: `${fallback.name} (${streamId})`,
	};
}
