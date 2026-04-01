import { redirect } from "next/navigation";

export default async function LegacyOrganizationWorkspaceStreamsRedirect({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	redirect(`/admin/organizations/${id}`);
}
