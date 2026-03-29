"use client";

import {
	Building2,
	ChevronLeft,
	ChevronRight,
	FileText,
	Home,
	Layers,
	Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DSRLogo } from "@/components/shared/branding/dsr-logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
	userName?: string;
	userEmail?: string;
};

const navItems = [
	{ href: "/dashboard", label: "Dashboard", icon: Home },
	{ href: "/streams", label: "Streams", icon: Layers },
	{ href: "/clients", label: "Clients", icon: Building2 },
	{ href: "/offers", label: "Offers", icon: FileText },
];

function getInitials(name?: string): string {
	if (!name) return "AG";
	const parts = name.split(" ").filter(Boolean);
	if (parts.length === 0) return "AG";
	const first = parts[0];
	const second = parts[1];
	if (!first) return "AG";
	if (parts.length === 1) return first.slice(0, 2).toUpperCase();
	return `${first[0]}${second?.[0] ?? ""}`.toUpperCase();
}

export function AppSidebar({ userName, userEmail }: AppSidebarProps) {
	const pathname = usePathname();
	const [collapsed, setCollapsed] = useState(false);

	return (
		<aside
			className={cn(
				"sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar/95 px-3 py-4 backdrop-blur md:flex",
				collapsed ? "w-[72px]" : "w-60",
			)}
		>
			<div className="flex items-center justify-between">
				<Link
					href="/dashboard"
					className={cn(
						"inline-flex items-center rounded-md",
						collapsed && "mx-auto",
					)}
				>
					{collapsed ? (
						<div className="size-8 rounded-md bg-primary" />
					) : (
						<DSRLogo width={160} height={60} />
					)}
				</Link>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => setCollapsed((prev) => !prev)}
					aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
					className={cn(collapsed && "hidden")}
				>
					<ChevronLeft />
				</Button>
			</div>

			{collapsed && (
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => setCollapsed(false)}
					aria-label="Expand sidebar"
					className="mx-auto mt-3"
				>
					<ChevronRight />
				</Button>
			)}

			<nav className="mt-6 flex flex-col gap-2">
				{navItems.map((item) => {
					const Icon = item.icon;
					const active =
						pathname === item.href ||
						(item.href !== "/dashboard" && pathname.startsWith(item.href));

					return (
						<div key={item.href} className="flex flex-col gap-1">
							<Link
								href={item.href}
								className={cn(
									"flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
									collapsed && "justify-center px-0",
									active
										? "border-l-[3px] border-l-primary bg-sidebar-accent text-primary"
										: "border-l-[3px] border-l-transparent text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
								)}
							>
								<Icon className="shrink-0" />
								{!collapsed && <span>{item.label}</span>}
							</Link>
						</div>
					);
				})}
			</nav>

			<div className="mt-auto flex flex-col gap-3">
				<Link
					href="/settings"
					className={cn(
						"flex items-center rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
						collapsed && "justify-center px-0",
					)}
				>
					<Settings className="shrink-0" />
					{!collapsed && <span>Settings</span>}
				</Link>

				<div
					className={cn(
						"flex items-center gap-2 rounded-md bg-sidebar-accent/50 p-2",
						collapsed && "justify-center p-1",
					)}
				>
					<Avatar className="size-8">
						<AvatarFallback>{getInitials(userName)}</AvatarFallback>
					</Avatar>
					{!collapsed && (
						<div className="min-w-0">
							<p className="truncate text-xs font-medium text-foreground">
								{userName || "Field Agent"}
							</p>
							<p className="truncate text-[11px] text-muted-foreground">
								{userEmail || "agent@secondstream.ai"}
							</p>
						</div>
					)}
				</div>
			</div>
		</aside>
	);
}
