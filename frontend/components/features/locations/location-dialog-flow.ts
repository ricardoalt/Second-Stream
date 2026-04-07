type CloseAttemptInput = {
	isDirty: boolean;
};

type CloseAttemptResult = {
	shouldClose: boolean;
	showDiscardConfirm: boolean;
};

type DiscardConfirmInput = {
	isEditMode: boolean;
};

type DiscardConfirmResult = {
	shouldClose: boolean;
	onSuccessPayload?: null;
};

type DiscardCancelResult = {
	shouldClose: false;
	showDiscardConfirm: false;
};

type SubmitSuccessResult<TLocation> = {
	shouldClose: true;
	onSuccessPayload: TLocation;
};

export function resolveCloseAttempt(
	input: CloseAttemptInput,
): CloseAttemptResult {
	if (input.isDirty) {
		return {
			shouldClose: false,
			showDiscardConfirm: true,
		};
	}

	return {
		shouldClose: true,
		showDiscardConfirm: false,
	};
}

export function resolveDiscardConfirm(
	input: DiscardConfirmInput,
): DiscardConfirmResult {
	if (input.isEditMode) {
		return {
			shouldClose: true,
			onSuccessPayload: null,
		};
	}

	return {
		shouldClose: true,
	};
}

export function resolveDiscardCancel(): DiscardCancelResult {
	return {
		shouldClose: false,
		showDiscardConfirm: false,
	};
}

export function resolveSubmitSuccess<TLocation>(
	location: TLocation,
): SubmitSuccessResult<TLocation> {
	return {
		shouldClose: true,
		onSuccessPayload: location,
	};
}
