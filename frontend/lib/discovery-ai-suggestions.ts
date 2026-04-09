export const AI_CREATE_COMPANY_SELECTION_PREFIX = "__ai_create_company__::";
export const AI_CREATE_LOCATION_SELECTION_PREFIX = "__ai_create_location__::";

export function buildAiCreateCompanySelection(name: string): string {
	return `${AI_CREATE_COMPANY_SELECTION_PREFIX}${name}`;
}

export function buildAiCreateLocationSelection(label: string): string {
	return `${AI_CREATE_LOCATION_SELECTION_PREFIX}${label}`;
}

export function parseAiCreateCompanySelection(value: string): string | null {
	if (!value.startsWith(AI_CREATE_COMPANY_SELECTION_PREFIX)) {
		return null;
	}

	const parsed = value.slice(AI_CREATE_COMPANY_SELECTION_PREFIX.length).trim();
	return parsed.length > 0 ? parsed : null;
}

export function parseAiCreateLocationSelection(value: string): string | null {
	if (!value.startsWith(AI_CREATE_LOCATION_SELECTION_PREFIX)) {
		return null;
	}

	const parsed = value.slice(AI_CREATE_LOCATION_SELECTION_PREFIX.length).trim();
	return parsed.length > 0 ? parsed : null;
}
