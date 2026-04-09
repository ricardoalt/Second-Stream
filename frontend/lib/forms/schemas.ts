/**
 * Form Schemas - Zod validation schemas for all forms
 * Single source of truth for form validation
 */
import { z } from "zod";
import { isSectorId, isSubsectorInSector } from "@/lib/sectors-config";
import {
	ACCOUNT_STATUSES,
	ADDRESS_TYPES,
	CUSTOMER_TYPES,
} from "@/lib/types/company";

export const ZIP_CODE_REGEX = /^\d{5}(-\d{4})?$/;
export const ZIP_CODE_REQUIRED_MESSAGE = "ZIP code is required";
export const ZIP_CODE_FORMAT_MESSAGE = "Enter ZIP as 12345 or 12345-6789";

export function parseZipCode(value: string): string {
	return value.trim();
}

export function isValidZipCode(value: string): boolean {
	return ZIP_CODE_REGEX.test(value);
}

// =============================================================================
// SHARED VALIDATION PATTERNS
// =============================================================================

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_MIN_LENGTH = 3;
export const PHONE_MAX_LENGTH = 50;

export function isValidEmail(value: string): boolean {
	return EMAIL_REGEX.test(value);
}

/**
 * Phone: 3-50 chars, at least one digit.
 * Permissive — supports international formats, extensions, etc.
 */
export function isValidPhone(value: string): boolean {
	return (
		value.length >= PHONE_MIN_LENGTH &&
		value.length <= PHONE_MAX_LENGTH &&
		/[0-9]/.test(value)
	);
}

// =============================================================================
// COMPANY SCHEMAS
// =============================================================================

export const companySchema = z.object({
	name: z.string().min(1, "Company name is required").max(100),
	customerType: z.enum(CUSTOMER_TYPES, {
		required_error: "Please select a customer type",
	}),
	industry: z.string().optional(),
	sector: z.string().min(1, "Please select a sector"),
	subsector: z.string().min(1, "Please select a subsector"),
	notes: z.string().optional(),
});

export type CompanyFormData = z.infer<typeof companySchema>;

export const addClientSchema = z
	.object({
		name: z.string().min(1, "Client name is required").max(255),
		sector: z
			.string()
			.min(1, "Please select a sector")
			.refine((value) => isSectorId(value.trim()), {
				message: "Please select a valid sector",
			}),
		subsector: z.string().default(""),
		customerType: z.enum(CUSTOMER_TYPES, {
			required_error: "Please select a customer type",
		}),
		accountStatus: z
			.enum(ACCOUNT_STATUSES, {
				required_error: "Please select an account status",
			})
			.default("active"),
		companyNotes: z.string().optional(),
		contactName: z.string().default(""),
		contactTitle: z.string().default(""),
		contactEmail: z.string().default(""),
		contactPhone: z.string().default(""),
		locationName: z.string().default(""),
		locationAddress: z.string().default(""),
		locationCity: z.string().default(""),
		locationState: z.string().default(""),
		locationZipCode: z
			.string()
			.transform(parseZipCode)
			.refine((value) => value.length === 0 || isValidZipCode(value), {
				message: ZIP_CODE_FORMAT_MESSAGE,
			})
			.default(""),
	})
	.refine(
		(data) => {
			const subsector = data.subsector.trim();
			if (subsector.length === 0) {
				return true;
			}

			return isSubsectorInSector(data.sector.trim(), subsector);
		},
		{
			message: "Please select a valid subsector for the selected sector.",
			path: ["subsector"],
		},
	)
	.refine(
		(data) => {
			const email = data.contactEmail.trim();
			return email.length === 0 || isValidEmail(email);
		},
		{ message: "Enter a valid email address.", path: ["contactEmail"] },
	)
	.refine(
		(data) => {
			const phone = data.contactPhone.trim();
			return phone.length === 0 || isValidPhone(phone);
		},
		{
			message: "Phone must be 3-50 characters and include at least one digit.",
			path: ["contactPhone"],
		},
	);

export type AddClientFormData = z.infer<typeof addClientSchema>;

export const editClientSchema = z
	.object({
		companyName: z.string().trim().min(1, "Company name is required").max(255),
		sector: z
			.string()
			.min(1, "Please select a sector")
			.refine((value) => isSectorId(value.trim()), {
				message: "Please select a valid sector",
			}),
		subsector: z.string().default(""),
		accountStatus: z.enum(ACCOUNT_STATUSES, {
			required_error: "Please select an account status",
		}),
		companyNotes: z.string().default(""),
		contactName: z.string().default(""),
		contactTitle: z.string().default(""),
		contactEmail: z.string().default(""),
		contactPhone: z.string().default(""),
	})
	.refine(
		(data) => {
			const subsector = data.subsector.trim();
			if (subsector.length === 0) {
				return true;
			}

			return isSubsectorInSector(data.sector.trim(), subsector);
		},
		{
			message: "Please select a valid subsector for the selected sector.",
			path: ["subsector"],
		},
	)
	.refine(
		(data) => {
			const email = data.contactEmail.trim();
			return email.length === 0 || isValidEmail(email);
		},
		{ message: "Enter a valid email address.", path: ["contactEmail"] },
	)
	.refine(
		(data) => {
			const phone = data.contactPhone.trim();
			return phone.length === 0 || isValidPhone(phone);
		},
		{
			message: "Phone must be 3-50 characters and include at least one digit.",
			path: ["contactPhone"],
		},
	);

export type EditClientFormData = z.infer<typeof editClientSchema>;

// Partial schema for step 1 only (basic info)
export const companyBasicSchema = companySchema.pick({
	name: true,
	industry: true,
	sector: true,
	subsector: true,
	customerType: true,
	notes: true,
});

// =============================================================================
// COMPANY CONTACT SCHEMAS
// =============================================================================

/**
 * Company contact: at least one identity field (name | email | phone).
 * Email/phone validated only when provided.
 */
export const companyContactSchema = z
	.object({
		name: z.string().default(""),
		email: z.string().default(""),
		phone: z.string().default(""),
		title: z.string().default(""),
		notes: z.string().default(""),
		isPrimary: z.boolean().default(false),
	})
	.refine(
		(data) =>
			data.name.trim().length > 0 ||
			data.email.trim().length > 0 ||
			data.phone.trim().length > 0,
		{
			message: "Provide at least a name, email, or phone number.",
			path: ["_identity"],
		},
	)
	.refine(
		(data) => {
			const email = data.email.trim();
			return email.length === 0 || isValidEmail(email);
		},
		{ message: "Enter a valid email address.", path: ["email"] },
	)
	.refine(
		(data) => {
			const phone = data.phone.trim();
			return phone.length === 0 || isValidPhone(phone);
		},
		{
			message: "Phone must be 3-50 characters and include at least one digit.",
			path: ["phone"],
		},
	);

export type CompanyContactFormData = z.infer<typeof companyContactSchema>;

// =============================================================================
// LOCATION SCHEMAS
// =============================================================================

export const locationSchema = z.object({
	name: z.string().min(1, "Location name is required").max(255),
	addressType: z.enum(ADDRESS_TYPES, {
		required_error: "Please select an address type",
	}),
	city: z.string().min(1, "City is required").max(100),
	state: z.string().min(1, "State is required").max(100),
	address: z.string().max(500).default(""),
	zipCode: z
		.string()
		.transform(parseZipCode)
		.refine((value) => value.length > 0, {
			message: ZIP_CODE_REQUIRED_MESSAGE,
		})
		.refine((value) => isValidZipCode(value), {
			message: ZIP_CODE_FORMAT_MESSAGE,
		})
		.default(""),
	notes: z.string().max(1000).default(""),
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
