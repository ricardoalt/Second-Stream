"use client";

import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FileViewMode } from "./types";

interface FilesHeaderProps {
	viewMode: FileViewMode;
	onViewModeChange: (mode: FileViewMode) => void;
}

export function FilesHeader({ viewMode, onViewModeChange }: FilesHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<h2 className="text-lg font-semibold">Browse Files</h2>

			<div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/30">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onViewModeChange("grid")}
					className={cn(
						"h-7 w-7 p-0",
						viewMode === "grid" && "bg-background shadow-sm",
					)}
					aria-label="Grid view"
					aria-pressed={viewMode === "grid"}
				>
					<LayoutGrid className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onViewModeChange("list")}
					className={cn(
						"h-7 w-7 p-0",
						viewMode === "list" && "bg-background shadow-sm",
					)}
					aria-label="List view"
					aria-pressed={viewMode === "list"}
				>
					<List className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
