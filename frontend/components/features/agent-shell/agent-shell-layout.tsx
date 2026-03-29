"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/features/agent-shell/app-sidebar";
import { TopBar } from "@/components/features/agent-shell/top-bar";
import { DiscoveryWizardProvider } from "@/components/features/discovery/discovery-wizard-provider";
import { useAuth } from "@/lib/contexts";

type AgentShellLayoutProps = {
	children: ReactNode;
};

export function AgentShellLayout({ children }: AgentShellLayoutProps) {
	const { user, logout } = useAuth();
	const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
	const userEmail = user?.email || "";

	return (
		<DiscoveryWizardProvider>
			<div className="flex min-h-screen bg-surface-container">
				<AppSidebar userName={fullName} userEmail={userEmail} />
				<div className="flex min-w-0 flex-1 flex-col">
					<TopBar user={user} onLogout={logout} />
					<main id="main-content" className="flex-1 overflow-y-auto p-6">
						<div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
							{children}
						</div>
					</main>
				</div>
			</div>
		</DiscoveryWizardProvider>
	);
}
