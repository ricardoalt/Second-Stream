import { redirect } from "next/navigation";

export default async function LegacyOrganizationWorkspaceOffersRedirect({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await params;
	redirect("/offers");
}
