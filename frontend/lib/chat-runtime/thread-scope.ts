import type { ChatThreadsQueryScope } from "@/lib/api/chat";
import { SELECTED_ORG_STORAGE_KEY } from "@/lib/constants/storage";

type ChatThreadOrganizationResolverOptions = {
	selectedOrgId?: string | null;
	fallbackOrganizationId?: string | null;
	storageOrganizationId?: string | null;
	isSuperuser?: boolean;
};

type ChatThreadScopeResolverOptions = ChatThreadOrganizationResolverOptions & {
	userId?: string | null;
};

function normalizeId(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function getOrganizationIdFromStorage(): string | null {
	if (typeof window === "undefined") {
		return null;
	}

	return normalizeId(localStorage.getItem(SELECTED_ORG_STORAGE_KEY));
}

export function resolveChatThreadOrganizationId(
	options: ChatThreadOrganizationResolverOptions,
): string | null {
	if (!options.isSuperuser) {
		return normalizeId(options.fallbackOrganizationId);
	}

	const storageOrganizationId =
		options.storageOrganizationId !== undefined
			? normalizeId(options.storageOrganizationId)
			: getOrganizationIdFromStorage();

	if (storageOrganizationId) {
		return storageOrganizationId;
	}

	return (
		normalizeId(options.selectedOrgId) ??
		normalizeId(options.fallbackOrganizationId)
	);
}

export function resolveChatThreadScope(
	options: ChatThreadScopeResolverOptions,
): ChatThreadsQueryScope {
	return {
		organizationId: resolveChatThreadOrganizationId(options),
		userId: normalizeId(options.userId),
	};
}
