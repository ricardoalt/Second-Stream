import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { OfferDetailDTO } from "@/lib/api/offers";
import { OfferDetailPrimarySurface } from "./offer-detail-primary-surface";

const detailWithInsights: OfferDetailDTO = {
	offerId: "offer-442",
	projectId: "project-442",
	sourceType: "stream",
	contextCard: {
		title: "Stream snapshot",
		description: "Workspace baseline currently driving Offer insights.",
		fields: [
			{ label: "Material type", value: "Plastic film" },
			{ label: "Material name", value: "LDPE trim" },
			{ label: "Composition", value: "95% LDPE" },
			{ label: "Volume", value: "12 tons/month" },
			{ label: "Frequency", value: "Daily" },
		],
	},
	streamSnapshot: {
		materialType: "Plastic film",
		materialName: "LDPE trim",
		composition: "95% LDPE",
		volume: "12 tons/month",
		frequency: "Daily",
	},
	followUpState: "waiting_to_send",
	insights: {
		summary: "Validated stream summary",
		keyPoints: ["Consistent monthly volume"],
		risks: ["Moisture during transport"],
		recommendations: ["Use covered containers"],
		freshness: {
			generatedAt: "2026-04-03T00:00:00.000Z",
			sourceUpdatedAt: "2026-04-02T00:00:00.000Z",
			isStale: false,
		},
	},
	offerDocument: {
		fileId: "file-1",
		filename: "offer.pdf",
		mimeType: "application/pdf",
		fileSize: 1024,
		uploadedAt: "2026-04-03T00:00:00.000Z",
	},
};

describe("offer detail primary surface", () => {
	it("renders stream snapshot + insights + follow-up + offer document and matches snapshot", () => {
		const markup = renderToStaticMarkup(
			<OfferDetailPrimarySurface
				detail={detailWithInsights}
				nextTransitions={["waiting_response"]}
				isRefreshing={false}
				isUploading={false}
				isTransitioning={false}
				onRefreshInsights={() => {}}
				onUploadClick={() => {}}
				onTransition={() => {}}
				onDownload={() => {}}
				refreshError={null}
				uploadError={null}
				transitionError={null}
			/>,
		);

		expect(markup).toContain("Stream snapshot");
		expect(markup).toContain("Offer insights");
		expect(markup).toContain("Follow-up actions");
		expect(markup).toContain("Offer document");
		expect(markup).not.toContain("Quick actions");
		expect(markup).not.toContain("Market intelligence");
		expect(markup).not.toContain("Admin communication");
		expect(markup).toMatchSnapshot();
	});

	it("renders document + insights empty states when detail has none", () => {
		const markup = renderToStaticMarkup(
			<OfferDetailPrimarySurface
				detail={{ ...detailWithInsights, insights: null, offerDocument: null }}
				nextTransitions={[]}
				isRefreshing={false}
				isUploading={false}
				isTransitioning={false}
				onRefreshInsights={() => {}}
				onUploadClick={() => {}}
				onTransition={() => {}}
				onDownload={() => {}}
				refreshError={null}
				uploadError={null}
				transitionError={null}
			/>,
		);

		expect(markup).toContain("No Offer insights yet");
		expect(markup).toContain("No Offer document uploaded yet.");
	});

	it("renders manual offer context card when sourceType is manual", () => {
		const markup = renderToStaticMarkup(
			<OfferDetailPrimarySurface
				detail={{
					...detailWithInsights,
					sourceType: "manual",
					projectId: null,
					contextCard: {
						title: "Offer context",
						description: null,
						fields: [
							{ label: "Client", value: "Acme" },
							{ label: "Location", value: "Plant 1" },
							{ label: "Offer title", value: "Manual offer" },
						],
					},
				}}
				nextTransitions={[]}
				isRefreshing={false}
				isUploading={false}
				isTransitioning={false}
				onRefreshInsights={() => {}}
				onUploadClick={() => {}}
				onTransition={() => {}}
				onDownload={() => {}}
				refreshError={null}
				uploadError={null}
				transitionError={null}
			/>,
		);

		expect(markup).toContain("Offer context");
		expect(markup).toContain("Client");
		expect(markup).toContain("Plant 1");
	});
});
