import { describe, expect, it } from "bun:test";
import {
	resolveCloseAttempt,
	resolveDiscardCancel,
	resolveDiscardConfirm,
	resolveSubmitSuccess,
} from "./location-dialog-flow";

describe("location dialog flow", () => {
	it("create location: submit emits saved location and cancel closes without synthetic success", () => {
		const createdLocation = { id: "loc-1", name: "Houston" };

		expect(resolveSubmitSuccess(createdLocation)).toEqual({
			shouldClose: true,
			onSuccessPayload: createdLocation,
		});

		expect(resolveDiscardConfirm({ isEditMode: false })).toEqual({
			shouldClose: true,
			onSuccessPayload: undefined,
		});
	});

	it("edit location: dirty close opens discard confirmation and cancel keeps dialog open", () => {
		expect(resolveCloseAttempt({ isDirty: true })).toEqual({
			shouldClose: false,
			showDiscardConfirm: true,
		});

		expect(resolveDiscardCancel()).toEqual({
			shouldClose: false,
			showDiscardConfirm: false,
		});
	});
});
