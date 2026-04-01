import { redirect } from "next/navigation";

export default async function LegacyOrganizationWorkspaceClientsRedirect({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	redirect(`/admin/organizations/${id}`);
}
