"use client";

import { X } from "lucide-react";
import type * as React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Modal - Standardized Modal for SecondStream
 * 
 * All modals in the application should use this component for consistency.
 * 
 * @example
 * <Modal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Edit Client"
 *   description="Update client information"
 * >
 *   <form>...</form>
 *   <ModalFooter>
 *     <Button variant="outline" onClick={() => setIsOpen(false)}>
 *       Cancel
 *     </Button>
 *     <Button>Save</Button>
 *   </ModalFooter>
 * </Modal>
 */

interface ModalProps {
	/** Whether the modal is open */
	open: boolean;
	/** Callback when the modal open state changes */
	onOpenChange: (open: boolean) => void;
	/** Modal title */
	title: string;
	/** Optional description/subtitle */
	description?: string;
	/** Modal content */
	children: React.ReactNode;
	/** Modal size variant */
	size?: "default" | "sm" | "lg" | "xl" | "full";
	/** Whether to show the close button */
	showCloseButton?: boolean;
	/** Additional classes for the content */
	className?: string;
}

const sizeStyles = {
	sm: "sm:max-w-[400px]",
	default: "sm:max-w-[500px]",
	lg: "sm:max-w-[600px]",
	xl: "sm:max-w-[800px]",
	full: "sm:max-w-[min(92vw,900px)]",
};

export function Modal({
	open,
	onOpenChange,
	title,
	description,
	children,
	size = "default",
	showCloseButton = true,
	className,
}: ModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					"rounded-xl border border-border bg-card p-0 shadow-xl",
					sizeStyles[size],
					className,
				)}
			>
				<DialogHeader className="border-b border-border px-6 py-4">
					<DialogTitle className="font-display text-lg font-semibold">
						{title}
					</DialogTitle>
					{description && (
						<DialogDescription className="text-sm text-muted-foreground mt-1">
							{description}
						</DialogDescription>
					)}
				</DialogHeader>
				<div className="px-6 py-4">{children}</div>
			</DialogContent>
		</Dialog>
	);
}

/**
 * ModalFooter - Standardized footer for modals
 * Always use this component for modal actions to ensure consistent spacing
 */
interface ModalFooterProps {
	children: React.ReactNode;
	className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
	return (
		<DialogFooter
			className={cn(
				"border-t border-border px-6 py-4 flex flex-row justify-end gap-2",
				className,
			)}
		>
			{children}
		</DialogFooter>
	);
}

/**
 * ConfirmModal - Pre-built confirmation modal
 * 
 * @example
 * <ConfirmModal
 *   open={showConfirm}
 *   onOpenChange={setShowConfirm}
 *   title="Delete Item?"
 *   description="This action cannot be undone."
 *   confirmText="Delete"
 *   variant="destructive"
 *   onConfirm={handleDelete}
 * />
 */

interface ConfirmModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	confirmText?: string;
	cancelText?: string;
	variant?: "default" | "destructive";
	onConfirm: () => void;
	loading?: boolean;
}

export function ConfirmModal({
	open,
	onOpenChange,
	title,
	description = "Are you sure you want to proceed?",
	confirmText = "Confirm",
	cancelText = "Cancel",
	variant = "default",
	onConfirm,
	loading = false,
}: ConfirmModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[400px] rounded-xl border border-border bg-card p-0 shadow-xl">
				<DialogHeader className="px-6 py-4">
					<DialogTitle className="font-display text-lg font-semibold">
						{title}
					</DialogTitle>
					<DialogDescription className="text-sm text-muted-foreground mt-1">
						{description}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="px-6 py-4 flex flex-row justify-end gap-2 border-t border-border">
					<DialogClose asChild>
						<Button variant="outline" disabled={loading}>
							{cancelText}
						</Button>
					</DialogClose>
					<Button
						variant={variant === "destructive" ? "destructive" : "default"}
						onClick={onConfirm}
						disabled={loading}
					>
						{loading ? "Processing..." : confirmText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
