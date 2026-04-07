"use client";

/**
 * @deprecated Use `ConfirmDialog` from `@/components/patterns` instead.
 *
 * This component has been replaced by the standardized ConfirmDialog pattern.
 *
 * Still used in:
 * - app/admin/organizations/[id]/page.tsx
 * - app/admin/organizations/page.tsx
 *
 * Migration path:
 * - Replace `ConfirmRestoreDialog` with `ConfirmDialog`
 * - Use props: `title`, `description`, `confirmText="Restore"`, `variant="default"`
 *
 * TODO: Migrate admin pages and delete this file
 */

import { RotateCcw } from "lucide-react";
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
import { getModalWidthClass } from "./modal";

interface ConfirmRestoreDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
	entityType: "project" | "company" | "location" | "organization";
	entityName: string;
	loading?: boolean;
}

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
			<AlertDialogContent className={getModalWidthClass("sm")}>
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-full bg-success/10">
							<RotateCcw className="size-5 text-success" />
						</div>
						<AlertDialogTitle>Restore {entityType}?</AlertDialogTitle>
					</div>
					<AlertDialogDescription className="mt-4">
						Are you sure you want to restore this {entityType}? It will become
						editable again and appear in active lists.
						<br />
						<br />
						<span className="font-semibold text-foreground">{entityName}</span>
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
