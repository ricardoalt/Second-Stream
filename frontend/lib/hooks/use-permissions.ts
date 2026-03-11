import { PERMISSIONS } from "@/lib/authz/permissions";
import { useAuth } from "@/lib/contexts/auth-context";
import type { ProjectSummary } from "@/lib/project-types";
import type { CompanySummary, LocationSummary } from "@/lib/types/company";

export function usePermissions() {
	const { user } = useAuth();
	const hasPermission = (permission: string): boolean =>
		Boolean(user?.permissions?.includes(permission));
	const hasProjectAdminBypass = hasPermission(PERMISSIONS.PROJECT_PURGE);
	const hasCompanyAdminBypass = hasPermission(PERMISSIONS.COMPANY_ARCHIVE);
	const hasLocationAdminBypass = hasPermission(PERMISSIONS.LOCATION_ARCHIVE);

	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// COMPANY PERMISSIONS
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

	const canEditCompany = (company: CompanySummary): boolean => {
		if (!hasPermission(PERMISSIONS.COMPANY_UPDATE)) return false;
		return hasCompanyAdminBypass || company.createdByUserId === user?.id;
	};

	const canDeleteCompany = (): boolean =>
		hasPermission(PERMISSIONS.COMPANY_DELETE);

	const canArchiveCompany = (): boolean =>
		hasPermission(PERMISSIONS.COMPANY_ARCHIVE);

	const canRestoreCompany = (): boolean =>
		hasPermission(PERMISSIONS.COMPANY_RESTORE);

	const canPurgeCompany = (): boolean =>
		hasPermission(PERMISSIONS.COMPANY_PURGE);

	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// LOCATION PERMISSIONS
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

	const canEditLocation = (location: LocationSummary): boolean => {
		if (!hasPermission(PERMISSIONS.LOCATION_UPDATE)) return false;
		return hasLocationAdminBypass || location.createdByUserId === user?.id;
	};

	const canDeleteLocation = (): boolean =>
		hasPermission(PERMISSIONS.LOCATION_DELETE);

	const canArchiveLocation = (): boolean =>
		hasPermission(PERMISSIONS.LOCATION_ARCHIVE);

	const canRestoreLocation = (): boolean =>
		hasPermission(PERMISSIONS.LOCATION_RESTORE);

	const canPurgeLocation = (): boolean =>
		hasPermission(PERMISSIONS.LOCATION_PURGE);

	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// PROJECT PERMISSIONS
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

	const canEditProject = (project: ProjectSummary): boolean => {
		if (!hasPermission(PERMISSIONS.PROJECT_UPDATE)) return false;
		return hasProjectAdminBypass || project.userId === user?.id;
	};

	const canUpdateProjects = (): boolean =>
		hasPermission(PERMISSIONS.PROJECT_UPDATE);

	const canDeleteProject = (project: ProjectSummary): boolean => {
		if (!hasPermission(PERMISSIONS.PROJECT_DELETE)) return false;
		return hasProjectAdminBypass || project.userId === user?.id;
	};

	const canArchiveProject = (project: ProjectSummary): boolean => {
		if (!hasPermission(PERMISSIONS.PROJECT_ARCHIVE)) return false;
		return hasProjectAdminBypass || project.userId === user?.id;
	};

	const canRestoreProject = (project: ProjectSummary): boolean => {
		if (!hasPermission(PERMISSIONS.PROJECT_RESTORE)) return false;
		return hasProjectAdminBypass || project.userId === user?.id;
	};

	const canPurgeProject = (): boolean =>
		hasPermission(PERMISSIONS.PROJECT_PURGE);

	const canReadOrgUsers = (): boolean =>
		hasPermission(PERMISSIONS.ORG_USER_READ);

	const canCreateOrgUsers = (): boolean =>
		hasPermission(PERMISSIONS.ORG_USER_CREATE);

	const canUpdateOrgUsers = (): boolean =>
		hasPermission(PERMISSIONS.ORG_USER_UPDATE);

	const canReadAdminUsers = (): boolean =>
		hasPermission(PERMISSIONS.ADMIN_USER_READ);

	const canCreateAdminUsers = (): boolean =>
		hasPermission(PERMISSIONS.ADMIN_USER_CREATE);

	return {
		// Company
		canEditCompany,
		canDeleteCompany,
		canArchiveCompany,
		canRestoreCompany,
		canPurgeCompany,
		// Location
		canEditLocation,
		canDeleteLocation,
		canArchiveLocation,
		canRestoreLocation,
		canPurgeLocation,
		// Project
		canEditProject,
		canUpdateProjects,
		canDeleteProject,
		canArchiveProject,
		canRestoreProject,
		canPurgeProject,
		// User management
		canReadOrgUsers,
		canCreateOrgUsers,
		canUpdateOrgUsers,
		canReadAdminUsers,
		canCreateAdminUsers,
	};
}
