"use client";

import { Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FileCard } from "./file-card";
import { FileRow } from "./file-row";
import type { EnhancedProjectFile, FileViewMode } from "./types";

interface FilesBrowserProps {
	files: EnhancedProjectFile[];
	viewMode: FileViewMode;
	selectedFileId: string | null;
	onSelectFile: (fileId: string) => void;
	isLoading?: boolean;
	hasFilters?: boolean;
	onClearFilters?: () => void;
	className?: string;
}

const GRID_SKELETON_KEYS = [
	"grid-skel-0",
	"grid-skel-1",
	"grid-skel-2",
	"grid-skel-3",
	"grid-skel-4",
	"grid-skel-5",
	"grid-skel-6",
	"grid-skel-7",
] as const;

const LIST_SKELETON_KEYS = [
	"list-skel-0",
	"list-skel-1",
	"list-skel-2",
	"list-skel-3",
	"list-skel-4",
	"list-skel-5",
] as const;

function GridSkeleton() {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
			{GRID_SKELETON_KEYS.map((key) => (
				<div key={key} className="rounded-xl border bg-card p-3 space-y-3">
					<Skeleton className="aspect-square w-full rounded-lg" />
					<div className="space-y-1">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
					</div>
				</div>
			))}
		</div>
	);
}

function ListSkeleton() {
	return (
		<div className="space-y-2">
			{LIST_SKELETON_KEYS.map((key) => (
				<div
					key={key}
					className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
				>
					<Skeleton className="h-8 w-8 rounded-lg shrink-0" />
					<Skeleton className="h-4 flex-1" />
					<Skeleton className="h-5 w-12 rounded-full" />
					<Skeleton className="h-3 w-16" />
				</div>
			))}
		</div>
	);
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="rounded-full bg-muted p-4 mb-4">
				<Upload className="h-8 w-8 text-muted-foreground" />
			</div>
			<h3 className="font-medium text-lg mb-1">No files yet</h3>
			<p className="text-sm text-muted-foreground max-w-xs">
				Upload stream evidence and discovery documents to get started
			</p>
		</div>
	);
}

function NoMatchesState({ onClear }: { onClear?: (() => void) | undefined }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="rounded-full bg-muted p-4 mb-4">
				<Search className="h-8 w-8 text-muted-foreground" />
			</div>
			<h3 className="font-medium text-lg mb-1">No files match</h3>
			<p className="text-sm text-muted-foreground max-w-xs mb-4">
				Try adjusting your search or filter settings
			</p>
			{onClear && (
				<Button variant="outline" onClick={onClear}>
					Clear filters
				</Button>
			)}
		</div>
	);
}

export function FilesBrowser({
	files,
	viewMode,
	selectedFileId,
	onSelectFile,
	isLoading = false,
	hasFilters = false,
	onClearFilters,
	className,
}: FilesBrowserProps) {
	if (isLoading) {
		return viewMode === "grid" ? <GridSkeleton /> : <ListSkeleton />;
	}

	if (files.length === 0 && !hasFilters) {
		return <EmptyState />;
	}

	if (files.length === 0 && hasFilters) {
		return <NoMatchesState onClear={onClearFilters} />;
	}

	if (viewMode === "grid") {
		return (
			<div
				className={cn(
					"grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4",
					className,
				)}
			>
				{files.map((file) => (
					<FileCard
						key={file.id}
						file={file}
						isSelected={selectedFileId === file.id}
						onClick={() => onSelectFile(file.id)}
					/>
				))}
			</div>
		);
	}

	return (
		<div className={cn("space-y-2", className)}>
			{files.map((file) => (
				<FileRow
					key={file.id}
					file={file}
					isSelected={selectedFileId === file.id}
					onClick={() => onSelectFile(file.id)}
				/>
			))}
		</div>
	);
}
