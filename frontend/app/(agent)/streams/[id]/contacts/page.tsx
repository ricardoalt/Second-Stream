"use client";

import { useParams } from "next/navigation";
import { StreamContactsPageContent } from "@/components/features/streams/stream-contacts-page-content";

export default function StreamContactsPage() {
	const params = useParams<{ id: string }>();
	const streamId = params.id ?? "STR-442";

	return (
		<StreamContactsPageContent
			projectId={streamId}
			backHref={`/streams/${streamId}`}
		/>
	);
}
