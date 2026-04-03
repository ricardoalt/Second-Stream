# Componentes Deprecados - Migración Pendiente

## Resumen

Los siguientes componentes han sido marcados como **@deprecated** y deben migrarse a los nuevos patterns antes de ser eliminados.

---

## 🚨 COMPONENTES DEPRECADOS

### 1. `components/ui/metric-card.tsx`

**Reemplazo:** `KpiCard` from `@/components/patterns`

**Aún usado en:**
- `app/(agent)/clients/[id]/page.tsx`
- `components/features/proposals/proposal-technical.tsx`

**Migración:**
```tsx
// Antes
import { MetricCard } from "@/components/ui/metric-card";
<MetricCard
  icon={DollarSign}
  label="Revenue"
  value="$124K"
  variant="primary"
/>

// Después
import { KpiCard } from "@/components/patterns";
<KpiCard
  icon={DollarSign}
  title="Revenue"  // cambiado: label → title
  value="$124K"
  variant="default" // cambiado: "primary" → "default"
/>
```

**Estado:** ⚠️ Pendiente migración en 2 archivos

---

### 2. `components/features/offers/components/offers-summary-stat-card.tsx`

**Reemplazo:** `KpiCard` from `@/components/patterns`

**Aún usado en:**
- `app/(agent)/offers/archive/page.tsx`

**Migración:**
```tsx
// Antes
import { OffersSummaryStatCard } from "@/components/features/offers/components/offers-summary-stat-card";
<OffersSummaryStatCard
  label="Total offers"
  value="24"
  subtitle="Active pipeline"
  icon={BarChart3}
/>

// Después
import { KpiCard } from "@/components/patterns";
<KpiCard
  title="Total offers"  // cambiado: label → title
  value="24"
  subtitle="Active pipeline"
  icon={BarChart3}
  variant="default"
/>
```

**Estado:** ⚠️ Pendiente migración en 1 archivo

---

### 3. `components/ui/confirm-archive-dialog.tsx`

**Reemplazo:** `ConfirmDialog` from `@/components/patterns`

**Aún usado en:**
- `app/admin/organizations/[id]/page.tsx`
- `app/admin/organizations/page.tsx`

**Migración:**
```tsx
// Antes
import { ConfirmArchiveDialog } from "@/components/ui/confirm-archive-dialog";
<ConfirmArchiveDialog
  open={showArchive}
  onOpenChange={setShowArchive}
  onConfirm={handleArchive}
  entityType="organization"
  entityName={org.name}
/>

// Después
import { ConfirmDialog } from "@/components/patterns";
<ConfirmDialog
  open={showArchive}
  onOpenChange={setShowArchive}
  onConfirm={handleArchive}
  title="Archive Organization?"
  description={`Are you sure you want to archive "${org.name}"? This action can be undone later.`}
  confirmText="Archive"
  variant="destructive"
/>
```

**Estado:** ⚠️ Pendiente migración en 2 archivos

---

### 4. `components/ui/confirm-restore-dialog.tsx`

**Reemplazo:** `ConfirmDialog` from `@/components/patterns`

**Aún usado en:**
- `app/admin/organizations/[id]/page.tsx`
- `app/admin/organizations/page.tsx`

**Migración:** Similar a archive dialog, usar `variant="default"`

**Estado:** ⚠️ Pendiente migración en 2 archivos

---

### 5. `components/ui/confirm-delete-dialog.tsx`

**Reemplazo:** `ConfirmDialog` from `@/components/patterns`

**Aún usado en:**
- `components/features/streams/files-section/files-section.tsx`
- `components/features/locations/location-contacts-card.tsx`
- `components/features/locations/incoming-materials-card.tsx`
- `components/features/companies/company-contacts-card.tsx`

**Migración:**
```tsx
// Antes
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
<ConfirmDeleteDialog
  open={showDelete}
  onOpenChange={setShowDelete}
  onConfirm={handleDelete}
  title="Delete Contact?"
  description="This will permanently remove the contact."
  itemName={contact.name}
/>

// Después
import { ConfirmDialog } from "@/components/patterns";
<ConfirmDialog
  open={showDelete}
  onOpenChange={setShowDelete}
  onConfirm={handleDelete}
  title="Delete Contact?"
  description={`This will permanently remove "${contact.name}".`}
  confirmText="Delete"
  variant="destructive"
/>
```

**Estado:** ⚠️ Pendiente migración en 4 archivos

---

### 6. `components/ui/confirm-purge-dialog.tsx`

**Reemplazo:** `ConfirmDialog` from `@/components/patterns` (con extensión)

**Aún usado en:** Verificar con:
```bash
grep -r "ConfirmPurgeDialog" --include="*.tsx" frontend/
```

**Nota especial:** Este diálogo tiene validación extra (requiere escribir el nombre de la entidad). El pattern base puede necesitar extensión para soportar esto.

**Estado:** ❓ Verificar uso actual

---

## 📊 RESUMEN DE MIGRACIÓN PENDIENTE

| Componente | Archivos afectados | Esfuerzo estimado |
|------------|-------------------|-------------------|
| MetricCard | 2 | 30 min |
| OffersSummaryStatCard | 1 | 15 min |
| ConfirmArchiveDialog | 2 | 30 min |
| ConfirmRestoreDialog | 2 | 20 min |
| ConfirmDeleteDialog | 4 | 45 min |
| ConfirmPurgeDialog | ? | ? |
| **TOTAL** | **~11 archivos** | **~2 horas** |

---

## 🎯 ORDEN RECOMENDADO DE MIGRACIÓN

1. **MetricCard** (2 archivos) - Simple, buen warmup
2. **OffersSummaryStatCard** (1 archivo) - Muy similar a MetricCard
3. **ConfirmDeleteDialog** (4 archivos) - Usado en muchos lugares
4. **ConfirmArchiveDialog** (2 archivos) - Admin pages
5. **ConfirmRestoreDialog** (2 archivos) - Admin pages
6. **ConfirmPurgeDialog** - Verificar uso primero

---

## ✅ CHECKLIST PARA MIGRAR CADA COMPONENTE

Para cada archivo:
- [ ] Reemplazar import
- [ ] Actualizar JSX con nuevo componente
- [ ] Ajustar props según tabla de mapeo
- [ ] Verificar visualmente que se ve igual/better
- [ ] Testear funcionalidad (click, submit, etc.)
- [ ] Commit con mensaje claro
- [ ] Marcar como done en este documento

---

## 🗑️ CUÁNDO ELIMINAR LOS ARCHIVOS VIEJOS

**REGLA:** Solo eliminar un archivo deprecado cuando:
1. ✅ Ningún archivo lo importa más
2. ✅ Ha pasado al menos 1 sprint sin issues
3. ✅ Todo el equipo está al tanto
4. ✅ Está documentado en CHANGELOG

**Archivos seguros para eliminar AHORA:**
- Ninguno todavía - todos tienen dependencias

---

## 📝 COMANDOS ÚTILES

```bash
# Verificar si un componente aún se usa
grep -r "MetricCard" --include="*.tsx" frontend/ | grep -v "deprecated"

# Contar archivos que usan un componente
grep -r "ConfirmDeleteDialog" --include="*.tsx" frontend/ | wc -l

# Encontrar todos los componentes deprecados
grep -r "@deprecated" --include="*.tsx" frontend/components/
```

---

## 🚀 PRÓXIMOS PASOS

1. Elegir el primer componente a migrar (recomendado: MetricCard)
2. Crear branch específico para la migración
3. Migrar archivo por archivo
4. Testear cada cambio
5. Hacer PR con todos los cambios
6. Una vez mergeado, actualizar este documento

---

*Documento creado: Abril 2026*  
*Última actualización: Abril 2026*
