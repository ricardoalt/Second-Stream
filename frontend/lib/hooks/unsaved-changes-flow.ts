export type UnsavedCloseResolution = {
	shouldClose: boolean;
	shouldOpenConfirm: boolean;
};

export function resolveUnsavedCloseAttempt(
	isDirty: boolean,
): UnsavedCloseResolution {
	if (isDirty) {
		return { shouldClose: false, shouldOpenConfirm: true };
	}

	return { shouldClose: true, shouldOpenConfirm: false };
}

export function resolveUnsavedCloseConfirm(): UnsavedCloseResolution {
	return { shouldClose: true, shouldOpenConfirm: false };
}

export function resolveUnsavedCloseCancel(): UnsavedCloseResolution {
	return { shouldClose: false, shouldOpenConfirm: false };
}
