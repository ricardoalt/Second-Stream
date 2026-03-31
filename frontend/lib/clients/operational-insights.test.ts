import { describe, expect, it } from "bun:test";
import type { StreamRow } from "@/components/features/streams/types";
import {
	deriveOperationalInsights,
	type OperationalInsights,
} from "@/lib/clients/operational-insights";
import type { ClientProfile } from "@/lib/mappers/company-client";
import type { LocationSummary } from "@/lib/types/company";

const baseLocation = (
	overrides?: Partial<LocationSummary>,
): LocationSummary => ({
	id: overrides?.id ?? "location-1",
	companyId: overrides?.companyId ?? "company-1",
	name: overrides?.name ?? "Plant A",
	city: overrides?.city ?? "Austin",
	state: overrides?.state ?? "TX",
	address: overrides?.address ?? "100 Main St",
	addressType: overrides?.addressType ?? "headquarters",
	zipCode: overrides?.zipCode ?? "78701",
	fullAddress: overrides?.fullAddress ?? "100 Main St, Austin, TX 78701",
	projectCount: overrides?.projectCount ?? 0,
	createdAt: overrides?.createdAt ?? "2026-03-01T00:00:00.000Z",
	updatedAt: overrides?.updatedAt ?? "2026-03-02T00:00:00.000Z",
	createdByUserId: overrides?.createdByUserId,
	archivedAt: overrides?.archivedAt,
	archivedByUserId: overrides?.archivedByUserId,
	archivedByParentId: overrides?.archivedByParentId,
});

const baseProfile = (overrides?: Partial<ClientProfile>): ClientProfile => ({
	id: overrides?.id ?? "company-1",
	name: overrides?.name ?? "Northstar",
	industry: overrides?.industry ?? "Chemicals",
	customerType: overrides?.customerType ?? "generator",
	accountStatus: overrides?.accountStatus ?? "prospect",
	sector: overrides?.sector ?? "chemicals_pharmaceuticals",
	subsector: overrides?.subsector ?? "chemical_manufacturing",
	notes: overrides?.notes ?? "",
	locationCount: overrides?.locationCount ?? 2,
	locations: overrides?.locations ?? [
		baseLocation({ id: "location-1", projectCount: 1 }),
		baseLocation({ id: "location-2", projectCount: 0 }),
	],
	contacts: overrides?.contacts ?? [],
	primaryContact: overrides?.primaryContact ?? null,
	archivedAt: overrides?.archivedAt ?? null,
	createdAt: overrides?.createdAt ?? "2026-03-01T00:00:00.000Z",
	updatedAt: overrides?.updatedAt ?? "2026-03-02T00:00:00.000Z",
});

const baseStream = (overrides?: Partial<StreamRow>): StreamRow => ({
	id: overrides?.id ?? "stream-1",
	name: overrides?.name ?? "Paint sludge",
	client: overrides?.client ?? "Northstar",
	clientId: overrides?.clientId ?? "company-1",
	location: overrides?.location ?? "Plant A",
	agent: overrides?.agent ?? "Avery",
	wasteType: overrides?.wasteType ?? "Hazardous",
	volume: overrides?.volume ?? "100 gal/mo",
	lastUpdated: overrides?.lastUpdated ?? "2026-03-10",
	status: overrides?.status ?? "active",
});

function derive(
	input?: Partial<{
		profile: ClientProfile;
		companyAllStreams: StreamRow[];
		companyDraftStreams: StreamRow[];
		companyMissingInfoStreams: StreamRow[];
	}>,
): OperationalInsights {
	return deriveOperationalInsights({
		profile: input?.profile ?? baseProfile(),
		companyAllStreams: input?.companyAllStreams ?? [
			baseStream({ id: "stream-active", status: "active" }),
			baseStream({ id: "stream-ready", status: "ready_for_offer" }),
		],
		companyDraftStreams: input?.companyDraftStreams ?? [
			baseStream({ status: "draft" }),
		],
		companyMissingInfoStreams: input?.companyMissingInfoStreams ?? [
			baseStream({ id: "stream-missing", status: "missing_info" }),
		],
	});
}

describe("deriveOperationalInsights", () => {
	it("derives stream and facility summary indicators from real data", () => {
		const insights = derive();

		expect(insights.totalTrackedStreams).toBe(3);
		expect(insights.activeStreamsCount).toBe(1);
		expect(insights.readyForOfferCount).toBe(1);
		expect(insights.missingInfoStreamsCount).toBe(1);
		expect(insights.draftStreamsCount).toBe(1);
		expect(insights.facilitiesWithProjects).toBe(1);
		expect(insights.totalFacilities).toBe(2);
		expect(insights.facilityCoverage).toBe(50);
		expect(insights.dataCompleteness).toBe(67);
	});

	it("builds alerts and next steps with business-priority ordering", () => {
		const insights = derive();

		expect(insights.realAlerts.map((alert) => alert.id)).toEqual([
			"missing-info",
			"draft-streams",
			"missing-primary-contact",
		]);
		expect(insights.nextSteps).toEqual([
			"Resolve missing data for 1 stream in the follow-up board.",
			"Review and confirm 1 draft stream.",
			"Assign a primary contact so outreach and approvals have a clear owner.",
		]);
		expect(insights.reviewAction).toEqual({
			tab: "missing-info",
			label: "Review Missing Information",
		});
	});

	it("respects explicit account notes over generated narrative", () => {
		const insights = derive({
			profile: baseProfile({
				notes: "Strategic account with executive sponsor",
				primaryContact: {
					id: "contact-1",
					name: "Avery Stone",
					email: "avery@example.com",
					phone: "+1 555 000 1234",
					title: "Plant Manager",
				},
			}),
		});

		expect(insights.accountNarrative).toBe(
			"Strategic account with executive sponsor",
		);
		expect(insights.realAlerts.map((alert) => alert.id)).toEqual([
			"missing-info",
			"draft-streams",
		]);
	});

	it("falls back to healthy-state defaults when no blockers exist", () => {
		const insights = derive({
			profile: baseProfile({
				primaryContact: {
					id: "contact-1",
					name: "Avery Stone",
					email: "avery@example.com",
					phone: "+1 555 000 1234",
					title: "Plant Manager",
				},
				locations: [baseLocation({ id: "location-1", projectCount: 2 })],
			}),
			companyAllStreams: [baseStream({ status: "active" })],
			companyDraftStreams: [],
			companyMissingInfoStreams: [],
		});

		expect(insights.realAlerts).toEqual([]);
		expect(insights.nextSteps).toEqual([]);
		expect(insights.reviewAction).toEqual({
			tab: "all",
			label: "Review All Streams",
		});
		expect(insights.accountNarrative).toContain(
			"No streams are currently blocked by missing information.",
		);
	});

	it("maps account status with archived precedence", () => {
		const archivedInsights = derive({
			profile: baseProfile({
				accountStatus: "active",
				archivedAt: "2026-03-01T00:00:00.000Z",
			}),
		});

		expect(archivedInsights.accountStatus).toEqual({
			label: "Archived",
			variant: "outline",
		});
	});
});
