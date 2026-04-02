import { SecondStreamLogo } from "./secondstream-logo";

interface DSRLogoProps {
	className?: string;
	width?: number;
	height?: number;
	showText?: boolean;
}

/**
 * @deprecated Use SecondStreamLogo directly from ./secondstream-logo
 * This component is kept for backward compatibility
 */
export function DSRLogo({
	className = "",
	width = 160,
	showText = false,
}: DSRLogoProps) {
	return (
		<SecondStreamLogo
			className={className}
			size={width}
			showTagline={showText}
			variant="full"
		/>
	);
}
