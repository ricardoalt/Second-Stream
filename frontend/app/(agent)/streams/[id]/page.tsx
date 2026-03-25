"use client";

import { useParams } from "next/navigation";
import { StreamDetailPageContent } from "@/components/features/streams/stream-detail-page-content";

export default function StreamDetailPage() {
	const params = useParams<{ id: string }>();
	const streamId = params.id ?? "STR-442";
	return <StreamDetailPageContent id={streamId} />;
}
