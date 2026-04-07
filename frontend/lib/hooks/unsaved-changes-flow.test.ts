import { describe, expect, it } from "bun:test";
import {
	resolveUnsavedCloseAttempt,
	resolveUnsavedCloseCancel,
	resolveUnsavedCloseConfirm,
} from "./unsaved-changes-flow";

describe("unsaved changes close flow", () => {
	it("opens confirm when user tries closing a dirty form", () => {
		expect(resolveUnsavedCloseAttempt(true)).toEqual({
			shouldClose: false,
			shouldOpenConfirm: true,
		});
	});

	it("closes immediately when form is clean", () => {
		expect(resolveUnsavedCloseAttempt(false)).toEqual({
			shouldClose: true,
			shouldOpenConfirm: false,
		});
	});

	it("resolves confirm and cancel actions predictably", () => {
		expect(resolveUnsavedCloseConfirm()).toEqual({
			shouldClose: true,
			shouldOpenConfirm: false,
		});

		expect(resolveUnsavedCloseCancel()).toEqual({
			shouldClose: false,
			shouldOpenConfirm: false,
		});
	});
});
