"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const routes = [
	{ href: "/streams", label: "All Streams" },
	{ href: "/streams/drafts", label: "Drafts" },
	{ href: "/streams/follow-ups", label: "Follow-ups" },
];

export function StreamsRouteTabs() {
	const pathname = usePathname();

	return (
		<nav aria-label="Streams sections" className="flex flex-wrap gap-2">
			{routes.map((route) => {
				const isActive = pathname === route.href;
				return (
					<Link
						key={route.href}
						href={route.href}
						className={cn(
							"inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors",
							isActive
								? "bg-surface-container-low text-foreground"
								: "bg-surface-container-highest text-muted-foreground hover:text-foreground",
						)}
					>
						{route.label}
					</Link>
				);
			})}
		</nav>
	);
}
