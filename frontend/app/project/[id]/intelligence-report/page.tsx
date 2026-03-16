"use client";

import { use } from "react";
import { IntelligenceReportView } from "@/components/features/intelligence-report/intelligence-report-view";
import { getIntelligenceReport } from "@/lib/mocks/intelligence-report-mock";

interface PageProps {
	params: Promise<{ id: string }>;
}

export default function IntelligenceReportPage({ params }: PageProps) {
	const { id: projectId } = use(params);
	// Mock-only route for demo-quality UI. Replace with real discovery/workspace-backed
	// data once those outputs are stable; see docs/plans/2026-03-13-mock-standalone-pages-follow-up.md.
	const report = getIntelligenceReport(projectId);

	return <IntelligenceReportView report={report} />;
}
