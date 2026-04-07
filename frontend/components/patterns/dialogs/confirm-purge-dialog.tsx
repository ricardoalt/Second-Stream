"use client";

/**
 * @deprecated Use `ConfirmDialog` from `@/components/patterns` instead.
 *
 * This component has been replaced by the standardized ConfirmDialog pattern.
 *
 * This purge dialog has extra complexity (requires typing entity name to confirm).
 * The pattern version can handle this with additional props if needed.
 *
 * Check if still used anywhere with:
 * grep -r "ConfirmPurgeDialog" --include="*.tsx"
 *
 * TODO: Check usage, migrate if needed, then delete
 */

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getModalWidthClass } from "./modal";

interface ConfirmPurgeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
	entityType: "project" | "company" | "location";
	entityName: string;
	loading?: boolean;
}

export function ConfirmPurgeDialog({
	open,
	onOpenChange,
	onConfirm,
	entityType,
	entityName,
	loading = false,
}: ConfirmPurgeDialogProps) {
	const [confirmText, setConfirmText] = useState("");

	const isConfirmValid = confirmText === entityName;

	const handleConfirm = async () => {
		if (!isConfirmValid) return;
		await onConfirm();
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			setConfirmText("");
		}
		onOpenChange(newOpen);
	};

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogContent className={getModalWidthClass("sm")}>
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
							<AlertTriangle className="size-5 text-destructive" />
						</div>
						<AlertDialogTitle>
							Permanently delete {entityType}?
						</AlertDialogTitle>
					</div>
					<AlertDialogDescription className="mt-4 flex flex-col gap-3">
						<span className="block text-destructive font-medium">
							This action cannot be undone.
						</span>
						<span className="block">
							This will permanently delete &ldquo;
							<span className="font-semibold text-foreground">
								{entityName}
							</span>
							&rdquo; and ALL associated data including files, proposals, and
							history.
						</span>
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="flex flex-col gap-2 py-2">
					<Label htmlFor="confirm-name">
						Type &ldquo;
						<span className="font-mono font-semibold">{entityName}</span>
						&rdquo; to confirm:
					</Label>
					<Input
						id="confirm-name"
						value={confirmText}
						onChange={(e) => setConfirmText(e.target.value)}
						placeholder={entityName}
						disabled={loading}
						autoComplete="off"
					/>
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={loading || !isConfirmValid}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{loading ? "Deleting…" : "Delete Permanently"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
