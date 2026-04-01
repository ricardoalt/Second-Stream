"use client";

import { Building2, FileText, Home, Layers, Menu, Users } from "lucide-react";
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
import { cn } from "@/lib/utils";

const ORG_ADMIN_NAV_ITEMS = [
	{ href: "/org-admin", label: "Dashboard", icon: Home },
	{ href: "/org-admin/team", label: "Team Members", icon: Users },
	{ href: "/org-admin/streams", label: "Streams", icon: Layers },
	{ href: "/org-admin/clients", label: "Client Portfolio", icon: Building2 },
	{ href: "/org-admin/offers", label: "Offers", icon: FileText },
];

function OrgAdminNavContent({ onItemClick }: { onItemClick?: () => void }) {
	const pathname = usePathname();

	return (
		<div className="flex h-full flex-col">
			<div className="border-b border-border/50 p-5">
				<h2 className="text-base font-semibold">Organization Workspace</h2>
				<p className="text-xs text-muted-foreground">Org admin tools</p>
			</div>
			<nav className="flex-1 space-y-1.5 p-4">
				{ORG_ADMIN_NAV_ITEMS.map((item) => {
					const Icon = item.icon;
					const isActive =
						pathname === item.href ||
						(item.href !== "/org-admin" && pathname.startsWith(item.href));

					return (
						<Link
							key={item.href}
							href={item.href}
							{...(onItemClick ? { onClick: onItemClick } : {})}
							className={cn(
								"group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200",
								isActive
									? "bg-primary/10 text-primary"
									: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
							)}
						>
							<Icon className="h-4 w-4" />
							<span className="font-medium">{item.label}</span>
						</Link>
					);
				})}
			</nav>
		</div>
	);
}

export function OrgAdminSidebar() {
	return (
		<aside className="hidden w-64 flex-col border-r border-border/50 bg-card/30 md:flex">
			<OrgAdminNavContent />
		</aside>
	);
}

export function OrgAdminMobileNav() {
	const [open, setOpen] = useState(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="md:hidden"
					aria-label="Open organization workspace navigation"
				>
					<Menu className="h-5 w-5" />
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-72 p-0">
				<SheetHeader className="sr-only">
					<SheetTitle>Organization workspace navigation</SheetTitle>
				</SheetHeader>
				<OrgAdminNavContent onItemClick={() => setOpen(false)} />
			</SheetContent>
		</Sheet>
	);
}
