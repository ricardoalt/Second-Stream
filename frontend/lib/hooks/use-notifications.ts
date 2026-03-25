import { useMemo } from "react";
import { DASHBOARD_THRESHOLDS } from "@/lib/project-status";
import type { ProjectSummary } from "@/lib/project-types";
import { routes } from "@/lib/routes";
import { useProjectLoading, useProjects } from "@/lib/stores/project-store";

export interface GroupedNotification {
	id: string;
	type: "action" | "alert";
	priority: "high" | "medium";
	title: string;
	projects: ProjectSummary[];
	getRoute: (projectId: string) => string;
	actionLabel: string;
}

export function useNotifications() {
	const projects = useProjects();
	const isLoading = useProjectLoading();

	const notifications = useMemo(() => {
		const alerts: GroupedNotification[] = [];

		// HIGH: Projects ready for proposal generation (>= 70% complete)
		const readyForProposal = projects.filter(
			(p) =>
				p.status === "In Preparation" &&
				p.progress >= DASHBOARD_THRESHOLDS.readyForProposalProgress,
		);
		if (readyForProposal.length > 0) {
			alerts.push({
				id: "ready-for-proposal",
				type: "action",
				priority: "high",
				title:
					readyForProposal.length === 1
						? "Ready to generate proposal"
						: `${readyForProposal.length} ready to generate proposal`,
				projects: readyForProposal,
				getRoute: (id) => routes.streams.detail(id),
				actionLabel: "Generate",
			});
		}

		// HIGH: Recently completed proposals (status = "Proposal Ready", updated in last 7 days)
		const recentlyCompleted = projects.filter((p) => {
			const daysSinceUpdate = Math.floor(
				(Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
			);
			return p.status === "Proposal Ready" && daysSinceUpdate <= 7;
		});
		if (recentlyCompleted.length > 0) {
			alerts.push({
				id: "proposal-completed",
				type: "action",
				priority: "high",
				title:
					recentlyCompleted.length === 1
						? "Proposal completed"
						: `${recentlyCompleted.length} proposals completed`,
				projects: recentlyCompleted,
				getRoute: (id) => routes.streams.detail(id),
				actionLabel: "Review",
			});
		}

		// MEDIUM: Stalled projects (no updates > 7 days)
		const stalledProjects = projects.filter((p) => {
			const daysSinceUpdate = Math.floor(
				(Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
			);
			return (
				p.status === "In Preparation" &&
				daysSinceUpdate > DASHBOARD_THRESHOLDS.stalledDaysWithoutUpdate
			);
		});
		if (stalledProjects.length > 0) {
			alerts.push({
				id: "stalled",
				type: "alert",
				priority: "medium",
				title:
					stalledProjects.length === 1
						? "Waste stream inactive"
						: `${stalledProjects.length} waste streams inactive`,
				projects: stalledProjects,
				getRoute: (id) => routes.streams.detail(id),
				actionLabel: "Resume",
			});
		}

		return alerts;
	}, [projects]);

	const actionCount = notifications.filter((n) => n.type === "action").length;
	const totalCount = notifications.reduce(
		(acc, n) => acc + n.projects.length,
		0,
	);

	return {
		notifications,
		actionCount,
		totalCount,
		hasNotifications: notifications.length > 0,
		isLoading,
	};
}
