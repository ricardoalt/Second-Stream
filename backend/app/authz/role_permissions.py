"""Role -> permissions matrix for authz MVP."""

from __future__ import annotations

from app.authz import permissions
from app.models.user import UserRole

ORG_ADMIN_PERMISSIONS = frozenset(
    {
        permissions.BULK_IMPORT_MANAGE,
        permissions.VOICE_INTERVIEW_MANAGE,
        permissions.ORG_USER_READ,
        permissions.ORG_USER_CREATE,
        permissions.ORG_USER_UPDATE,
        permissions.PROJECT_READ,
        permissions.PROJECT_CREATE,
        permissions.PROJECT_UPDATE,
        permissions.PROJECT_ARCHIVE,
        permissions.PROJECT_RESTORE,
        permissions.PROJECT_PURGE,
        permissions.PROJECT_DELETE,
        permissions.PROJECT_DATA_UPDATE,
        permissions.COMPANY_CREATE,
        permissions.COMPANY_UPDATE,
        permissions.COMPANY_ARCHIVE,
        permissions.COMPANY_RESTORE,
        permissions.COMPANY_PURGE,
        permissions.COMPANY_DELETE,
        permissions.COMPANY_CONTACT_CREATE,
        permissions.COMPANY_CONTACT_UPDATE,
        permissions.COMPANY_CONTACT_DELETE,
        permissions.LOCATION_CREATE,
        permissions.LOCATION_UPDATE,
        permissions.LOCATION_ARCHIVE,
        permissions.LOCATION_RESTORE,
        permissions.LOCATION_PURGE,
        permissions.LOCATION_DELETE,
        permissions.LOCATION_CONTACT_CREATE,
        permissions.LOCATION_CONTACT_UPDATE,
        permissions.LOCATION_CONTACT_DELETE,
        permissions.INCOMING_MATERIAL_CREATE,
        permissions.INCOMING_MATERIAL_UPDATE,
        permissions.INCOMING_MATERIAL_DELETE,
        permissions.FILE_READ,
        permissions.FILE_UPLOAD,
        permissions.FILE_DELETE,
        permissions.INTAKE_UPDATE,
        permissions.PROPOSAL_READ,
        permissions.PROPOSAL_GENERATE,
        permissions.PROPOSAL_DELETE,
        permissions.PROPOSAL_RATE,
        permissions.FEEDBACK_CREATE,
        permissions.FEEDBACK_ATTACHMENT_UPLOAD,
    }
)

FIELD_AGENT_PERMISSIONS = frozenset(
    {
        permissions.BULK_IMPORT_MANAGE,
        permissions.VOICE_INTERVIEW_MANAGE,
        permissions.PROJECT_READ,
        permissions.PROJECT_CREATE,
        permissions.PROJECT_UPDATE,
        permissions.PROJECT_ARCHIVE,
        permissions.PROJECT_RESTORE,
        permissions.PROJECT_DELETE,
        permissions.PROJECT_DATA_UPDATE,
        permissions.COMPANY_CREATE,
        permissions.COMPANY_UPDATE,
        permissions.COMPANY_CONTACT_CREATE,
        permissions.COMPANY_CONTACT_UPDATE,
        permissions.COMPANY_CONTACT_DELETE,
        permissions.LOCATION_CREATE,
        permissions.LOCATION_UPDATE,
        permissions.LOCATION_CONTACT_CREATE,
        permissions.LOCATION_CONTACT_UPDATE,
        permissions.INCOMING_MATERIAL_CREATE,
        permissions.INCOMING_MATERIAL_UPDATE,
        permissions.FILE_READ,
        permissions.FILE_UPLOAD,
        permissions.FILE_DELETE,
        permissions.INTAKE_UPDATE,
        permissions.PROPOSAL_READ,
        permissions.PROPOSAL_GENERATE,
        permissions.PROPOSAL_DELETE,
        permissions.PROPOSAL_RATE,
        permissions.FEEDBACK_CREATE,
        permissions.FEEDBACK_ATTACHMENT_UPLOAD,
    }
)

ROLE_PERMISSIONS: dict[UserRole, frozenset[str]] = {
    UserRole.ADMIN: frozenset(permissions.ALL_PERMISSIONS),
    UserRole.ORG_ADMIN: ORG_ADMIN_PERMISSIONS,
    UserRole.FIELD_AGENT: FIELD_AGENT_PERMISSIONS,
    # contractor == field_agent (explicitly mapped to same permissions)
    UserRole.CONTRACTOR: FIELD_AGENT_PERMISSIONS,
    # compliance + sales are read-only in MVP
    UserRole.COMPLIANCE: frozenset(
        {
            permissions.PROJECT_READ,
            permissions.PROPOSAL_READ,
            permissions.FILE_READ,
        }
    ),
    UserRole.SALES: frozenset(
        {
            permissions.PROJECT_READ,
            permissions.PROPOSAL_READ,
            permissions.FILE_READ,
        }
    ),
}
