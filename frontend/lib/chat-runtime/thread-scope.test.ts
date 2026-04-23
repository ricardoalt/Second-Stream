import { describe, expect, it } from "bun:test";
import { buildChatThreadsQueryKey } from "@/lib/chat-runtime/query-keys";
import {
	resolveChatThreadOrganizationId,
	resolveChatThreadScope,
} from "@/lib/chat-runtime/thread-scope";

describe("chat thread scope resolver", () => {
	it("prioritiza organizationId de localStorage cuando existe", () => {
		expect(
			resolveChatThreadOrganizationId({
				storageOrganizationId: "org-storage",
				selectedOrgId: "org-selected",
				fallbackOrganizationId: "org-user",
				isSuperuser: true,
			}),
		).toBe("org-storage");
	});

	it("usa fallback explícito cuando no hay selected org en storage", () => {
			expect(
			resolveChatThreadOrganizationId({
				storageOrganizationId: null,
				selectedOrgId: null,
				fallbackOrganizationId: "org-user",
				isSuperuser: true,
			}),
		).toBe("org-user");
	});

	it("ignora selected/storage para usuarios normales y usa org del usuario", () => {
		expect(
			resolveChatThreadOrganizationId({
				storageOrganizationId: "org-storage",
				selectedOrgId: "org-selected",
				fallbackOrganizationId: "org-user",
				isSuperuser: false,
			}),
		).toBe("org-user");
	});

	it("construye query key con la fuente canónica de scope", () => {
		const scope = resolveChatThreadScope({
			storageOrganizationId: "org-storage",
			fallbackOrganizationId: "org-user",
			userId: "user-11",
			isSuperuser: true,
		});

		expect(buildChatThreadsQueryKey(scope)).toEqual([
			"chat-threads",
			"org-storage",
			"user-11",
		]);
	});
});
