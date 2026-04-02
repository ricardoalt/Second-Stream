"use client";

import { useParams } from "next/navigation";
import { AgentDetailPageContent } from "@/components/features/workspace";

export default function SettingsTeamMemberPage() {
	const params = useParams<{ userId: string }>();
	const userId = params.userId ?? "";

	return <AgentDetailPageContent userId={userId} />;
}
