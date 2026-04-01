import { describe, expect, it } from "bun:test";
import { ADD_USER_MODAL_COPY } from "./add-user-modal";

describe("AddUserModal copy and field contract", () => {
	it("defines honest labels for supported fields only", () => {
		expect(ADD_USER_MODAL_COPY.title).toBe("Add team member");
		expect(ADD_USER_MODAL_COPY.subtitle).toBe(
			"Enter the required account details.",
		);
		expect(ADD_USER_MODAL_COPY.fields).toEqual({
			firstName: "First name",
			lastName: "Last name",
			email: "Email address",
			role: "Role",
			password: "Password",
			confirmPassword: "Confirm password",
		});

		const serialized = JSON.stringify(ADD_USER_MODAL_COPY);
		expect(serialized).not.toContain("Full Name");
		expect(serialized).not.toContain("industrial console");
	});
});
