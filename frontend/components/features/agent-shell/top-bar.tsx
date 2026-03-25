"use client";

import {
	Bell,
	ChevronDown,
	LogOut,
	Search,
	Settings,
	User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { User as AuthUser } from "@/lib/types/user";

const pageTitleMap: Record<string, string> = {
	"/dashboard": "Dashboard",
	"/streams": "Waste Streams",
	"/streams/drafts": "Draft Streams",
	"/streams/follow-ups": "Urgent Follow-ups",
	"/clients": "Client Portfolio",
	"/offers": "Offers Pipeline",
	"/offers/archive": "Historical Archive",
};

function getInitials(name?: string): string {
	if (!name) return "AG";
	const parts = name.split(" ").filter(Boolean);
	const first = parts[0] ?? "";
	const second = parts[1] ?? "";
	if (!first) return "AG";
	if (parts.length === 1) return first.slice(0, 2).toUpperCase();
	return `${first[0]}${second[0] ?? ""}`.toUpperCase();
}

function getTitle(pathname: string): string {
	if (pathname.startsWith("/streams/")) return "Stream Workspace";
	if (pathname.startsWith("/clients/")) return "Client Profile";
	if (pathname.startsWith("/offers/")) return "Offer Detail";
	return pageTitleMap[pathname] ?? "Field Agent";
}

type TopBarProps = {
	user: AuthUser | null;
	onLogout: () => void;
};

export function TopBar({ user, onLogout }: TopBarProps) {
	const pathname = usePathname();
	const title = getTitle(pathname);
	const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();

	return (
		<header className="sticky top-0 z-30 h-14 bg-surface-container-lowest px-6 shadow-xs">
			<div className="flex h-full items-center justify-between gap-4">
				<div className="flex min-w-0 items-center gap-4">
					<div className="min-w-0">
						<p className="truncate font-display text-base font-semibold text-foreground">
							{title}
						</p>
					</div>
					<div className="relative hidden w-[320px] lg:block">
						<Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search streams, clients, offers"
							className="border-0 bg-surface-container-highest pl-9"
						/>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button variant="ghost" size="icon" aria-label="Notifications">
						<Bell />
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-10 gap-2 px-2">
								<Avatar className="size-8">
									<AvatarFallback>{getInitials(fullName)}</AvatarFallback>
								</Avatar>
								<span className="hidden max-w-32 truncate text-sm md:block">
									{fullName || "Field Agent"}
								</span>
								<ChevronDown className="text-muted-foreground" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="glass-popover w-56">
							<DropdownMenuLabel className="flex flex-col gap-1">
								<span className="text-sm font-semibold text-foreground">
									{fullName || "Field Agent"}
								</span>
								<span className="text-xs text-muted-foreground">
									{user?.email}
								</span>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link href="/profile">
									<User />
									Profile
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href="/settings">
									<Settings />
									Settings
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={onLogout}
								className="text-destructive focus:text-destructive"
							>
								<LogOut />
								Sign Out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}
