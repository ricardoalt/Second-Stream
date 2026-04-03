# SecondStream Design System

Sistema de diseño unificado para SecondStream basado en **shadcn/ui** + **TanStack Table**.

## Stack Tecnológico

| Capa | Tecnología | Uso |
|------|-----------|-----|
| **UI Components** | shadcn/ui | Botones, cards, badges, modals |
| **Tablas** | TanStack Table + shadcn Table | Data grids complejos |
| **Forms** | TanStack Form (futuro) | Forms type-safe |
| **Styling** | Tailwind v4 + CSS Variables | Tokens de diseño |

## Estructura de Componentes

```
components/
├── ui/              # shadcn/ui puro (NO TOCAR)
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── patterns/        # Composiciones estandarizadas
│   ├── data-display/
│   │   └── kpi-card.tsx
│   ├── layout/
│   │   └── page-header.tsx
│   ├── tables/
│   │   └── data-table.tsx
│   ├── dialogs/
│   │   └── confirm-dialog.tsx
│   └── feedback/
│       └── empty-state.tsx
└── features/        # Componentes específicos de features
    ├── clients/
    ├── streams/
    └── offers/
```

## Jerarquía de Uso

**Regla de oro**: Usar el nivel más bajo posible que resuelva el problema.

1. **shadcn/ui** (`@/components/ui/*`): Building blocks básicos
2. **patterns** (`@/components/patterns/*`): Composiciones reutilizables
3. **features** (`@/components/features/*`): Lógica de negocio específica
4. **pages** (`app/*/page.tsx`): Composición final

## Patterns Disponibles

### Data Display

#### `KpiCard`

Reemplaza TODOS los cards de métricas (metric-card, admin-stats-card, etc.)

```tsx
import { KpiCard } from "@/components/patterns";

<KpiCard
  title="Total Revenue"
  value="$124,500"
  change={{ value: "+12.5%", type: "positive" }}
  icon={DollarSign}
  variant="default"
/>
```

**Variantes**:
- `default`: Card estándar
- `accent`: Fondo con color primario sutil
- `success`: Para métricas positivas
- `warning`: Para alertas
- `destructive`: Para errores/negativos

### Layout

#### `PageHeader`

Header consistente para todas las páginas.

```tsx
import { PageHeader } from "@/components/patterns";

<PageHeader
  title="Clients"
  subtitle="Manage your client portfolio"
  icon={Users}
  actions={<Button>Add Client</Button>}
  breadcrumbs={[
    { label: "Home", href: "/" },
    { label: "Clients" }
  ]}
/>
```

### Tables

#### `DataTable`

Tabla estandarizada con TanStack Table.

```tsx
import { DataTable } from "@/components/patterns";
import { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<Payment>[] = [
  { accessorKey: "status", header: "Status" },
  { accessorKey: "email", header: "Email" },
];

<DataTable
  columns={columns}
  data={payments}
  filterColumn="email"
  filterPlaceholder="Search by email..."
/>
```

**Features incluidas**:
- Sorting por columna
- Filtering (search)
- Pagination
- Loading states (skeleton)
- Empty states

### Dialogs

#### `ConfirmDialog`

Diálogo de confirmación unificado.

```tsx
import { ConfirmDialog } from "@/components/patterns";

<ConfirmDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  title="Archive Item?"
  description="Are you sure you want to archive this item?"
  confirmText="Archive"
  variant="destructive"
  onConfirm={handleArchive}
/>
```

### Feedback

#### `EmptyState`

Estado vacío estandarizado.

```tsx
import { EmptyState } from "@/components/patterns";

<EmptyState
  title="No clients found"
  description="Get started by adding your first client."
  icon={Users}
  action={<Button>Add Client</Button>}
/>
```

## Tokens de Diseño

Ver `app/globals.css` para tokens completos.

### Colores Principales

- **Primary**: `#006565` (Teal)
- **Success**: `#146c43`
- **Warning**: `#b7791f`
- **Destructive**: `#ba1a1a`

### Uso Correcto

✅ **Correcto**:
```tsx
className="bg-primary text-primary-foreground"
className="bg-card border-border"
```

❌ **Incorrecto**:
```tsx
className="bg-teal-500 text-white"
className="bg-white border-gray-200"
```

## Migración de Componentes Viejos

| Componente Viejo | Reemplazo | Status |
|------------------|-----------|--------|
| `metric-card.tsx` | `KpiCard` | ✅ Disponible |
| `admin-stats-card.tsx` | `KpiCard` | ✅ Disponible |
| `offers-summary-stat-card.tsx` | `KpiCard` | ✅ Disponible |
| `client-summary-stat-card.tsx` | `KpiCard` | ✅ Disponible |
| `confirm-archive-dialog.tsx` | `ConfirmDialog` | ✅ Disponible |
| `confirm-restore-dialog.tsx` | `ConfirmDialog` | ✅ Disponible |
| `confirm-purge-dialog.tsx` | `ConfirmDialog` | ✅ Disponible |
| `data-table.tsx` (system) | `DataTable` | ✅ Disponible |
| `empty-state.tsx` (ui) | `EmptyState` | ✅ Disponible |

## Convenciones de Código

### Imports

Ordenar imports:
1. React/Next
2. Librerías externas (lucide-react, @tanstack/react-table)
3. shadcn/ui components
4. patterns
5. Lib/utils
6. Types

```tsx
import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";
import { KpiCard, PageHeader } from "@/components/patterns";
import { cn } from "@/lib/utils";
import { Payment } from "@/lib/types";
```

### Props

- Usar interfaces con JSDoc
- Props opcionales al final
- Usar `className` para extensión

```tsx
interface MyComponentProps {
  /** Required prop description */
  title: string;
  /** Optional prop description */
  variant?: "default" | "primary";
  /** Additional classes */
  className?: string;
}
```

## Recursos

- [shadcn/ui Docs](https://ui.shadcn.com/docs)
- [TanStack Table Docs](https://tanstack.com/table/latest)
- [Tailwind v4 Docs](https://tailwindcss.com/docs/v4-beta)
