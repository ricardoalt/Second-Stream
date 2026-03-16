import Image from "next/image";

interface DSRLogoProps {
	className?: string;
	width?: number;
	height?: number;
	showText?: boolean;
}

export function DSRLogo({
	className = "",
	width = 160,
	height = 66,
	showText = false,
}: DSRLogoProps) {
	return (
		<div className={`flex items-center gap-3 ${className}`}>
			<Image
				src="/secondstream_logo.svg"
				alt="SecondStream logo"
				width={width}
				height={height}
				className="object-contain"
				priority
			/>
			{showText && (
				<div className="flex flex-col">
					<span className="text-xl font-bold tracking-tight">SecondStream</span>
					<span className="text-[10px] text-muted-foreground tracking-wide">
						AI WASTE OPPORTUNITY PLATFORM
					</span>
				</div>
			)}
		</div>
	);
}
