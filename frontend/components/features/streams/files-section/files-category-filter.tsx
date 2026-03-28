"use client";

import { cn } from "@/lib/utils";
import type { EnhancedProjectFile, FileCategory } from "./types";
import { CATEGORY_CONFIG } from "./types";

interface FilesCategoryFilterProps {
	files: EnhancedProjectFile[];
	selected: FileCategory | "all";
	onChange: (category: FileCategory | "all") => void;
}

interface CategoryCount {
	category: FileCategory | "all";
	label: string;
	count: number;
}

export function FilesCategoryFilter({
	files,
	selected,
	onChange,
}: FilesCategoryFilterProps) {
	const counts: CategoryCount[] = [
		{ category: "all", label: "All", count: files.length },
	];

	const categoryKeys: FileCategory[] = ["lab", "sds", "photo", "general"];
	for (const category of categoryKeys) {
		const count = files.filter((file) => file.category === category).length;
		if (count > 0) {
			counts.push({
				category,
				label: CATEGORY_CONFIG[category].label,
				count,
			});
		}
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: role="group" with aria-label is appropriate for toggle buttons
		<div
			className="flex flex-wrap gap-2"
			role="group"
			aria-label="Filter by category"
		>
			{counts.map(({ category, label, count }) => {
				const isSelected = selected === category;
				const config = category !== "all" ? CATEGORY_CONFIG[category] : null;

				return (
					<button
						key={category}
						type="button"
						onClick={() => onChange(category)}
						className={cn(
							"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
							"border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
							isSelected
								? "bg-primary/10 border-primary/30 text-foreground"
								: "bg-transparent border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
						)}
						aria-pressed={isSelected}
					>
						{config && (
							<span
								className={cn("h-2 w-2 rounded-full shrink-0", config.dotColor)}
							/>
						)}
						<span>{label}</span>
						<span
							className={cn(
								"text-xs tabular-nums",
								isSelected ? "text-foreground/70" : "text-muted-foreground/70",
							)}
						>
							{count}
						</span>
					</button>
				);
			})}
		</div>
	);
}
