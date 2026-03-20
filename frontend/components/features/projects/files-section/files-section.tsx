"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { projectsAPI } from "@/lib/api/projects";
import type { ProjectFile } from "@/lib/project-types";
import { useCurrentProject } from "@/lib/stores/project-store";
import { FilePreviewModal } from "./file-preview-modal";
import { FilesBrowser } from "./files-browser";
import { FilesCategoryFilter } from "./files-category-filter";
import { FilesHeader } from "./files-header";
import { FilesSearchBar } from "./files-search-bar";
import type {
	EnhancedProjectFile,
	FileCategory,
	FileSortBy,
	FileViewMode,
} from "./types";
import {
	getFileCategory,
	parseProcessingStatus,
	VIEW_MODE_STORAGE_KEY,
} from "./types";

const STATUS_POLL_INTERVAL_MS = 5000;

interface FilesSectionProps {
	projectId: string;
	onDataImported?: () => void;
}

/**
 * Convert backend ProjectFile to EnhancedProjectFile.
 */
function toEnhancedFile(file: ProjectFile): EnhancedProjectFile {
	return {
		id: file.id,
		filename: file.filename,
		fileSize: file.file_size,
		fileType: file.file_type,
		category: getFileCategory(file.file_type, file.category),
		uploadedAt: file.uploaded_at,
		hasProcessedText: Boolean(file.processed_text),
		hasAIAnalysis: Boolean(file.ai_analysis),
		processingStatus: parseProcessingStatus(file.processing_status),
		aiAnalysis: null, // Fetched lazily
	};
}

export function FilesSection({ projectId, onDataImported }: FilesSectionProps) {
	const currentProject = useCurrentProject();
	const isArchived =
		currentProject?.id === projectId && Boolean(currentProject.archivedAt);

	// Files fetched directly from API
	const [files, setFiles] = useState<ProjectFile[]>([]);
	const [isLoadingFiles, setIsLoadingFiles] = useState(true);
	const statusPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null,
	);

	// View mode with localStorage persistence
	const [viewMode, setViewMode] = useState<FileViewMode>(() => {
		if (typeof window === "undefined") return "grid";
		const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
		return stored === "list" ? "list" : "grid";
	});

	// Filter/sort state
	const [searchTerm, setSearchTerm] = useState("");
	const [sortBy, setSortBy] = useState<FileSortBy>("date");
	const [filterCategory, setFilterCategory] = useState<FileCategory | "all">(
		"all",
	);

	// Modal state (replaces side panel + drawer)
	const [modalOpen, setModalOpen] = useState(false);
	const [modalFile, setModalFile] = useState<EnhancedProjectFile | null>(null);

	// Delete dialog state
	const [fileToDelete, setFileToDelete] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// Save view mode preference
	useEffect(() => {
		localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
	}, [viewMode]);

	// ========================================================================
	// Fetch files from API
	// ========================================================================

	const fetchFiles = useCallback(async () => {
		try {
			const data = await projectsAPI.getFiles(projectId);
			setFiles(data);
		} catch (_error) {
			toast.error("Error loading files");
		} finally {
			setIsLoadingFiles(false);
		}
	}, [projectId]);

	// Initial fetch
	useEffect(() => {
		fetchFiles();
	}, [fetchFiles]);

	// Auto-refresh while photos are processing
	useEffect(() => {
		const hasPendingPhoto = files.some(
			(file) =>
				file.category === "photos" && file.processing_status !== "completed",
		);

		if (hasPendingPhoto && !statusPollIntervalRef.current) {
			statusPollIntervalRef.current = setInterval(() => {
				void fetchFiles();
			}, STATUS_POLL_INTERVAL_MS);
		}

		if (!hasPendingPhoto && statusPollIntervalRef.current) {
			clearInterval(statusPollIntervalRef.current);
			statusPollIntervalRef.current = null;
		}

		return () => {
			if (statusPollIntervalRef.current) {
				clearInterval(statusPollIntervalRef.current);
				statusPollIntervalRef.current = null;
			}
		};
	}, [files, fetchFiles]);

	// Convert files to enhanced format
	const enhancedFiles = useMemo(() => {
		return files.map(toEnhancedFile);
	}, [files]);

	// Filter and sort files
	const filteredFiles = useMemo(() => {
		let result = [...enhancedFiles];

		// Search filter
		if (searchTerm) {
			const search = searchTerm.toLowerCase();
			result = result.filter((file) =>
				file.filename.toLowerCase().includes(search),
			);
		}

		// Category filter
		if (filterCategory !== "all") {
			result = result.filter((file) => file.category === filterCategory);
		}

		// Sort
		result.sort((a, b) => {
			switch (sortBy) {
				case "name":
					return a.filename.localeCompare(b.filename);
				default:
					return (
						new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
					);
			}
		});

		return result;
	}, [enhancedFiles, searchTerm, filterCategory, sortBy]);

	// Handle file selection - opens modal
	const handleSelectFile = useCallback(
		(fileId: string) => {
			const file = enhancedFiles.find((f) => f.id === fileId);
			if (file) {
				setModalFile(file);
				setModalOpen(true);
			}
		},
		[enhancedFiles],
	);

	// Handle delete from modal
	const handleDeleteFromModal = useCallback((file: EnhancedProjectFile) => {
		setFileToDelete({ id: file.id, name: file.filename });
	}, []);

	// Handle actual delete
	const handleConfirmDelete = useCallback(async () => {
		if (!fileToDelete) return;

		setIsDeleting(true);
		try {
			await projectsAPI.deleteFile(projectId, fileToDelete.id);
			toast.success("File deleted");

			// Refresh file list
			await fetchFiles();
			onDataImported?.();

			// Close modal if deleted file was being viewed
			if (modalFile?.id === fileToDelete.id) {
				setModalOpen(false);
				setModalFile(null);
			}
		} catch {
			toast.error("Failed to delete file");
		} finally {
			setIsDeleting(false);
			setFileToDelete(null);
		}
	}, [fileToDelete, projectId, modalFile, onDataImported, fetchFiles]);

	// Clear filters
	const handleClearFilters = useCallback(() => {
		setSearchTerm("");
		setFilterCategory("all");
		setSortBy("date");
	}, []);

	const hasActiveFilters = Boolean(searchTerm || filterCategory !== "all");

	return (
		<div className="space-y-6">
			{/* Archive warning */}
			{isArchived && (
				<Card className="border-warning/40 bg-warning/10">
					<CardContent className="p-4 text-sm text-muted-foreground">
						This project is archived. File deletions are disabled.
					</CardContent>
				</Card>
			)}

			<Card>
				<CardContent className="p-4 text-sm text-muted-foreground">
					Files uploaded from the workspace appear here. Upload new evidence
					from the workspace view.
				</CardContent>
			</Card>

			{/* Files section */}
			<div className="space-y-4">
				{/* Header with view toggle */}
				<FilesHeader viewMode={viewMode} onViewModeChange={setViewMode} />

				{/* Category filter pills */}
				<FilesCategoryFilter
					files={enhancedFiles}
					selected={filterCategory}
					onChange={setFilterCategory}
				/>

				{/* Search and sort */}
				<FilesSearchBar
					searchTerm={searchTerm}
					onSearchChange={setSearchTerm}
					sortBy={sortBy}
					onSortChange={setSortBy}
				/>

				{/* File browser - no more split layout! Grid stays stable */}
				<FilesBrowser
					files={filteredFiles}
					viewMode={viewMode}
					selectedFileId={modalFile?.id ?? null}
					onSelectFile={handleSelectFile}
					isLoading={isLoadingFiles}
					hasFilters={hasActiveFilters}
					onClearFilters={handleClearFilters}
				/>
			</div>

			{/* File preview modal (replaces side panel + drawer) */}
			<FilePreviewModal
				file={modalFile}
				projectId={projectId}
				open={modalOpen}
				onOpenChange={setModalOpen}
				onDelete={handleDeleteFromModal}
				disabled={isArchived}
			/>

			{/* Delete confirmation dialog */}
			<ConfirmDeleteDialog
				open={fileToDelete !== null}
				onOpenChange={(open) => !open && setFileToDelete(null)}
				onConfirm={handleConfirmDelete}
				title="Delete file?"
				description="This action cannot be undone. The file will be permanently removed from the project."
				itemName={fileToDelete?.name}
				loading={isDeleting}
			/>
		</div>
	);
}
