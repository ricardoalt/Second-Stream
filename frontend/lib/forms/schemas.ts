/**
 * Form Schemas - Zod validation schemas for all forms
 * Single source of truth for form validation
 */
import { z } from "zod";

// =============================================================================
// COMPANY SCHEMAS
// =============================================================================

export const companySchema = z.object({
	name: z.string().min(1, "Company name is required").max(100),
	customerType: z.enum(["buyer", "generator", "both"], {
		required_error: "Please select a customer type",
	}),
	industry: z.string().optional(),
	sector: z.string().min(1, "Please select a sector"),
	subsector: z.string().min(1, "Please select a subsector"),
	contactName: z.string().optional(),
	contactEmail: z
		.string()
		.email("Invalid email format")
		.optional()
		.or(z.literal("")),
	contactPhone: z.string().optional(),
	notes: z.string().optional(),
});

export type CompanyFormData = z.infer<typeof companySchema>;

// Partial schema for step 1 only (basic info)
export const companyBasicSchema = companySchema.pick({
	name: true,
	industry: true,
	contactName: true,
	contactEmail: true,
	contactPhone: true,
	notes: true,
});

// =============================================================================
// LOCATION SCHEMAS
// =============================================================================

export const locationSchema = z.object({
	name: z.string().min(1, "Location name is required").max(100),
	addressType: z.enum(["headquarters", "pickup", "delivery", "billing"], {
		required_error: "Please select an address type",
	}),
	city: z.string().min(1, "City is required"),
	state: z.string().min(1, "State is required"),
	address: z.string().default(""),
	zipCode: z
		.string()
		.trim()
		.min(1, "ZIP code is required")
		.regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP format")
		.default(""),
	notes: z.string().default(""),
});

export type LocationFormData = z.infer<typeof locationSchema>;

// =============================================================================
// PROJECT/ASSESSMENT SCHEMAS
// =============================================================================

export const projectSchema = z.object({
	name: z.string().min(1, "Assessment name is required").max(100),
	companyId: z.string().min(1, "Please select a company"),
	locationId: z.string().min(1, "Please select a location"),
	description: z.string().optional(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get first error message from Zod validation
 */
export function getFirstError(
	result: z.SafeParseReturnType<unknown, unknown>,
): string | null {
	if (result.success) return null;
	const firstError = result.error.errors[0];
	return firstError?.message ?? "Validation error";
}

/**
 * Format Zod errors into a record for form fields
 */
export function formatErrors(
	result: z.SafeParseReturnType<unknown, unknown>,
): Record<string, string> {
	if (result.success) return {};
	return result.error.errors.reduce(
		(acc, err) => {
			const path = err.path.join(".");
			if (path && !acc[path]) {
				acc[path] = err.message;
			}
			return acc;
		},
		{} as Record<string, string>,
	);
}
