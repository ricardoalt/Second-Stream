# Componentes Deprecados - Migration Notice

> **⚠️ ESTOS COMPONENTES ESTÁN DEPRECADOS**
> 
> Usar los componentes de `components/system/` en su lugar.
> 
> Fecha de deprecación: 2026-04-01

## Lista de Componentes a Migrar

### 1. `components/ui/status-badge.tsx` → `components/system/status-chip.tsx`

**ANTES:**
```tsx
import { StatusBadge, CriticalBadge } from "@/components/ui/status-badge";

<StatusBadge variant="critical" days={4}>Missing SDS</StatusBadge>
<CriticalBadge>Alert</CriticalBadge>
```

**DESPUÉS:**
```tsx
import { StatusChip } from "@/components/system";

<StatusChip status="error" size="sm">Missing SDS</StatusChip>
<StatusChip status="warning" size="sm" shape="pill">Alert</StatusChip>
```

**Mapeo de variantes:**
- `critical` → `status="error"`
- `warning` → `status="warning"`
- `success` → `status="success"`
- `info` → `status="info"`
- `neutral` → `status="pending"` o `variant="ghost"`
- `pipeline` → `status="active"`

---

### 2. `components/ui/confirm-archive-dialog.tsx` → `components/system/confirm-dialogs.tsx`

**ANTES:**
```tsx
import { ConfirmArchiveDialog } from "@/components/ui/confirm-archive-dialog";

<ConfirmArchiveDialog
  open={open}
  onOpenChange={setOpen}
  onConfirm={handleConfirm}
  entityType="project"
  entityName="Project Alpha"
/>
```

**DESPUÉS:**
```tsx
import { ConfirmArchiveDialog } from "@/components/system/confirm-dialogs";

<ConfirmArchiveDialog
  open={open}
  onOpenChange={setOpen}
  onConfirm={handleConfirm}
  entityType="project"
  entityName="Project Alpha"
/>
```

**Cambios:**
- Colores `bg-amber-500` → `bg-warning`
- Icon sizing `h-5 w-5` → `size-5`
- Container sizing `h-10 w-10` → `size-10`

---

### 3. Colores hardcodeados a reemplazar

| Archivo | Color viejo | Token nuevo |
|---------|-------------|-------------|
| confirm-archive-dialog.tsx | `bg-amber-500` | `bg-warning` |
| confirm-archive-dialog.tsx | `text-amber-500` | `text-warning` |
| confirm-archive-dialog.tsx | `bg-amber-500/10` | `bg-warning/10` |
| status-badge.tsx | `bg-red-100` | `bg-destructive/10` |
| status-badge.tsx | `text-red-700` | `text-destructive` |
| status-badge.tsx | `bg-emerald-100` | `bg-success/10` |
| status-badge.tsx | `text-emerald-700` | `text-success` |
| status-badge.tsx | `bg-orange-100` | `bg-warning/10` |
| status-badge.tsx | `text-orange-700` | `text-warning` |

---

## Componentes CORRECTOS (usar estos)

### ✅ `components/system/status-chip.tsx`
Badges unificados con tokens semánticos.

```tsx
import { StatusChip } from "@/components/system";

<StatusChip status="go">GO</StatusChip>
<StatusChip status="error">Critical</StatusChip>
<StatusChip status="warning">Warning</StatusChip>
<StatusChip status="success">Success</StatusChip>
<StatusChip status="info">Info</StatusChip>
```

### ✅ `components/ui/metric-card.tsx`
Ya usa tokens correctamente (`bg-primary/10`, etc.).

```tsx
import { MetricCard } from "@/components/ui/metric-card";

<MetricCard
  icon={DollarSign}
  label="Revenue"
  value="$1.2M"
  variant="success"
/>
```

### ✅ `components/system/gradient-button.tsx`
Botones con gradiente signature.

```tsx
import { GradientButton } from "@/components/system";

<GradientButton variant="primary">Save</GradientButton>
<GradientButton variant="destructive">Delete</GradientButton>
```

---

## Timeline de Deprecación

- **Abril 2026**: Marcar como deprecated (warning en consola)
- **Mayo 2026**: Linting error si se usan (no falla build)
- **Junio 2026**: Remover archivos deprecated (breaking change)

---

## Script para encontrar uso de componentes deprecated

```bash
# Buscar usos de StatusBadge
grep -r "from.*status-badge" components/ --include="*.tsx"
grep -r "StatusBadge\|CriticalBadge\|WarningBadge" components/ --include="*.tsx"

# Buscar usos de confirm-archive-dialog
grep -r "from.*confirm-archive-dialog" components/ --include="*.tsx"
grep -r "ConfirmArchiveDialog" components/ --include="*.tsx"
```

---

**Para más información:** Ver `docs/EDITORIAL_DESIGN_SYSTEM.md`
