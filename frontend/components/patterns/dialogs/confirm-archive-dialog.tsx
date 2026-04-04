"use client";

/**
 * @deprecated Use `ConfirmDialog` from `@/components/patterns` instead.
 *
 * This component has been replaced by the standardized ConfirmDialog pattern.
 * The new component is more flexible and handles all confirmation scenarios.
 *
 * Still used in:
 * - app/admin/organizations/[id]/page.tsx
 * - app/admin/organizations/page.tsx
 *
 * Migration path:
 * - Replace `ConfirmArchiveDialog` with `ConfirmDialog`
 * - Use props: `title`, `description`, `confirmText="Archive"`, `variant="destructive"`
 * - Remove entityType/entityName props, inline the text in `description`
 *
 * TODO: Migrate admin pages and delete this file
 */

import { Archive, Users } from "lucide-react";
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
 * Standardized confirmation dialog for archive operations.
 * Uses semantic tokens (warning) instead of hardcoded colors.
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
					{/* gap en lugar de space-x */}
					<div className="flex items-center gap-3">
						{/* size-* en lugar de h-* w-* */}
						<div
							className={cn(
								"flex size-10 items-center justify-center rounded-full",
								// Token semántico en lugar de bg-amber-500/10
								"bg-warning/10",
							)}
						>
							{isForceMode ? (
								// size-* en lugar de h-* w-*
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
					{/* gap en lugar de space-y */}
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
							// Token semántico en lugar de bg-amber-500
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
