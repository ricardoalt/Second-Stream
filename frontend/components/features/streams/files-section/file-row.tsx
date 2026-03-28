"use client";

import { ChevronRight, Sparkles } from "lucide-react";
import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { formatFileSize, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FileThumbnail } from "./file-thumbnail";
import type { EnhancedProjectFile } from "./types";
import { CATEGORY_CONFIG } from "./types";

interface FileRowProps {
	file: EnhancedProjectFile;
	isSelected: boolean;
	onClick: () => void;
}

export const FileRow = memo(function FileRow({
	file,
	isSelected,
	onClick,
}: FileRowProps) {
	const categoryConfig = CATEGORY_CONFIG[file.category];
	const hasAI = file.hasAIAnalysis;

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group flex items-center gap-3 w-full rounded-lg border px-3 py-2.5 text-left",
				"transition-all duration-150 ease-out",
				"hover:bg-accent/5 hover:-translate-y-0.5 hover:shadow-sm hover:border-primary/20",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
				isSelected &&
					"bg-accent/10 border-primary/30 -translate-y-0.5 shadow-sm",
			)}
		>
			<FileThumbnail
				filename={file.filename}
				fileType={file.fileType}
				category={file.category}
				processingStatus={file.processingStatus}
				thumbnailUrl={file.thumbnailUrl}
				size="sm"
			/>

			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate" title={file.filename}>
					{file.filename}
				</p>
			</div>

			<Badge
				variant="secondary"
				className={cn(
					"shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase",
					categoryConfig.bgColor,
					categoryConfig.textColor,
				)}
			>
				{categoryConfig.label}
			</Badge>

			<span className="hidden sm:block text-xs text-muted-foreground w-16 text-right shrink-0">
				{formatFileSize(file.fileSize)}
			</span>

			<span className="hidden md:block text-xs text-muted-foreground w-20 text-right shrink-0">
				{formatRelativeDate(file.uploadedAt)}
			</span>

			{hasAI && (
				<div
					className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 shrink-0"
					title="AI processed"
				>
					<Sparkles className="h-3 w-3 text-primary" />
				</div>
			)}

			<ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
		</button>
	);
});
