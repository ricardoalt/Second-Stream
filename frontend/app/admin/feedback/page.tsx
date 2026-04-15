"use client";

import { AdminFeedbackManagementPanel } from "@/components/features/admin/feedback";
import { PageHeader, PageShell } from "@/components/patterns";
import { FadeIn } from "@/components/patterns/animations/motion-components";
import { useOrganizationStore } from "@/lib/stores/organization-store";

export default function AdminFeedbackPage() {
	const { selectedOrgId } = useOrganizationStore();

	if (!selectedOrgId) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="flex flex-col gap-2 text-center">
					<p className="text-muted-foreground">
						Select an organization to view feedback
					</p>
				</div>
			</div>
		);
	}

	return (
		<PageShell>
			<FadeIn direction="up">
				<PageHeader
					title="User Feedback"
					subtitle="Review and manage user feedback"
				/>
			</FadeIn>

			<AdminFeedbackManagementPanel
				organizationId={selectedOrgId}
				title="User Feedback"
				description="Review and manage user feedback"
				variant="full"
				limit={100}
				showStats
				allowDelete
			/>
		</PageShell>
	);
}
