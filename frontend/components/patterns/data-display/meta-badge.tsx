import type { LucideIcon } from "lucide-react";
import { memo } from "react";
import { cn } from "@/lib/utils";

/**
 * MetaBadge — Compact pill for contextual metadata (age, timestamps, tags).
 *
 * Pair with a Lucide icon to communicate semantics at a glance.
 *
 * @example
 * <MetaBadge icon={Clock}>{daysOld}d</MetaBadge>
 * <MetaBadge icon={Calendar}>{date}</MetaBadge>
 */
interface MetaBadgeProps {
	icon?: LucideIcon;
	children: React.ReactNode;
	className?: string;
}

export const MetaBadge = memo(function MetaBadge({
	icon: Icon,
	children,
	className,
}: MetaBadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground",
				className,
			)}
		>
			{Icon && <Icon className="size-2.5" />}
			{children}
		</span>
	);
});
