import { redirect } from "next/navigation";

export default async function LegacyOrganizationWorkspaceTeamRedirect({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await params;
	redirect("/settings/team");
}
