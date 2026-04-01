import { redirect } from "next/navigation";

export default async function LegacyOrganizationWorkspaceStreamsRedirect({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await params;
	redirect("/streams");
}
