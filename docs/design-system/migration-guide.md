# Migration Guide - Design System

Guía paso a paso para migrar páginas al nuevo Design System.

## Checklist por Página

### 1. Reemplazar Headers

**Antes**:
```tsx
<div className="flex items-center justify-between">
  <h1 className="text-2xl font-bold">Clients</h1>
  <Button>Add Client</Button>
</div>
```

**Después**:
```tsx
import { PageHeader } from "@/components/patterns";

<PageHeader
  title="Clients"
  subtitle="Manage your client portfolio"
  icon={Users}
  actions={<Button>Add Client</Button>}
/>
```

### 2. Reemplazar KPI Cards

**Antes**:
```tsx
import { MetricCard } from "@/components/ui/metric-card";

<MetricCard
  label="Total Revenue"
  value="$124,500"
  trend="+12.5%"
/>
```

**Después**:
```tsx
import { KpiCard } from "@/components/patterns";

<KpiCard
  title="Total Revenue"
  value="$124,500"
  change={{ value: "+12.5%", type: "positive" }}
  icon={DollarSign}
/>
```

### 3. Reemplazar Tablas

**Antes**:
```tsx
<Table>
  <TableHeader>...</TableHeader>
  <TableBody>
    {data.map((row) => (
      <TableRow key={row.id}>...</TableRow>
    ))}
  </TableBody>
</Table>
```

**Después**:
```tsx
import { DataTable } from "@/components/patterns";
import { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
];

<DataTable
  columns={columns}
  data={data}
  filterColumn="name"
  filterPlaceholder="Search..."
/>
```

### 4. Reemplazar Diálogos de Confirmación

**Antes**:
```tsx
import { ConfirmArchiveDialog } from "@/components/ui/confirm-archive-dialog";

<ConfirmArchiveDialog
  open={showArchive}
  onClose={() => setShowArchive(false)}
  onConfirm={handleArchive}
/>
```

**Después**:
```tsx
import { ConfirmDialog } from "@/components/patterns";

<ConfirmDialog
  open={showArchive}
  onOpenChange={setShowArchive}
  title="Archive Item?"
  description="Are you sure you want to archive this item?"
  confirmText="Archive"
  variant="destructive"
  onConfirm={handleArchive}
/>
```

## Orden de Migración Recomendado

1. **Dashboard** (página más visible)
2. **Clients** (más usada después de Dashboard)
3. **Streams** (complejidad media)
4. **Offers** (pipeline importante)
5. **Admin pages** (consistencia interna)

## Testing Después de Migrar

Verificar en cada página:
- [ ] Header se ve consistente
- [ ] KPIs usan el mismo componente
- [ ] Tablas tienen sorting/filtering
- [ ] Diálogos funcionan correctamente
- [ ] Estados vacíos se ven bien
- [ ] Responsive funciona
- [ ] Dark mode se ve bien

## Rollback Plan

Si algo sale mal:
1. Revertir cambios con git
2. Notificar al equipo
3. Documentar qué falló
4. Fix antes de reintentar
