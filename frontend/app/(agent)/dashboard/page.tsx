"use client";

import {
	DASHBOARD_AI_INSIGHTS_PLACEHOLDERS,
	FieldAgentDashboardHero,
	FieldAgentOfferPipelineSection,
	MissingInformationStreamsSection,
	useFieldAgentDashboardViewModel,
} from "@/components/features/dashboard";
import { AdminDashboardPageContent } from "@/components/features/workspace";
import { useAuth } from "@/lib/contexts";

export default function AgentDashboardPage() {
	const { isOrgAdmin, isSuperAdmin } = useAuth();
	const shouldLoadFieldAgentData = !isOrgAdmin && !isSuperAdmin;

	const {
		missingInformationStreams,
		offerCounts,
		offerFeaturedItems,
		loading,
		error,
	} = useFieldAgentDashboardViewModel({ enabled: shouldLoadFieldAgentData });

	if (isOrgAdmin || isSuperAdmin) {
		return <AdminDashboardPageContent />;
	}

	return (
		<div className="flex flex-col gap-6">
			<FieldAgentDashboardHero insights={DASHBOARD_AI_INSIGHTS_PLACEHOLDERS} />

			<MissingInformationStreamsSection
				streams={missingInformationStreams}
				loading={loading}
				error={error}
			/>

			<FieldAgentOfferPipelineSection
				counts={offerCounts}
				featuredItems={offerFeaturedItems}
				loading={loading}
				error={error}
			/>
		</div>
	);
}
