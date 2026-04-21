"""Canonical permission catalog for authz MVP."""

from typing import Final

PERMISSIONS_VERSION: Final[str] = "2026-02-28-role-authz-mvp-v1"

# Bulk import / voice interview
BULK_IMPORT_MANAGE: Final[str] = "bulk_import:manage"
VOICE_INTERVIEW_MANAGE: Final[str] = "voice_interview:manage"

# Organization / user administration
ORGANIZATION_CREATE: Final[str] = "organization:create"
ORGANIZATION_UPDATE: Final[str] = "organization:update"
ORGANIZATION_ARCHIVE: Final[str] = "organization:archive"
ORGANIZATION_RESTORE: Final[str] = "organization:restore"
ORGANIZATION_PURGE: Final[str] = "organization:purge"
ORG_USER_READ: Final[str] = "org_user:read"
ORG_USER_CREATE: Final[str] = "org_user:create"
ORG_USER_UPDATE: Final[str] = "org_user:update"
ADMIN_USER_READ: Final[str] = "admin_user:read"
ADMIN_USER_CREATE: Final[str] = "admin_user:create"
ADMIN_USER_UPDATE: Final[str] = "admin_user:update"
ADMIN_USER_TRANSFER: Final[str] = "admin_user:transfer"

# Project
PROJECT_READ: Final[str] = "project:read"
PROJECT_CREATE: Final[str] = "project:create"
PROJECT_UPDATE: Final[str] = "project:update"
PROJECT_ARCHIVE: Final[str] = "project:archive"
PROJECT_RESTORE: Final[str] = "project:restore"
PROJECT_PURGE: Final[str] = "project:purge"
PROJECT_DELETE: Final[str] = "project:delete"
PROJECT_DATA_UPDATE: Final[str] = "project_data:update"

# Company
COMPANY_CREATE: Final[str] = "company:create"
COMPANY_UPDATE: Final[str] = "company:update"
COMPANY_ARCHIVE: Final[str] = "company:archive"
COMPANY_RESTORE: Final[str] = "company:restore"
COMPANY_PURGE: Final[str] = "company:purge"
COMPANY_DELETE: Final[str] = "company:delete"

# Company contacts
COMPANY_CONTACT_CREATE: Final[str] = "company_contact:create"
COMPANY_CONTACT_UPDATE: Final[str] = "company_contact:update"
COMPANY_CONTACT_DELETE: Final[str] = "company_contact:delete"

# Location
LOCATION_CREATE: Final[str] = "location:create"
LOCATION_UPDATE: Final[str] = "location:update"
LOCATION_ARCHIVE: Final[str] = "location:archive"
LOCATION_RESTORE: Final[str] = "location:restore"
LOCATION_PURGE: Final[str] = "location:purge"
LOCATION_DELETE: Final[str] = "location:delete"

# Location contacts
LOCATION_CONTACT_CREATE: Final[str] = "location_contact:create"
LOCATION_CONTACT_UPDATE: Final[str] = "location_contact:update"
LOCATION_CONTACT_DELETE: Final[str] = "location_contact:delete"

# Incoming materials
INCOMING_MATERIAL_CREATE: Final[str] = "incoming_material:create"
INCOMING_MATERIAL_UPDATE: Final[str] = "incoming_material:update"
INCOMING_MATERIAL_DELETE: Final[str] = "incoming_material:delete"

# Files, intake, proposals, feedback
FILE_READ: Final[str] = "file:read"
FILE_UPLOAD: Final[str] = "file:upload"
FILE_DELETE: Final[str] = "file:delete"
CHAT_READ: Final[str] = "chat:read"
CHAT_WRITE: Final[str] = "chat:write"
CHAT_ATTACHMENT_UPLOAD: Final[str] = "chat_attachment:upload"
INTAKE_UPDATE: Final[str] = "intake:update"
PROPOSAL_READ: Final[str] = "proposal:read"
PROPOSAL_GENERATE: Final[str] = "proposal:generate"
PROPOSAL_DELETE: Final[str] = "proposal:delete"
PROPOSAL_RATE: Final[str] = "proposal:rate"
FEEDBACK_CREATE: Final[str] = "feedback:create"
FEEDBACK_ATTACHMENT_UPLOAD: Final[str] = "feedback_attachment:upload"
FEEDBACK_READ: Final[str] = "feedback:read"
FEEDBACK_MODERATE: Final[str] = "feedback:moderate"


ALL_PERMISSIONS: Final[tuple[str, ...]] = (
    BULK_IMPORT_MANAGE,
    VOICE_INTERVIEW_MANAGE,
    ORGANIZATION_CREATE,
    ORGANIZATION_UPDATE,
    ORGANIZATION_ARCHIVE,
    ORGANIZATION_RESTORE,
    ORGANIZATION_PURGE,
    ORG_USER_READ,
    ORG_USER_CREATE,
    ORG_USER_UPDATE,
    ADMIN_USER_READ,
    ADMIN_USER_CREATE,
    ADMIN_USER_UPDATE,
    ADMIN_USER_TRANSFER,
    PROJECT_READ,
    PROJECT_CREATE,
    PROJECT_UPDATE,
    PROJECT_ARCHIVE,
    PROJECT_RESTORE,
    PROJECT_PURGE,
    PROJECT_DELETE,
    PROJECT_DATA_UPDATE,
    COMPANY_CREATE,
    COMPANY_UPDATE,
    COMPANY_ARCHIVE,
    COMPANY_RESTORE,
    COMPANY_PURGE,
    COMPANY_DELETE,
    COMPANY_CONTACT_CREATE,
    COMPANY_CONTACT_UPDATE,
    COMPANY_CONTACT_DELETE,
    LOCATION_CREATE,
    LOCATION_UPDATE,
    LOCATION_ARCHIVE,
    LOCATION_RESTORE,
    LOCATION_PURGE,
    LOCATION_DELETE,
    LOCATION_CONTACT_CREATE,
    LOCATION_CONTACT_UPDATE,
    LOCATION_CONTACT_DELETE,
    INCOMING_MATERIAL_CREATE,
    INCOMING_MATERIAL_UPDATE,
    INCOMING_MATERIAL_DELETE,
    FILE_READ,
    FILE_UPLOAD,
    FILE_DELETE,
    CHAT_READ,
    CHAT_WRITE,
    CHAT_ATTACHMENT_UPLOAD,
    INTAKE_UPDATE,
    PROPOSAL_READ,
    PROPOSAL_GENERATE,
    PROPOSAL_DELETE,
    PROPOSAL_RATE,
    FEEDBACK_CREATE,
    FEEDBACK_ATTACHMENT_UPLOAD,
    FEEDBACK_READ,
    FEEDBACK_MODERATE,
)
