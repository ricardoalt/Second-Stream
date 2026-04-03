"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/patterns";
import { projectsAPI } from "@/lib/api/projects";
import type { ProjectFile } from "@/lib/project-types";
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

interface StreamFilesSectionProps {
	projectId: string;
	refreshSignal: number;
	onDataImported?: (() => void) | undefined;
	onFilesCountChange?: ((count: number) => void) | undefined;
}

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
		aiAnalysis: null,
	};
}

export function StreamFilesSection({
	projectId,
	refreshSignal,
	onDataImported,
	onFilesCountChange,
}: StreamFilesSectionProps) {
	const [files, setFiles] = useState<ProjectFile[]>([]);
	const [isLoadingFiles, setIsLoadingFiles] = useState(true);
	const statusPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null,
	);

	const [viewMode, setViewMode] = useState<FileViewMode>(() => {
		if (typeof window === "undefined") return "grid";
		const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
		return stored === "list" ? "list" : "grid";
	});

	const [searchTerm, setSearchTerm] = useState("");
	const [sortBy, setSortBy] = useState<FileSortBy>("date");
	const [filterCategory, setFilterCategory] = useState<FileCategory | "all">(
		"all",
	);

	const [modalOpen, setModalOpen] = useState(false);
	const [modalFile, setModalFile] = useState<EnhancedProjectFile | null>(null);

	const [fileToDelete, setFileToDelete] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
	}, [viewMode]);

	const fetchFiles = useCallback(async () => {
		try {
			const data = await projectsAPI.getFiles(projectId);
			setFiles(data);
			onFilesCountChange?.(data.length);
		} catch {
			toast.error("Error loading files");
		} finally {
			setIsLoadingFiles(false);
		}
	}, [projectId, onFilesCountChange]);

	useEffect(() => {
		void fetchFiles();
	}, [fetchFiles]);

	useEffect(() => {
		if (refreshSignal > 0) {
			void fetchFiles();
		}
	}, [refreshSignal, fetchFiles]);

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

	const enhancedFiles = useMemo(() => {
		return files.map(toEnhancedFile);
	}, [files]);

	const filteredFiles = useMemo(() => {
		let result = [...enhancedFiles];

		if (searchTerm) {
			const search = searchTerm.toLowerCase();
			result = result.filter((file) =>
				file.filename.toLowerCase().includes(search),
			);
		}

		if (filterCategory !== "all") {
			result = result.filter((file) => file.category === filterCategory);
		}

		result.sort((fileA, fileB) => {
			switch (sortBy) {
				case "name":
					return fileA.filename.localeCompare(fileB.filename);
				default:
					return (
						new Date(fileB.uploadedAt).getTime() -
						new Date(fileA.uploadedAt).getTime()
					);
			}
		});

		return result;
	}, [enhancedFiles, searchTerm, filterCategory, sortBy]);

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

	const handleDeleteFromModal = useCallback((file: EnhancedProjectFile) => {
		setFileToDelete({ id: file.id, name: file.filename });
	}, []);

	const handleConfirmDelete = useCallback(async () => {
		if (!fileToDelete) return;

		setIsDeleting(true);
		try {
			await projectsAPI.deleteFile(projectId, fileToDelete.id);
			toast.success("File deleted");
			await fetchFiles();
			onDataImported?.();

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

	const handleClearFilters = useCallback(() => {
		setSearchTerm("");
		setFilterCategory("all");
		setSortBy("date");
	}, []);

	const hasActiveFilters = Boolean(searchTerm || filterCategory !== "all");

	return (
		<>
			<div className="space-y-4">
				<FilesHeader viewMode={viewMode} onViewModeChange={setViewMode} />

				<FilesCategoryFilter
					files={enhancedFiles}
					selected={filterCategory}
					onChange={setFilterCategory}
				/>

				<FilesSearchBar
					searchTerm={searchTerm}
					onSearchChange={setSearchTerm}
					sortBy={sortBy}
					onSortChange={setSortBy}
				/>

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

			<FilePreviewModal
				file={modalFile}
				projectId={projectId}
				open={modalOpen}
				onOpenChange={setModalOpen}
				onDelete={handleDeleteFromModal}
			/>

			<ConfirmDialog
				open={fileToDelete !== null}
				onOpenChange={(open) => !open && setFileToDelete(null)}
				onConfirm={() => {
					void handleConfirmDelete();
				}}
				title="Delete file?"
				description={`This action cannot be undone. The file "${fileToDelete?.name}" will be permanently removed from the stream workspace.`}
				confirmText="Delete"
				variant="destructive"
				loading={isDeleting}
			/>
		</>
	);
}
