"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CaptureBar } from "./capture-bar";
import { EvidenceTab } from "./evidence-tab";
import { HistoryTab } from "./history-tab";
import { getPendingReviewCount } from "./mock-data";
import { OverviewTab } from "./overview-tab";
import { StructuredCaptureTab } from "./structured-capture-tab";
import { WorkspaceHeader } from "./workspace-header";

// ── WorkspaceDemo ─────────────────────────────────────────────────────────────
// Orchestrator — lifts selectedPointId so CaptureBar can navigate to brief points.
// Keeps tab state minimal; each tab is a real surface, not a placeholder.

export function WorkspaceDemo() {
	// Lifted here so CaptureBar's mapped chips can select brief points
	const [selectedPointId, setSelectedPointId] = useState<string | null>(
		"solids",
	);

	const handlePointSelect = (id: string) => {
		setSelectedPointId((prev) => (prev === id ? null : id));
	};

	const reviewCount = getPendingReviewCount();
	const primaryAction = reviewCount > 0 ? "review" : "complete";

	return (
		// pb-20 provides breathing room above the fixed CaptureBar
		<div className="pb-20">
			<WorkspaceHeader
				primaryAction={primaryAction}
				reviewCount={reviewCount}
			/>

			<Tabs defaultValue="overview" className="mt-5">
				<TabsList
					className={cn(
						"bg-transparent h-auto p-0 rounded-none gap-0",
						"border-b border-border/60 w-full justify-start",
					)}
				>
					{(
						[
							{ value: "overview", label: "Overview" },
							{ value: "capture", label: "Structured Capture" },
							{ value: "evidence", label: "Evidence" },
							{ value: "history", label: "History" },
						] as const
					).map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							className={cn(
								"bg-transparent rounded-none shadow-none",
								"px-4 py-2 pb-2.5 text-[13px] font-medium",
								"text-muted-foreground border-b-[1.5px] border-transparent",
								"mb-[-1px] tracking-[-0.005em]",
								"hover:text-foreground/80",
								"transition-colors duration-75",
								"data-[state=active]:text-foreground",
								"data-[state=active]:font-semibold",
								"data-[state=active]:border-foreground",
								"data-[state=active]:bg-transparent",
								"data-[state=active]:shadow-none",
							)}
						>
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>

				<TabsContent value="overview" className="mt-0 outline-none">
					<OverviewTab
						selectedPointId={selectedPointId}
						onPointSelect={handlePointSelect}
					/>
				</TabsContent>

				<TabsContent value="capture" className="mt-0 outline-none">
					<StructuredCaptureTab />
				</TabsContent>

				<TabsContent value="evidence" className="mt-0 outline-none">
					<EvidenceTab />
				</TabsContent>

				<TabsContent value="history" className="mt-0 outline-none">
					<HistoryTab />
				</TabsContent>
			</Tabs>

			{/* Fixed ingest dock — onPointSelect wired so mapped chips can navigate */}
			<CaptureBar onPointSelect={handlePointSelect} />
		</div>
	);
}
