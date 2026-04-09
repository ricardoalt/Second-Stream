"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreSelectorProps {
	name: string;
	label: string;
	value: number;
	onChange: (value: number) => void;
	disabled: boolean;
}

const SCORES = [1, 2, 3, 4, 5] as const;

export function ScoreSelector({
	name,
	label,
	value,
	onChange,
	disabled,
}: ScoreSelectorProps) {
	const [hoveredValue, setHoveredValue] = useState(0);

	return (
		<fieldset
			className="flex items-center gap-0"
			onMouseLeave={() => setHoveredValue(0)}
		>
			<legend className="sr-only">{label}</legend>
			{SCORES.map((score) => (
				<label
					key={score}
					// min 40×40px hit area (touch accessibility) even though icon is smaller
					className={cn(
						"flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center rounded-md",
						"focus-within:outline-none focus-within:ring-2 focus-within:ring-ring",
						disabled && "cursor-not-allowed opacity-60",
					)}
					onMouseEnter={() => {
						if (!disabled) setHoveredValue(score);
					}}
				>
					<input
						type="radio"
						name={name}
						value={score}
						checked={value === score}
						onChange={() => onChange(score)}
						disabled={disabled}
						aria-label={`${score} of 5 stars`}
						className="sr-only"
					/>
					<Star
						className={cn(
							"h-4 w-4 transition-all duration-100",
							// Ghost preview: hovering above current rating — show faint fill
							// for stars between current+1 and hovered. Checked before the
							// solid-fill branch so it is reachable (previously dead code).
							hoveredValue > value && score > value && score <= hoveredValue
								? "fill-rating-star/30 text-rating-star/60"
								: // Solid fill: either a rated star, or hovering at/below current
									score <= (hoveredValue || value)
									? "fill-rating-star text-rating-star"
									: "text-muted-foreground/40",
							!disabled && "active:scale-90",
						)}
					/>
				</label>
			))}
		</fieldset>
	);
}
