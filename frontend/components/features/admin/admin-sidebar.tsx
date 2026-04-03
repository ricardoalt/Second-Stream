"use client";

import {
	Building2,
	FileText,
	Home,
	Layers,
	Menu,
	MessageSquare,
	Settings,
	ShieldCheck,
	Star,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/contexts";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import { cn } from "@/lib/utils";

const PLATFORM_NAV_ITEMS = [
	{
		href: "/admin/organizations",
		label: "Organizations",
		icon: Building2,
		description: "Manage tenants",
	},
	{
		href: "/admin/users",
		label: "Platform Admins",
		icon: ShieldCheck,
		description: "Superuser accounts",
	},
	{
		href: "/admin/feedback",
		label: "User Feedback",
		icon: MessageSquare,
		description: "Review user feedback",
	},
	{
		href: "/admin/proposal-ratings",
		label: "Proposal Ratings",
		icon: Star,
		description: "Audit proposal quality",
	},
];

const WORKSPACE_NAV_ITEMS = [
	{
		href: "/admin",
		label: "Dashboard",
		icon: Home,
		description: "Supervision overview",
	},
	{
		href: "/admin/team",
		label: "Team Management",
		icon: Users,
		description: "Manage workspace members",
	},
	{
		href: "/admin/streams",
		label: "Streams",
		icon: Layers,
		description: "Track stream execution",
	},
	{
		href: "/admin/clients",
		label: "Client Portfolio",
		icon: Building2,
		description: "View client accounts",
	},
	{
		href: "/admin/offers",
		label: "Offers",
		icon: FileText,
		description: "Review active offers",
	},
];

function NavItem({
	href,
	label,
	description,
	icon: Icon,
	isActive,
	onClick,
}: {
	href: string;
	label: string;
	description: string;
	icon: typeof Building2;
	isActive: boolean;
	onClick?: (() => void) | undefined;
}) {
	return (
		<Link
			href={href}
			{...(onClick ? { onClick } : {})}
			className={cn(
				"group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200",
				isActive
					? "bg-primary/10 text-primary"
					: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
			)}
		>
			<div
				className={cn(
					"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
					isActive
						? "bg-primary/20 text-primary shadow-sm"
						: "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground",
				)}
			>
				<Icon className="h-4 w-4" />
			</div>
			<div className="flex-1 min-w-0">
				<div className={cn("font-medium", isActive && "text-primary")}>
					{label}
				</div>
				<div className="text-xs text-muted-foreground truncate">
					{description}
				</div>
			</div>
			{isActive && (
				<div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
			)}
		</Link>
	);
}

function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
	const pathname = usePathname();
	const selectedOrgId = useOrganizationStore((state) => state.selectedOrgId);
	const { isSuperAdmin, isOrgAdmin } = useAuth();
	const showWorkspaceNav = isOrgAdmin || Boolean(selectedOrgId);

	return (
		<div className="flex flex-col h-full">
			<div className="p-5 border-b border-border/50">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
						<Settings className="h-5 w-5 text-primary" />
					</div>
					<div>
						<h2 className="font-semibold text-base">Admin Console</h2>
						<p className="text-xs text-muted-foreground">
							Manage organizations and users
						</p>
					</div>
				</div>
			</div>

			<nav className="flex-1 p-4 space-y-1.5">
				{showWorkspaceNav ? (
					<>
						<p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
							Workspace
						</p>
						{WORKSPACE_NAV_ITEMS.map((item) => (
							<NavItem
								key={item.href}
								href={item.href}
								label={item.label}
								description={item.description}
								icon={item.icon}
								isActive={
									pathname === item.href ||
									(item.href !== "/admin" && pathname.startsWith(item.href))
								}
								onClick={onItemClick}
							/>
						))}
					</>
				) : null}

				{isSuperAdmin ? (
					<>
						<p className="px-3 pb-2 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
							Platform Controls
						</p>
						{PLATFORM_NAV_ITEMS.map((item) => (
							<NavItem
								key={item.href}
								href={item.href}
								label={item.label}
								description={item.description}
								icon={item.icon}
								isActive={pathname.startsWith(item.href)}
								onClick={onItemClick}
							/>
						))}
					</>
				) : null}
			</nav>

			<div className="border-t border-border/50 p-4">
				<p className="text-xs text-muted-foreground/60 text-center">
					SecondStream Platform v1.0
				</p>
			</div>
		</div>
	);
}

export function AdminSidebar() {
	return (
		<aside className="hidden md:flex w-64 flex-col border-r border-border/50 bg-sidebar">
			<SidebarContent />
		</aside>
	);
}

export function AdminMobileNav() {
	const [open, setOpen] = useState(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="md:hidden"
					aria-label="Open navigation menu"
				>
					<Menu className="h-5 w-5" />
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-72 p-0">
				<SheetHeader className="sr-only">
					<SheetTitle>Admin Navigation</SheetTitle>
				</SheetHeader>
				<SidebarContent onItemClick={() => setOpen(false)} />
			</SheetContent>
		</Sheet>
	);
}
