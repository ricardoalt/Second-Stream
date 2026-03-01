# Especificacion simplificada Role/AuthZ (MVP)

## Objetivo
- Authz simple, mantenible, segura para multi-tenant.
- Permiso nuevo en flujo fijo de 5 pasos.
- Cero drift FE/BE en rutas criticas.

## Alcance
- Backend: unica capa de autorizacion.
- Frontend: gating UX con permisos efectivos.
- Rollout corto en rutas criticas primero.
- Fuera de alcance por ahora: Oso/OpenFGA/Casbin.

## Principios no negociables
- Single source of truth de permisos.
- Deny-by-default.
- Tenant isolation primero.
- FE no autoriza; BE decide siempre.
- Ownership explicito en backend, nunca implicito.

## Reglas base cerradas
- Invariante: `is_superuser=true` implica `role=admin` y `organization_id=NULL`.
- No superuser: permisos solo dentro de su org activa.
- Tenant-scoped + superuser: `X-Organization-Id` obligatorio, sin excepciones.
- Contrato HTTP auth/authz unico (English):
  - `401 Unauthorized`: "Authentication required".
  - `400 Bad Request`: "Malformed request or malformed X-Organization-Id header".
  - `403 Forbidden`: "Insufficient permission or no access to organization scope".
  - `404 Not Found`: "Resource not found" (solo si el caller ya esta en scope autorizado).
- Error payload contract (English, stable):
  - Shape: `{ "code": string, "message": string, "details"?: object }`.
  - `401`: `AUTH_REQUIRED`
  - `400`: `BAD_REQUEST` | `ORG_HEADER_MALFORMED`
  - `403`: `FORBIDDEN` | `ORG_ACCESS_DENIED`
  - `404`: `RESOURCE_NOT_FOUND`
- Normalizacion de rol efectiva en authz:
  - `contractor` se evalua como `field_agent` en MVP.
  - `compliance` y `sales` quedan read-only en MVP.
- User management se mantiene como hoy:
  - Org admins gestionan team en `/settings/team`.
  - Platform admins gestionan via Admin Console (`/admin/users`).

## Modelo minimo

### Permisos
- Formato MVP: `resource:action`.
- Ejemplos: `company:create`, `company:update`, `project:delete`, `user:manage`.
- Ownership (`own` vs `any`) se evalua en regla backend del recurso.

### Matriz rol -> permisos
- Un mapa unico e inmutable.
- Roles sin permisos explicitos quedan sin acceso (deny-by-default).

### Evaluacion runtime
- API unica: `can(user, permission, resource?, context?) -> bool`.
- Orden fijo:
  1. Resolver org context.
  2. Validar tenant scope.
  3. Validar permiso por rol.
  4. Evaluar ownership si aplica.
  5. Allow/deny.

### Superadmin en rutas tenant-scoped
- `X-Organization-Id` obligatorio.
- Sin header o malformado: `400`.
- Org inaccesible/inactiva: `403`.
- Nunca inferir org desde estado FE.

## Arquitectura minima objetivo

### Backend
- `backend/app/authz/permissions.py`: catalogo canonico.
- `backend/app/authz/role_permissions.py`: matriz rol -> permisos.
- `backend/app/authz/authz.py`: resolver contexto + `effective_role(...)` + `can()` + `require_permission()`.
- `backend/app/authz/contract_v1.py` (o equivalente): tabla ejecutable `endpoint -> permission -> ownership -> error_mode`.

### Endpoints
- Mutating: siempre `Depends(require_permission("resource:action"))`.
- Read: permiso de lectura explicito + query scoped por org.
- Prohibido check inline por rol en endpoints migrados.

### Frontend
- `/me` expone `permissions[]` efectivos para la org activa.
- Cambio de org => recalcular `permissions[]` en backend y refrescar estado FE.
- `/me` incluye `organization_id` activa y `permissions_version` para invalidar cache.
- FE usa `usePermissions()` solo para show/hide/disable.
- FE no usa `role` para autorizar acciones.

## Gates pre-implementacion (must pass)
- Gate 1 - Contrato ejecutable authz v1:
  - Congelar tabla `endpoint -> permission -> ownership -> error_mode` para vertical MVP.
  - Ownership canonico se define por endpoint (no solo por recurso).
  - Regla fija: `404` solo para recurso inexistente dentro de scope autorizado; fuera de scope siempre `403`.
  - Sin entrada en contrato: endpoint mutating no se migra.
- Gate 2 - Contrato HTTP testeado:
  - Tests de contrato para `401/400/403/404` en rutas MVP.
  - `X-Organization-Id` missing/malformed/inaccessible/inactive cubierto.
  - Error malformado debe responder `400` (no `422`) en paths authz migrados.
- Gate 3 - Contrato FE `/me` cerrado:
  - `permissions[]` org-scoped + `organization_id` + `permissions_version`.
  - Cambio de org fuerza refresh y reemplaza permisos locales.
- Gate 4 - Enforcement unico backend:
  - Endpoints mutating MVP usan `require_permission(...)`.
  - Prohibido check inline por `role` en endpoints migrados.
- Gate 5 - Guardrail CI temprano:
  - Fuente de verdad: `contract_v1`.
  - CI falla si endpoint mutating MVP no declara permiso en contrato o no usa enforcement unico.
  - CI falla si endpoint migrado contiene check inline por `role`.
  - Script obligatorio: `backend/scripts/check_authz_coverage.py`.
- Gate 6 - Baseline de regresion authz:
  - Matriz role x permission minima.
  - Integracion allow/deny por endpoint critico.
  - Casos cross-tenant + superadmin sin header obligatorios.
- Gate 7 - Data hardening minimo:
  - Auditoria y saneamiento de invariantes `is_superuser <-> role=admin` y `organization_id`.
  - Constraints DB se aplican despues de auditoria en post-MVP.

## Flujo estandar de permiso nuevo
1. Agregar permiso en `permissions.py`.
2. Asignar en `role_permissions.py`.
3. Proteger endpoint con `require_permission(...)`.
4. Agregar test de matriz + test de integracion endpoint.
5. Consumir en FE solo si aplica gating UX.

## Rollout MVP (max 3 pasos)

### Paso 1 - Congelar semantica
- Cerrar tabla role x permission.
- Documentar y validar invariante `is_superuser <-> role=admin`.
- Cerrar ownership canonico por endpoint critico en `contract_v1`.
- Cerrar inventory endpoint->permission para vertical MVP.
- Cerrar contrato `/me` org-scoped (`permissions[]`, `organization_id`, `permissions_version`).

### Paso 2 - Migrar vertical critica
- Implementar `authz.py` minimo.
- Migrar primero bulk import, voice interview, mutaciones de project/company.
- Eliminar checks FE conflictivos en esos flujos.
- Reemplazar gating FE por role en flujos migrados con `permissions[]`.

### Paso 3 - Blindar con tests
- Matriz minima role x permission.
- Integracion de endpoints criticos migrados.
- Contract tests HTTP `401/400/403/404` y casos de header org.
- Solo luego expandir al resto del dominio.

## Hardening post-MVP (despues)
- CI guard global para rutas mutating sin `require_permission(...)`.
- Logs estructurados de decisiones authz.
- Enum de roles + invariantes DB tras auditoria de datos.

## Criterios de aceptacion
- Permiso nuevo en 5 cambios estandar maximo.
- Rutas criticas sin checks inline por rol.
- FE/BE alineados en rutas criticas.
- Suite authz en verde.
- Contrato HTTP 401/400/403/404 consistente en endpoints migrados.
- `/me` org-scoped estable: sin permisos stale despues de cambiar org.
- CI bloquea endpoints mutating sin contrato/enforcement.

## Quality targets (post-MVP)
- Simplicidad >= 9/10: 1 path de enforcement y 0 excepciones ad-hoc en verticales migradas.
- Mantenibilidad >= 9/10: permiso nuevo sigue flujo estandar sin tocar logica dispersa.
- Production-readiness >= 8.5/10: contrato HTTP estable + regresion authz cubierta + observabilidad minima activa.

## Riesgos
- No forzar invariantes admin/superadmin => lockout o over-permission.
- Ownership mal definido => acceso horizontal indebido.
- Migrar todo de golpe => regresiones.

## Resolved decisions
- `contractor = field_agent` en MVP (misma capacidad operativa).
- `compliance` y `sales` en MVP = read-only.
- Team management se mantiene: org admin en `/settings/team`; superadmin en Admin Console.
- Contrato HTTP final en English confirmado: `401/400/403/404` segun reglas de este spec.
