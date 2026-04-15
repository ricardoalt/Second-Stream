"use client";

import { AdminFeedbackManagementPanel } from "@/components/features/admin/feedback";

interface OrganizationFeedbackPanelProps {
	orgId: string;
	orgName: string;
}

export function OrganizationFeedbackPanel({
	orgId,
	orgName,
}: OrganizationFeedbackPanelProps) {
	return (
		<AdminFeedbackManagementPanel
			organizationId={orgId}
			title="Organization Feedback"
			description={`Recent feedback submitted by members of ${orgName}`}
			variant="compact"
			limit={50}
			showStats
			allowDelete={false}
			fullViewHref="/admin/feedback"
			fullViewLabel="Open full manager"
		/>
	);
}
