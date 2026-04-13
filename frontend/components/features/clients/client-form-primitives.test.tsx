import { describe, expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
	AccountStatusToggle,
	ClientFieldLabel,
} from "@/components/features/clients/client-form-primitives";

describe("client-form-primitives", () => {
	it("renders ClientFieldLabel as semantic label linked by htmlFor", () => {
		const markup = renderToStaticMarkup(
			<ClientFieldLabel required htmlFor="company-name">
				Company name
			</ClientFieldLabel>,
		);

		expect(markup.includes("<label")).toBe(true);
		expect(markup.includes('for="company-name"')).toBe(true);
		expect(markup.includes("Company name")).toBe(true);
		expect(markup.includes("*")).toBe(true);
	});

	it("only forwards valid account status values to handler", () => {
		const onValueChange = mock(() => {});
		const element = AccountStatusToggle({
			value: "active",
			onValueChange,
			id: "account-status",
			"aria-label": "Account status",
		});

		element.props.onValueChange("lead");
		element.props.onValueChange("unexpected");

		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("lead");
		expect(element.props.id).toBe("account-status");
		expect(element.props["aria-label"]).toBe("Account status");
	});
});
