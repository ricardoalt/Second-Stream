import { redirect } from "next/navigation";

export default async function LegacyOrganizationWorkspaceClientsRedirect({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await params;
	redirect("/clients");
}
