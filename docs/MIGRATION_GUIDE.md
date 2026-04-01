# Guía de Migración - Editorial Design System

> **Estado:** En progreso - 3 archivos críticos migrados (25 colores hardcodeados eliminados)
>
> **Documentación completa:** `docs/EDITORIAL_DESIGN_SYSTEM.md`

## 🚀 Cambio de Contexto (TL;DR)

**ANTES (❌ NO HACER):**
```tsx
// Colores hardcodeados
<div className="bg-emerald-500 text-emerald-700">
  <Badge className="bg-amber-500">Warning</Badge>
</div>

// Anti-patrones
<div className="space-y-4">
  <div className="w-10 h-10">
    <div className="border-b border-gray-200">
```

**DESPUÉS (✅ HACER):**
```tsx
// Usar componentes de sistema
import { EditorialCard, StatusChip } from "@/components/system";

<EditorialCard variant="glass">
  <StatusChip status="warning">Warning</StatusChip>
</EditorialCard>

// Buenas prácticas
<div className="flex flex-col gap-4">
  <div className="size-10">
    <div className="bg-card p-4"> {/* Sin border-b */}
```

## 📦 Componentes de Sistema Disponibles

### 1. EditorialCard
Cards con glassmorphism y gradientes.

```tsx
import { EditorialCard } from "@/components/system";

<EditorialCard variant="default">       {/* Card estándar */}
<EditorialCard variant="glass">         {/* Glassmorphism */}
<EditorialCard variant="gradient">      {/* Con gradiente primary */}
<EditorialCard variant="decision" decision="go"> {/* Estado de decisión */}
```

### 2. StatusChip
Badges para todos los estados de la plataforma.

```tsx
import { StatusChip } from "@/components/system";

// Estados de decisión
<StatusChip status="go">GO</StatusChip>
<StatusChip status="no-go">No-Go</StatusChip>
<StatusChip status="investigate">Investigate</StatusChip>

// Estados genéricos
<StatusChip status="success">Success</StatusChip>
<StatusChip status="warning">Warning</StatusChip>
<StatusChip status="error">Error</StatusChip>
<StatusChip status="info">Info</StatusChip>

// Variantes
<StatusChip variant="filled">    {/* Fondo sólido */}
<StatusChip variant="subtle">    {/* Fondo sutil */}
<StatusChip variant="ghost">     {/* Sin fondo */}
<StatusChip variant="glass">     {/* Glassmorphism */}
```

### 3. GradientButton
Botón con gradiente signature del sistema.

```tsx
import { GradientButton } from "@/components/system";

<GradientButton variant="primary">      {/* Gradient primary */}
<GradientButton variant="secondary">    {/* Surface container */}
<GradientButton variant="outline">      {/* Borde sutil */}
<GradientButton variant="ghost">        {/* Solo texto */}
<GradientButton variant="glass">        {/* Glassmorphism */}
```

### 4. EditorialDataTable
Tabla sin líneas divisorias (No-Line Rule).

```tsx
import {
  EditorialDataTable,
  EditorialTableHeader,
  EditorialTableRow,
  EditorialTableCell,
  EditorialTableHead,
} from "@/components/system";

<EditorialDataTable>
  <EditorialTableHeader>
    <TableRow>
      <EditorialTableHead>Column</EditorialTableHead>
    </TableRow>
  </EditorialTableHeader>
  <TableBody>
    {rows.map(row => (
      <EditorialTableRow key={row.id}>
        <EditorialTableCell>{row.data}</EditorialTableCell>
      </EditorialTableRow>
    ))}
  </TableBody>
</EditorialDataTable>
```

## 🔄 Tabla de Migración Rápida

| Antes (❌) | Después (✅) |
|-----------|-------------|
| `bg-emerald-500` | `bg-success` |
| `text-emerald-700` | `text-success` |
| `bg-amber-500` | `bg-warning` |
| `text-amber-700` | `text-warning` |
| `bg-rose-500` | `bg-destructive` |
| `text-rose-700` | `text-destructive` |
| `bg-red-500` | `bg-destructive` |
| `bg-violet-500` | `bg-primary` |
| `bg-cyan-500` | `bg-info` |
| `bg-purple-500` | `bg-primary` |
| `bg-slate-100` | `bg-muted` |
| `space-y-4` | `flex flex-col gap-4` |
| `space-x-2` | `flex gap-2` |
| `w-10 h-10` | `size-10` |
| `border-b` | Sin borde, usar `bg-card` |

## 📊 Progreso de Migración

### Completado ✅
- [x] Setup shadcn v4 con estilo "radix-nova"
- [x] Documentación del Design System
- [x] Componente EditorialCard
- [x] Componente StatusChip
- [x] Componente GradientButton
- [x] Componente EditorialDataTable
- [x] `streams-all-table.tsx` migrado (-15 colores hardcodeados)
- [x] `kpi-card.tsx` migrado (-8 colores hardcodeados)
- [x] `file-uploader-sections.tsx` migrado (-8 colores hardcodeados)

### Pendiente 🔲
- [ ] `streams-drafts-table.tsx` (8 colores hardcodeados)
- [ ] `safety-alert.tsx` (8 colores hardcodeados)
- [ ] `draft-confirmation-modal.tsx` (8 colores hardcodeados)
- [ ] `discovery-wizard/views/review-view.tsx` (7 colores hardcodeados)
- [ ] Configurar linting para CI
- [ ] Guía visual con ejemplos

## 🛠️ Comandos Útiles

```bash
# Analizar progreso de migración
cd /Users/ricardoaltamirano/Developer/SecondStream
./scripts/migrate-design-system.sh

# Buscar colores hardcodeados específicos
grep -r "bg-emerald-" components/ --include="*.tsx"
grep -r "bg-amber-" components/ --include="*.tsx"
grep -r "space-y-" components/ --include="*.tsx"

# Verificar build pasa
bun run check
```

## 🎯 Principios del Design System

### No-Line Rule
> **Prohibido usar bordes 1px para separar secciones.** Usar:
> - Background color shifts (`bg-card`, `bg-muted`)
> - Espaciado amplio (`gap-4`, `p-6`)
> - Glassmorphism para elementos flotantes

### Glass & Gradient Rule
> **Para elementos destacados usar:**
> - `backdrop-blur` de 12px-20px
> - Gradient signature: primary → primary/80 a 135°
> - NUNCA colores Tailwind directos

### Tokens Semánticos
> **SIEMPRE usar tokens, nunca colores hardcodeados:**
> ```tsx
> bg-success, bg-warning, bg-destructive, bg-primary, bg-info
> text-success, text-warning, text-destructive, text-primary, text-info
> ```

## 🆘 ¿Necesitás Ayuda?

1. **Leer la documentación completa:** `docs/EDITORIAL_DESIGN_SYSTEM.md`
2. **Ver ejemplos:** `components/system/*.tsx`
3. **Usar el analizador:** `./scripts/migrate-design-system.sh`
4. **Preguntar en el canal** #frontend-design-system

## 📅 Timeline

- **Abril 2026:** Migración de archivos críticos (en progreso)
- **Mayo 2026:** Todos los archivos de features migrados
- **Junio 2026:** Linting configurado en CI, documentación visual

---

**Last updated:** 2026-04-01  
**Maintained by:** Frontend Team  
**Questions?** Ping @ricardoaltamirano
