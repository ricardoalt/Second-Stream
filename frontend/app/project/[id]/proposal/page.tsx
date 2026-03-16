"use client";

import { use } from "react";
import { ProposalDetailView } from "@/components/features/proposal-detail/proposal-detail-view";
import { getProposalDetail } from "@/lib/mocks/proposal-detail-mock";

interface PageProps {
	params: Promise<{ id: string }>;
}

export default function ProposalDetailPage({ params }: PageProps) {
	const { id: projectId } = use(params);
	// Mock-only route for demo-quality UI. Replace with real discovery/workspace-backed
	// data once those outputs are stable; see docs/plans/2026-03-13-mock-standalone-pages-follow-up.md.
	const data = getProposalDetail(projectId);

	return <ProposalDetailView data={data} />;
}
