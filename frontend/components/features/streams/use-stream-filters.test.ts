import { describe, expect, it } from "bun:test";
import type { StreamRow } from "@/components/features/streams/types";
import { applySharedStreamFilter } from "@/components/features/streams/use-stream-filters";

const STREAMS: StreamRow[] = [
	{
		id: "s-1",
		name: "Spent Solvent",
		client: "Acme",
		location: "Houston",
		agent: "Jane",
		wasteType: "Solvent",
		volume: "100 gal/week",
		lastUpdated: "2026-01-01",
		status: "active",
	},
	{
		id: "s-2",
		name: "Waste Oil",
		client: "Acme",
		location: "Austin",
		agent: "Jane",
		wasteType: "Oil",
		volume: "70 gal/week",
		lastUpdated: "2026-01-01",
		status: "draft",
	},
	{
		id: "s-3",
		name: "Metal Sludge",
		client: "Globex",
		location: "Dallas",
		agent: "John",
		wasteType: "Sludge",
		volume: "25 tons/month",
		lastUpdated: "2026-01-01",
		status: "missing_info",
	},
];

describe("applySharedStreamFilter", () => {
	it("preserves active-tab status filtering", () => {
		const result = applySharedStreamFilter(
			STREAMS,
			{
				search: "acme",
				clientFilter: "Acme",
				statusFilter: "active",
			},
			{ includeStatus: true },
		);

		expect(result.map((item) => item.id)).toEqual(["s-1"]);
	});

	it("ignores status for drafts and follow-ups", () => {
		const result = applySharedStreamFilter(
			STREAMS,
			{
				search: "acme",
				clientFilter: "Acme",
				statusFilter: "blocked",
			},
			{ includeStatus: false },
		);

		expect(result.map((item) => item.id)).toEqual(["s-1", "s-2"]);
	});
});
