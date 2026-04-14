#!/usr/bin/env python3
"""
Script para purgar todas las organizaciones de test excepto la org principal (dsr).

Uso:
    cd backend && python scripts/purge_test_orgs.py [--dry-run] [--verbose]

Opciones:
    --dry-run: Solo muestra lo que se eliminaría sin borrar nada
    --verbose: Muestra detalle de cada operación
    --yes: Confirma automáticamente sin preguntar
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Add app to path
sys.path.insert(0, "/Users/ricardoaltamirano/Developer/SecondStream/backend")

from app.core.config import settings
from app.models.bulk_import import ImportItem, ImportRun
from app.models.company import Company
from app.models.company_contact import CompanyContact
from app.models.discovery_session import DiscoverySession, DiscoverySource
from app.models.feedback_attachment import FeedbackAttachment
from app.models.file import ProjectFile
from app.models.incoming_material import IncomingMaterial
from app.models.intake_note import IntakeNote
from app.models.intake_suggestion import IntakeSuggestion
from app.models.intake_unmapped_note import IntakeUnmappedNote
from app.models.location import Location
from app.models.location_contact import LocationContact
from app.models.organization import Organization
from app.models.organization_purge_manifest import OrganizationPurgeManifest
from app.models.project import Project
from app.models.proposal import Proposal
from app.models.proposal_rating import ProposalRating
from app.models.timeline import TimelineEvent
from app.models.user import User
from app.models.voice_interview import VoiceInterview

# Slugs de organizaciones a conservar (no eliminar)
PROTECTED_SLUGS = {"dsr", "movistar", "acme-org"}

# Orden de eliminación (respetando dependencias de FK)
# Tablas hoja primero, raíz al final
DELETION_ORDER: list[tuple[str, Any]] = [
    ("feedback_attachments", FeedbackAttachment),
    ("proposal_ratings", ProposalRating),
    ("intake_unmapped_notes", IntakeUnmappedNote),
    ("intake_suggestions", IntakeSuggestion),
    ("intake_notes", IntakeNote),
    ("timeline_events", TimelineEvent),
    ("project_files", ProjectFile),
    ("proposals", Proposal),
    ("projects", Project),
    ("discovery_sources", DiscoverySource),
    ("discovery_sessions", DiscoverySession),
    ("import_items", ImportItem),
    ("import_runs", ImportRun),
    ("voice_interviews", VoiceInterview),
    ("location_contacts", LocationContact),
    ("company_contacts", CompanyContact),
    ("incoming_materials", IncomingMaterial),
    ("locations", Location),
    ("companies", Company),
    ("organization_purge_manifests", OrganizationPurgeManifest),
    ("users", User),  # Excepto superusers que no tienen organization_id
    ("organizations", Organization),
]


@dataclass
class PurgeStats:
    """Estadísticas de la purga."""

    orgs_found: int = 0
    orgs_skipped: int = 0  # La org 'dsr'
    orgs_deleted: int = 0
    records_by_table: dict[str, int] = None

    def __post_init__(self):
        if self.records_by_table is None:
            self.records_by_table = {}


async def get_test_organizations(db: AsyncSession) -> list[Organization]:
    """Obtiene todas las organizaciones excepto las protegidas."""
    result = await db.execute(
        select(Organization)
        .where(~Organization.slug.in_(PROTECTED_SLUGS))
        .order_by(Organization.created_at)
    )
    return list(result.scalars().all())


async def count_records_by_org(db: AsyncSession, org_id: UUID) -> dict[str, int]:
    """Cuenta registros por tabla para una organización."""
    counts = {}

    # Contar users (solo los de la org, no superusers)
    user_count = await db.execute(select(func.count(User.id)).where(User.organization_id == org_id))
    counts["users"] = user_count.scalar_one() or 0

    # Contar companies
    company_count = await db.execute(
        select(func.count(Company.id)).where(Company.organization_id == org_id)
    )
    counts["companies"] = company_count.scalar_one() or 0

    # Contar locations
    location_count = await db.execute(
        select(func.count(Location.id)).where(Location.organization_id == org_id)
    )
    counts["locations"] = location_count.scalar_one() or 0

    # Contar projects
    project_count = await db.execute(
        select(func.count(Project.id)).where(Project.organization_id == org_id)
    )
    counts["projects"] = project_count.scalar_one() or 0

    # Contar proposals
    proposal_count = await db.execute(
        select(func.count(Proposal.id)).where(Proposal.organization_id == org_id)
    )
    counts["proposals"] = proposal_count.scalar_one() or 0

    return counts


async def delete_organization_data(
    db: AsyncSession,
    org: Organization,
    dry_run: bool = False,
    verbose: bool = False,
) -> dict[str, int]:
    """Elimina todos los datos de una organización en el orden correcto."""
    deleted_counts: dict[str, int] = {}
    org_id = org.id

    if verbose:
        print(f"  Eliminando datos de org: {org.name} (slug: {org.slug}, id: {org_id})")

    # 1. Tablas con organization_id (en orden de dependencias)
    for table_name, model in DELETION_ORDER:
        # Skip organizations table (se borra al final)
        if table_name == "organizations":
            continue

        # Special case: users - solo borrar los de la org, no superusers
        if table_name == "users" or table_name == "organization_purge_manifests":
            if not dry_run:
                count_result = await db.execute(
                    select(func.count()).select_from(model).where(model.organization_id == org_id)
                )
                count = count_result.scalar_one() or 0
                if count > 0:
                    await db.execute(delete(model).where(model.organization_id == org_id))
                    deleted_counts[table_name] = count
                    if verbose:
                        print(f"    ✓ {table_name}: {count} registros eliminados")
            else:
                count_result = await db.execute(
                    select(func.count()).select_from(model).where(model.organization_id == org_id)
                )
                count = count_result.scalar_one() or 0
                deleted_counts[table_name] = count
                if verbose:
                    print(f"    [DRY-RUN] {table_name}: {count} registros")
        else:
            # Tablas normales con organization_id
            if not dry_run:
                count_result = await db.execute(
                    select(func.count()).select_from(model).where(model.organization_id == org_id)
                )
                count = count_result.scalar_one() or 0
                if count > 0:
                    await db.execute(delete(model).where(model.organization_id == org_id))
                    deleted_counts[table_name] = count
                    if verbose:
                        print(f"    ✓ {table_name}: {count} registros eliminados")
            else:
                count_result = await db.execute(
                    select(func.count()).select_from(model).where(model.organization_id == org_id)
                )
                count = count_result.scalar_one() or 0
                deleted_counts[table_name] = count
                if verbose:
                    print(f"    [DRY-RUN] {table_name}: {count} registros")

    # 2. Finalmente eliminar la organización
    if not dry_run:
        await db.execute(delete(Organization).where(Organization.id == org_id))
        deleted_counts["organizations"] = 1
        if verbose:
            print("    ✓ organization: eliminada")
    else:
        deleted_counts["organizations"] = 1
        if verbose:
            print("    [DRY-RUN] organization: sería eliminada")

    if not dry_run:
        await db.commit()

    return deleted_counts


async def run_purge(
    dry_run: bool = False, verbose: bool = False, auto_confirm: bool = False
) -> PurgeStats:
    """Ejecuta la purga completa."""
    stats = PurgeStats()

    # Usar localhost:5433 para conectar desde fuera de Docker
    # El contenedor postgres expone el puerto 5433 en el host
    database_url = (
        f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@localhost:5433/{settings.POSTGRES_DB}"
    )

    print(
        f"Conectando a: postgresql+asyncpg://{settings.POSTGRES_USER}:***@localhost:5433/{settings.POSTGRES_DB}"
    )

    engine = create_async_engine(database_url, echo=False)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as db:
        print("=" * 70)
        print("PURGA DE ORGANIZACIONES DE TEST")
        print("=" * 70)
        print(f"Base de datos: {settings.POSTGRES_DB} (localhost:5433)")
        print(f"Modo: {'DRY-RUN (simulación)' if dry_run else 'ELIMINACIÓN REAL'}")
        print()

        # Verificar orgs protegidas existen
        for slug in PROTECTED_SLUGS:
            org_result = await db.execute(select(Organization).where(Organization.slug == slug))
            org = org_result.scalar_one_or_none()
            if org:
                print(
                    f"✓ Organización protegida encontrada: {org.name} (slug: {slug}, id: {org.id})"
                )
            else:
                print(f"⚠️  Organización protegida NO encontrada: {slug}")
        print()

        # Obtener organizaciones a eliminar
        test_orgs = await get_test_organizations(db)
        stats.orgs_found = len(test_orgs)
        stats.orgs_skipped = len(PROTECTED_SLUGS)  # Las 3 orgs protegidas

        if not test_orgs:
            print("✓ No hay organizaciones de test para eliminar.")
            return stats

        print(f"Organizaciones a eliminar: {len(test_orgs)}")
        print()

        # Mostrar resumen de las primeras 10
        for i, org in enumerate(test_orgs[:10], 1):
            counts = await count_records_by_org(db, org.id)
            total_records = sum(counts.values())
            print(f"  {i}. {org.name} (slug: {org.slug})")
            print(
                f"     - {counts['users']} usuarios, {counts['companies']} empresas, {counts['locations']} ubicaciones"
            )
            print(f"     - {counts['projects']} proyectos, {counts['proposals']} propuestas")
            print(f"     - Total estimado: {total_records} registros")
            print()

        if len(test_orgs) > 10:
            print(f"  ... y {len(test_orgs) - 10} organizaciones más")
            print()

        # Mostrar orgs protegidas
        print("Organizaciones PROTEGIDAS (no se eliminarán):")
        for slug in PROTECTED_SLUGS:
            org_result = await db.execute(select(Organization).where(Organization.slug == slug))
            org = org_result.scalar_one_or_none()
            if org:
                print(f"  ✓ {org.name} (slug: {slug})")
            else:
                print(f"  ⚠️  {slug} (no encontrada)")
        print()

        # Confirmar
        if not dry_run and not auto_confirm:
            print("=" * 70)
            print("⚠️  ESTA OPERACIÓN ES IRREVERSIBLE")
            print("=" * 70)
            print()
            confirm = input(
                f"¿Eliminar {len(test_orgs)} organizaciones y todos sus datos? [yes/N]: "
            )
            if confirm.lower() != "yes":
                print("Operación cancelada.")
                return stats
            print()

        # Ejecutar purga
        print("=" * 70)
        print("INICIANDO PURGA")
        print("=" * 70)
        print()

        for i, org in enumerate(test_orgs, 1):
            print(f"[{i}/{len(test_orgs)}] Procesando: {org.name} (slug: {org.slug})")

            try:
                deleted = await delete_organization_data(db, org, dry_run=dry_run, verbose=verbose)
                stats.orgs_deleted += 1

                # Acumular estadísticas
                for table, count in deleted.items():
                    stats.records_by_table[table] = stats.records_by_table.get(table, 0) + count

                if verbose:
                    print()

            except Exception as e:
                print(f"  ❌ ERROR al eliminar {org.name}: {e}")
                if not dry_run:
                    await db.rollback()
                raise

    await engine.dispose()

    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Purgar organizaciones de test de la base de datos",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
    # Simular purga (sin borrar nada)
    python scripts/purge_test_orgs.py --dry-run

    # Purga real con confirmación
    python scripts/purge_test_orgs.py

    # Purga real sin confirmación (cuidado!)
    python scripts/purge_test_orgs.py --yes

    # Purga con detalle de cada operación
    python scripts/purge_test_orgs.py --verbose --yes
        """,
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simular la purga sin eliminar nada",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Mostrar detalle de cada operación",
    )
    parser.add_argument(
        "--yes",
        "-y",
        action="store_true",
        help="Confirmar automáticamente sin preguntar",
    )

    args = parser.parse_args()

    # Ejecutar
    try:
        stats = asyncio.run(
            run_purge(
                dry_run=args.dry_run,
                verbose=args.verbose,
                auto_confirm=args.yes,
            )
        )

        # Mostrar resumen final
        print()
        print("=" * 70)
        print("RESUMEN FINAL")
        print("=" * 70)
        print(f"Organizaciones encontradas: {stats.orgs_found}")
        print(f"Organizaciones protegidas: {', '.join(PROTECTED_SLUGS)}")
        print(f"Organizaciones saltadas: {stats.orgs_skipped}")
        print(f"Organizaciones procesadas: {stats.orgs_deleted}")
        print()

        if stats.records_by_table:
            print("Registros eliminados por tabla:")
            for table, count in sorted(stats.records_by_table.items()):
                print(f"  - {table}: {count}")
            print()
            total_records = sum(stats.records_by_table.values())
            print(f"TOTAL: {total_records} registros eliminados")

        print()
        if args.dry_run:
            print("✓ Simulación completada. Usa sin --dry-run para eliminar realmente.")
        else:
            print("✓ Purga completada exitosamente.")

    except Exception as e:
        print()
        print("=" * 70)
        print("❌ ERROR DURANTE LA PURGA")
        print("=" * 70)
        print(f"Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
