"use client";

import { AlertTriangle, Archive, Trash2, Users } from "lucide-react";
import type { MouseEvent } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// ============================================================================
// Confirm Archive Dialog
// ============================================================================

interface ConfirmArchiveDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
	entityType: "project" | "company" | "location" | "organization";
	entityName: string;
	loading?: boolean;
	hasActiveUsers?: boolean;
	onForceConfirm?: () => void | Promise<void>;
}

/**
 * Confirm Archive Dialog - Editorial Design System
 *
 * Uses warning tokens (amber semantic color) for archive operations.
 *
 * @example
 * <ConfirmArchiveDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onConfirm={handleConfirm}
 *   entityType="project"
 *   entityName="Project Alpha"
 * />
 */
export function ConfirmArchiveDialog({
	open,
	onOpenChange,
	onConfirm,
	entityType,
	entityName,
	loading = false,
	hasActiveUsers = false,
	onForceConfirm,
}: ConfirmArchiveDialogProps) {
	const isForceMode = hasActiveUsers && onForceConfirm;

	const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		await onConfirm();
	};

	const handleForceConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		await onForceConfirm?.();
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						<div
							className={cn(
								"flex size-10 items-center justify-center rounded-full",
								"bg-warning/10",
							)}
						>
							{isForceMode ? (
								<Users className="size-5 text-warning" />
							) : (
								<Archive className="size-5 text-warning" />
							)}
						</div>
						<AlertDialogTitle>
							{isForceMode
								? `Archive ${entityType} with active users?`
								: `Archive ${entityType}?`}
						</AlertDialogTitle>
					</div>
					<AlertDialogDescription className="mt-4 flex flex-col gap-2">
						{isForceMode ? (
							<>
								<span>
									This {entityType} has active users. Archiving will deactivate
									all members and make the {entityType} read-only.
								</span>
								<span>
									<span className="font-semibold text-foreground">
										{entityName}
									</span>
								</span>
							</>
						) : (
							<>
								<span>
									Are you sure you want to archive this {entityType}? It will
									become read-only and hidden from active lists.
								</span>
								<span>
									<span className="font-semibold text-foreground">
										{entityName}
									</span>
								</span>
							</>
						)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
					{isForceMode ? (
						<AlertDialogAction
							onClick={handleForceConfirm}
							disabled={loading}
							className="bg-warning text-warning-foreground hover:bg-warning/90"
						>
							{loading ? "Archiving…" : "Archive & Deactivate Users"}
						</AlertDialogAction>
					) : (
						<AlertDialogAction
							onClick={handleConfirm}
							disabled={loading}
							className="bg-warning text-warning-foreground hover:bg-warning/90"
						>
							{loading ? "Archiving…" : "Archive"}
						</AlertDialogAction>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// ============================================================================
// Confirm Delete Dialog
// ============================================================================

interface ConfirmDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
	entityType: string;
	entityName: string;
	loading?: boolean;
	/**
	 * If true, this is a hard delete (permanent).
	 * If false, this is a soft delete (can be restored).
	 */
	isPermanent?: boolean;
}

/**
 * Confirm Delete Dialog - Editorial Design System
 *
 * Uses destructive tokens (red semantic color) for delete operations.
 *
 * @example
 * <ConfirmDeleteDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onConfirm={handleConfirm}
 *   entityType="file"
 *   entityName="report.pdf"
 *   isPermanent={true}
 * />
 */
export function ConfirmDeleteDialog({
	open,
	onOpenChange,
	onConfirm,
	entityType,
	entityName,
	loading = false,
	isPermanent = false,
}: ConfirmDeleteDialogProps) {
	const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		await onConfirm();
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						<div
							className={cn(
								"flex size-10 items-center justify-center rounded-full",
								"bg-destructive/10",
							)}
						>
							{isPermanent ? (
								<Trash2 className="size-5 text-destructive" />
							) : (
								<AlertTriangle className="size-5 text-destructive" />
							)}
						</div>
						<AlertDialogTitle>
							{isPermanent ? "Permanently delete" : "Delete"} {entityType}?
						</AlertDialogTitle>
					</div>
					<AlertDialogDescription className="mt-4 flex flex-col gap-2">
						<span>
							{isPermanent
								? `This will permanently delete the ${entityType}. This action cannot be undone.`
								: `This will delete the ${entityType}. You can restore it from the archive later.`}
						</span>
						<span>
							<span className="font-semibold text-foreground">
								{entityName}
							</span>
						</span>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={loading}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{loading
							? "Deleting…"
							: isPermanent
								? "Delete Permanently"
								: "Delete"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// ============================================================================
// Confirm Restore Dialog
// ============================================================================

interface ConfirmRestoreDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
	entityType: string;
	entityName: string;
	loading?: boolean;
}

/**
 * Confirm Restore Dialog - Editorial Design System
 *
 * Uses success tokens (green semantic color) for restore operations.
 *
 * @example
 * <ConfirmRestoreDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onConfirm={handleConfirm}
 *   entityType="project"
 *   entityName="Project Alpha"
 * />
 */
export function ConfirmRestoreDialog({
	open,
	onOpenChange,
	onConfirm,
	entityType,
	entityName,
	loading = false,
}: ConfirmRestoreDialogProps) {
	const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		await onConfirm();
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						<div
							className={cn(
								"flex size-10 items-center justify-center rounded-full",
								"bg-success/10",
							)}
						>
							<Archive className="size-5 text-success" />
						</div>
						<AlertDialogTitle>Restore {entityType}?</AlertDialogTitle>
					</div>
					<AlertDialogDescription className="mt-4 flex flex-col gap-2">
						<span>
							This will restore the {entityType} from the archive and make it
							active again.
						</span>
						<span>
							<span className="font-semibold text-foreground">
								{entityName}
							</span>
						</span>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={loading}
						className="bg-success text-success-foreground hover:bg-success/90"
					>
						{loading ? "Restoring…" : "Restore"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// ============================================================================
// Confirm Purge Dialog (Permanent deletion from archive)
// ============================================================================

interface ConfirmPurgeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
	entityType: string;
	entityName: string;
	loading?: boolean;
	itemCount?: number;
}

/**
 * Confirm Purge Dialog - Editorial Design System
 *
 * Uses destructive tokens for permanent deletion from archive.
 * Most dangerous operation - requires extra confirmation.
 *
 * @example
 * <ConfirmPurgeDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onConfirm={handleConfirm}
 *   entityType="project"
 *   entityName="Project Alpha"
 *   itemCount={5}
 * />
 */
export function ConfirmPurgeDialog({
	open,
	onOpenChange,
	onConfirm,
	entityType,
	entityName,
	loading = false,
	itemCount,
}: ConfirmPurgeDialogProps) {
	const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		await onConfirm();
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						<div
							className={cn(
								"flex size-10 items-center justify-center rounded-full",
								"bg-destructive/10",
							)}
						>
							<Trash2 className="size-5 text-destructive" />
						</div>
						<AlertDialogTitle>Permanently purge {entityType}?</AlertDialogTitle>
					</div>
					<AlertDialogDescription className="mt-4 flex flex-col gap-2">
						<span className="font-semibold text-destructive">
							⚠️ This action cannot be undone. All data will be permanently lost.
						</span>
						<span>
							You are about to permanently purge{" "}
							{itemCount ? `${itemCount} items from ` : ""}
							the {entityType}:
						</span>
						<span>
							<span className="font-semibold text-foreground">
								{entityName}
							</span>
						</span>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={loading}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{loading ? "Purging…" : "Permanently Purge"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
