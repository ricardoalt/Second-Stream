"use client";

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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ConfirmDialog - Standardized confirmation dialog for SecondStream
 *
 * Replaces all variations of confirmation dialogs:
 * - confirm-archive-dialog.tsx
 * - confirm-restore-dialog.tsx
 * - confirm-purge-dialog.tsx
 * - confirm-delete-dialog.tsx
 *
 * @example
 * <ConfirmDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   title="Archive Item?"
 *   description="Are you sure you want to archive this item?"
 *   confirmText="Archive"
 *   variant="destructive"
 *   onConfirm={handleArchive}
 * />
 */

interface ConfirmDialogProps {
	/** Dialog open state */
	open: boolean;
	/** Callback when open state changes */
	onOpenChange: (open: boolean) => void;
	/** Dialog title */
	title: string;
	/** Dialog description */
	description: string;
	/** Text for cancel button */
	cancelText?: string;
	/** Text for confirm button */
	confirmText?: string;
	/** Visual variant */
	variant?: "default" | "destructive";
	/** Callback when confirmed */
	onConfirm: () => void;
	/** Loading state */
	loading?: boolean;
	/** Additional CSS classes */
	className?: string;
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	cancelText = "Cancel",
	confirmText = "Confirm",
	variant = "default",
	onConfirm,
	loading = false,
	className,
}: ConfirmDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className={cn(className)}>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel asChild>
						<Button variant="outline" disabled={loading}>
							{cancelText}
						</Button>
					</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							variant={variant === "destructive" ? "destructive" : "default"}
							onClick={onConfirm}
							disabled={loading}
						>
							{loading ? "Processing..." : confirmText}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
