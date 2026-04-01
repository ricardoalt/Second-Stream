import { redirect } from "next/navigation";

export default async function LegacyOrganizationWorkspaceTeamRedirect({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	redirect(`/admin/organizations/${id}`);
}
