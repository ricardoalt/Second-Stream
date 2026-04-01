"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSuperAdminEntryPath } from "@/lib/routing/workspace-guards";
import { useOrganizationStore } from "@/lib/stores/organization-store";

export default function AdminPage() {
	const router = useRouter();
	const selectedOrgId = useOrganizationStore((state) => state.selectedOrgId);

	useEffect(() => {
		router.replace(getSuperAdminEntryPath(selectedOrgId));
	}, [router, selectedOrgId]);

	return null;
}
