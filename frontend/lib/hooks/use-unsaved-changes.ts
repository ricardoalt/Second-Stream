import { useState } from "react";

/**
 * Guards dialog/modal close when there are unsaved changes.
 *
 * Usage:
 * ```tsx
 * const { showDiscardConfirm, guardClose, confirmDiscard, cancelDiscard } =
 *   useUnsavedChanges({ isDirty: form.state.isDirty, onDiscard: closeAndReset });
 *
 * <Dialog open={open} onOpenChange={(next) => { if (next) setOpen(true); else guardClose(); }}>
 *
 * <ConfirmModal
 *   open={showDiscardConfirm}
 *   onOpenChange={(next) => { if (!next) cancelDiscard(); }}
 *   title="Discard unsaved changes?"
 *   description="Your changes will be lost if you close without saving."
 *   confirmText="Discard"
 *   variant="destructive"
 *   onConfirm={confirmDiscard}
 * />
 * ```
 */
export function useUnsavedChanges({
	isDirty,
	onDiscard,
}: {
	isDirty: boolean;
	onDiscard: () => void;
}) {
	const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

	const guardClose = () => {
		if (isDirty) {
			setShowDiscardConfirm(true);
		} else {
			onDiscard();
		}
	};

	const confirmDiscard = () => {
		setShowDiscardConfirm(false);
		onDiscard();
	};

	const cancelDiscard = () => {
		setShowDiscardConfirm(false);
	};

	return { showDiscardConfirm, guardClose, confirmDiscard, cancelDiscard };
}
