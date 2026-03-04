export type UserRole =
	| "admin"
	| "org_admin"
	| "field_agent"
	| "contractor"
	| "compliance"
	| "sales";

export interface User {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	companyName?: string | undefined;
	location?: string | undefined;
	sector?: string | undefined;
	subsector?: string | undefined;
	isVerified: boolean;
	isActive: boolean;
	createdAt: string;
	isSuperuser: boolean;
	role: UserRole;
	organizationId: string | null;
	permissions: string[];
	permissionsVersion: string;
}
