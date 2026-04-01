"use client";

import { WorkspaceTeamMembersPageContent } from "@/components/features/workspace";
import { useOrganizationStore } from "@/lib/stores/organization-store";

export default function AdminWorkspaceTeamPage() {
	const selectedOrgId = useOrganizationStore((state) => state.selectedOrgId);

	return (
		<WorkspaceTeamMembersPageContent
			{...(selectedOrgId ? { organizationId: selectedOrgId } : {})}
		/>
	);
}
