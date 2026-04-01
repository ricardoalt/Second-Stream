import { memo } from "react";
import { cn } from "@/lib/utils";

// Design System: Industrial Precision & Fluidity
// Team Avatar - Consistent color palette

type AvatarColor =
	| "teal"
	| "blue"
	| "orange"
	| "purple"
	| "green"
	| "pink"
	| "indigo"
	| "cyan";

interface TeamAvatarProps {
	name: string;
	color?: AvatarColor | undefined;
	className?: string | undefined;
	size?: "sm" | "md" | "lg" | undefined;
}

/**
 * Team Avatar - Design System Color Palette
 *
 * 8 consistent colors for team member avatars.
 *
 * @example
 * <TeamAvatar name="Sarah Jenkins" color="teal" />
 * <TeamAvatar name="Marcus Chen" color="blue" />
 */
export const TeamAvatar = memo(function TeamAvatar({
	name,
	color = "teal",
	className,
	size = "md",
}: TeamAvatarProps) {
	const initials = name
		.split(" ")
		.filter(Boolean)
		.map((n) => n[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();

	// Tailwind color classes with dark mode support
	const colorMap: Record<AvatarColor, string> = {
		teal: "bg-teal-500 text-white",
		blue: "bg-blue-500 text-white",
		orange: "bg-orange-500 text-white",
		purple: "bg-purple-500 text-white",
		green: "bg-emerald-500 text-white",
		pink: "bg-pink-500 text-white",
		indigo: "bg-indigo-500 text-white",
		cyan: "bg-cyan-500 text-white",
	};

	const sizeMap = {
		sm: "h-8 w-8 text-xs",
		md: "h-10 w-10 text-sm",
		lg: "h-12 w-12 text-base",
	};

	return (
		<span
			className={cn(
				"flex shrink-0 items-center justify-center rounded-full font-semibold",
				sizeMap[size],
				colorMap[color],
				className,
			)}
			role="img"
			aria-label={`${name} avatar`}
		>
			{initials}
		</span>
	);
});

// Helper to deterministically assign colors based on name
export function getAvatarColorForName(name: string): AvatarColor {
	const colors: AvatarColor[] = [
		"teal",
		"blue",
		"orange",
		"purple",
		"green",
		"pink",
		"indigo",
		"cyan",
	];
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		const char = name.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	const index = Math.abs(hash) % colors.length;
	return colors[index] ?? "teal";
}

// Auto-color avatar
interface AutoTeamAvatarProps extends Omit<TeamAvatarProps, "color"> {}

export const AutoTeamAvatar = memo(function AutoTeamAvatar({
	name,
	className,
	size = "md",
}: AutoTeamAvatarProps) {
	const color = getAvatarColorForName(name);
	return (
		<TeamAvatar name={name} color={color} size={size} className={className} />
	);
});
