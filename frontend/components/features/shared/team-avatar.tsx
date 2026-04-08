import { memo } from "react";
import { cn } from "@/lib/utils";

// Design System: Industrial Precision & Fluidity
// Team Avatar - Consistent color palette via CSS design tokens

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
 * 8 consistent colors mapped to CSS avatar tokens from globals.css.
 * Respects dark mode automatically.
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

	// Mapped to CSS variable avatar palette (defined in globals.css as --avatar-1..--avatar-8)
	const colorVarMap: Record<AvatarColor, string> = {
		teal: "var(--avatar-1)", // primary teal
		green: "var(--avatar-2)", // success green
		pink: "var(--avatar-3)", // rose/pink
		orange: "var(--avatar-4)", // warning amber
		purple: "var(--avatar-5)", // destructive/red
		blue: "var(--avatar-6)", // info blue
		indigo: "var(--avatar-7)", // indigo/violet
		cyan: "var(--avatar-8)", // teal-light
	};

	const sizeMap = {
		sm: "size-8 text-xs",
		md: "size-10 text-sm",
		lg: "size-12 text-base",
	};

	return (
		<span
			className={cn(
				"flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
				sizeMap[size],
				className,
			)}
			style={{ backgroundColor: colorVarMap[color] }}
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
