"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import { cn } from "@/lib/utils";

const WORKSPACE_TABS = [
	{ key: "overview", label: "Dashboard", path: "" },
	{ key: "team", label: "Team Management", path: "team" },
	{ key: "streams", label: "Streams", path: "streams" },
	{ key: "clients", label: "Client Portfolio", path: "clients" },
	{ key: "offers", label: "Offers", path: "offers" },
];

export default function AdminWorkspaceLayout({
	children,
}: {
	children: ReactNode;
}) {
	const pathname = usePathname();
	const selectedOrgId = useOrganizationStore((state) => state.selectedOrgId);

	if (!selectedOrgId) {
		return (
			<Alert>
				<AlertTitle>Select an organization first</AlertTitle>
				<AlertDescription className="mt-2 space-y-3">
					<p>Workspace views are scoped by the global organization selector.</p>
					<Button asChild size="sm">
						<Link href="/admin/organizations">
							Open Organization Management
						</Link>
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="space-y-4">
			<div className="border-b border-border/50 pb-3">
				<h2 className="text-lg font-semibold text-foreground">Workspace</h2>
				<p className="text-xs text-muted-foreground">
					Organization context: {selectedOrgId}
				</p>
			</div>

			<nav className="flex flex-wrap gap-2">
				{WORKSPACE_TABS.map((tab) => {
					const href = tab.path
						? `/admin/workspace/${tab.path}`
						: "/admin/workspace";
					const isActive =
						pathname === href ||
						(tab.path !== "" && pathname.startsWith(`${href}/`));

					return (
						<Link
							key={tab.key}
							href={href}
							className={cn(
								"rounded-md border px-3 py-1.5 text-sm transition-colors",
								isActive
									? "border-primary/40 bg-primary/10 text-primary"
									: "border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
							)}
						>
							{tab.label}
						</Link>
					);
				})}
			</nav>

			{children}
		</div>
	);
}
