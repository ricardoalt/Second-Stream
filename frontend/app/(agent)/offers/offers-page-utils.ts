import type { OfferPipelineRecord } from "@/components/features/offers/types";
import { mapProjectFollowUpToOfferStage } from "@/components/features/offers/utils";
import type {
	ManualOfferInitialStatus,
	OfferPipelineResponseDTO,
} from "@/lib/api/offers";

export type ManualOfferFormValues = {
	companyId: string;
	locationId: string;
	title: string;
	initialStatus: ManualOfferInitialStatus;
	file: File | null;
};

export type ManualOfferFormErrors = Partial<
	Record<"companyId" | "locationId" | "title" | "file", string>
>;

type ManualOfferCompanyOption = { id: string; name: string };
type ManualOfferLocationOption = {
	id: string;
	companyId: string;
	name: string;
};

export function validateManualOfferForm(
	values: ManualOfferFormValues,
): ManualOfferFormErrors {
	const errors: ManualOfferFormErrors = {};
	if (values.companyId.trim().length === 0) {
		errors.companyId = "Client is required.";
	}
	if (values.locationId.trim().length === 0) {
		errors.locationId = "Location is required.";
	}
	if (values.title.trim().length === 0) {
		errors.title = "Offer title is required.";
	}
	if (!values.file) {
		errors.file = "Offer document is required.";
	}
	return errors;
}

export function resolveManualOfferCreatePayload(args: {
	values: ManualOfferFormValues;
	companies: ManualOfferCompanyOption[];
	locations: ManualOfferLocationOption[];
}) {
	if (!args.values.file) {
		throw new Error("Offer document is required.");
	}

	const company = args.companies.find(
		(item) => item.id === args.values.companyId,
	);
	if (!company?.name.trim()) {
		throw new Error("Selected client is invalid.");
	}

	const location = args.locations.find(
		(item) =>
			item.id === args.values.locationId &&
			item.companyId === args.values.companyId,
	);
	if (!location?.name.trim()) {
		throw new Error("Selected location is invalid.");
	}

	return {
		client: company.name.trim(),
		location: location.name.trim(),
		title: args.values.title.trim(),
		initialStatus: args.values.initialStatus,
		file: args.values.file,
	};
}

function mapPipelineResponseToOffers(
	response: OfferPipelineResponseDTO,
): OfferPipelineRecord[] {
	return response.items.map((item) => ({
		offerId: item.offerId,
		projectId: item.projectId,
		reference: item.latestProposalVersion ?? "No version",
		clientName: item.companyLabel ?? "Unknown client",
		streamName: item.streamName,
		stage: mapProjectFollowUpToOfferStage(item.proposalFollowUpState),
		valueUsd: item.valueUsd ?? 0,
		updatedAt: formatDate(item.lastActivityAt),
	}));
}

export async function createManualOfferAndRefreshPipeline(args: {
	values: ManualOfferFormValues;
	companies: ManualOfferCompanyOption[];
	locations: ManualOfferLocationOption[];
	createManualOffer: (values: {
		client: string;
		location: string;
		title: string;
		initialStatus: ManualOfferInitialStatus;
		file: File;
	}) => Promise<unknown>;
	invalidateCache: (key: string) => void;
	revalidatePipeline: () => Promise<OfferPipelineResponseDTO>;
}): Promise<OfferPipelineRecord[]> {
	const payload = resolveManualOfferCreatePayload({
		values: args.values,
		companies: args.companies,
		locations: args.locations,
	});

	await args.createManualOffer(payload);

	args.invalidateCache(OFFERS_PIPELINE_CACHE_KEY);
	const refreshed = await args.revalidatePipeline();
	return mapPipelineResponseToOffers(refreshed);
}

export const OFFERS_PIPELINE_CACHE_KEY = "offers:pipeline";

function formatDate(value: string) {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return "N/A";
	}
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(parsed);
}

export { mapPipelineResponseToOffers };
