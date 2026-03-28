"use client";

import { useParams } from "next/navigation";
import { StreamFilesPageContent } from "@/components/features/streams/stream-files-page-content";

export default function StreamFilesPage() {
	const params = useParams<{ id: string }>();
	const streamId = params.id ?? "STR-442";

	return (
		<StreamFilesPageContent
			projectId={streamId}
			backHref={`/streams/${streamId}`}
			showUploadSection={false}
		/>
	);
}
