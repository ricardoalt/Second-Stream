"use client";

import { toast } from "sonner";
import { getModalWidthClass } from "@/components/patterns/dialogs/modal";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import { OrgSelectorContent } from "./org-selector-content";

/**
 * Modal for switching organization context.
 * Used when super admin clicks the org badge in navbar to change orgs.
 *
 * This is different from OrgRequiredScreen:
 * - OrgRequiredScreen: Full-page blocking UI when no org is selected
 * - OrgSelectionModal: Dismissible modal for switching between orgs
 */
export function OrgSelectionModal() {
	const {
		organizations,
		selectedOrgId,
		isOrgSwitchModalOpen,
		selectOrganization,
		closeOrgSwitchModal,
	} = useOrganizationStore();

	const handleSelect = (orgId: string | null) => {
		if (orgId) {
			selectOrganization(orgId);
			const org = organizations.find((o) => o.id === orgId);
			if (org) {
				toast.success(`Viewing data for ${org.name}`);
			}
			closeOrgSwitchModal();
		}
	};

	return (
		<Dialog
			open={isOrgSwitchModalOpen}
			onOpenChange={(open) => !open && closeOrgSwitchModal()}
		>
			<DialogContent className={`${getModalWidthClass("xs")} p-0`}>
				<DialogHeader className="px-6 pt-6 pb-2">
					<DialogTitle>Switch Organization</DialogTitle>
					<DialogDescription>
						Select a different organization to view its data.
					</DialogDescription>
				</DialogHeader>
				<div className="px-2 pb-2">
					<OrgSelectorContent
						organizations={organizations}
						selectedOrgId={selectedOrgId}
						onSelect={handleSelect}
						showAllOrgsOption={false}
						autoFocus
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
