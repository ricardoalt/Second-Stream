# Editorial Design System

Sistema de diseño unificado para la plataforma SecondStream. Combina shadcn v4 con los principios editoriales de "No-Line Rule" y "Glass & Gradient".

## Principios Fundamentales

### 1. No-Line Rule
**Prohibición estricta:** No usar bordes 1px para separar secciones. Usar:
- **Surface Hierarchy**: `surface` → `surface-container` tiers
- **Background color shifts**: Diferentes niveles de `--card`, `--muted`, `--background`
- **Spacing**: Usar `gap` y `padding` en lugar de bordes

### 2. Glass & Gradient Rule
- **Glassmorphism**: Usar `backdrop-blur` de 12px-20px con colores semi-transparentes
- **Gradient Signature**: Primary (#006565) a Primary Container (#008080) a 135°
- **Tokens**: Siempre usar variables CSS, nunca colores hardcodeados

## Tokens Semánticos

### Superficies
```css
--surface: var(--background)           /* Base level */
--surface-container: var(--card)        /* Content sections */
--surface-container-low: var(--muted)   /* Interactive elements */
--surface-container-high: var(--accent) /* Elevated elements */
```

### Estados
```css
--success: oklch(0.73 0.14 154)         /* Decision GO, Success */
--warning: oklch(0.72 0.15 85)         /* Decision INVESTIGATE */
--destructive: oklch(0.58 0.16 25)     /* Decision NO-GO, Error */
--info: oklch(0.55 0.15 235)            /* Information */
```

### Estados Derivados (para backgrounds)
```css
--state-success-bg: color-mix(in srgb, var(--success) 18%, transparent)
--state-warning-bg: color-mix(in srgb, var(--warning) 18%, transparent)
--state-destructive-bg: color-mix(in srgb, var(--destructive) 18%, transparent)
```

## Componentes de Dominio

### EditorialCard
Wrapper sobre shadcn Card con glassmorphism y gradientes.

```tsx
import { EditorialCard } from "@/components/system/editorial-card"

<EditorialCard variant="glass" glow>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</EditorialCard>
```

**Variantes:**
- `default`: Card estándar con bordes sutiles
- `glass`: Glassmorphism con backdrop-blur
- `gradient`: Fondo con gradiente primary
- `elevated`: Sombra pronunciada, sin borde

### StatusChip
Badges para estados de decisión y cumplimiento.

```tsx
import { StatusChip } from "@/components/system/status-chip"

<StatusChip status="go">GO</StatusChip>
<StatusChip status="investigate">Investigate</StatusChip>
<StatusChip status="nogo">No-Go</StatusChip>
<StatusChip status="success">Completed</StatusChip>
```

### DataTableEditorial
Tablas sin líneas divisorias (No-Line Rule).

```tsx
import { DataTableEditorial } from "@/components/system/data-table"

<DataTableEditorial>
  {/* No borders, color alternado de filas */}
</DataTableEditorial>
```

### GradientButton
Botón con gradiente primary (No usar bg-primary directamente).

```tsx
import { GradientButton } from "@/components/system/gradient-button"

<GradientButton>Primary Action</GradientButton>
<GradientButton variant="secondary">Secondary</GradientButton>
<GradientButton variant="ghost">Tertiary</GradientButton>
```

## Anti-Patrones Prohibidos

### ❌ NO HACER
```tsx
// Colores hardcodeados - NUNCA
<div className="bg-emerald-500 text-white">GO</div>
<div className="bg-amber-500">Warning</div>
<div className="bg-violet-500">Info</div>

// Bordes 1px sólidos para separar secciones - NUNCA
<div className="border-b border-gray-200">Section</div>
<hr className="my-4">

// Space-y para spacing vertical - NUNCA
<div className="space-y-4">

// w-10 h-10 para dimensiones iguales - NUNCA
<div className="w-10 h-10">
```

### ✅ HACER
```tsx
// Usar tokens semánticos
<div className="bg-success text-success-foreground">GO</div>
<div className="bg-warning text-warning-foreground">Warning</div>
<div className="bg-primary text-primary-foreground">Info</div>

// Separación por background y spacing
<div className="bg-card p-6">Section</div>
<div className="flex flex-col gap-4">

// size-* para dimensiones iguales
<div className="size-10">
```

## Guía de Migración

### Paso 1: Reemplazar colores hardcodeados
| Antiguo (❌) | Nuevo (✅) |
|-------------|-----------|
| `bg-emerald-500` | `bg-success` |
| `bg-amber-500` | `bg-warning` |
| `bg-red-500` / `bg-rose-500` | `bg-destructive` |
| `bg-violet-500` / `bg-purple-500` | `bg-primary` |
| `bg-cyan-500` / `bg-blue-500` | `bg-info` |
| `text-emerald-700` | `text-success` |
| `text-amber-700` | `text-warning` |

### Paso 2: Reemplazar bordes por spacing
```tsx
// Antes ❌
<div className="border-b border-gray-200 py-4">
  <h2>Title</h2>
</div>
<div className="py-4">
  Content
</div>

// Después ✅
<div className="bg-card p-6">
  <h2 className="text-title-md mb-4">Title</h2>
  <div className="flex flex-col gap-4">
    Content
  </div>
</div>
```

### Paso 3: Usar componentes de sistema
```tsx
// Antes ❌
import { Card, CardContent } from "@/components/ui/card"

<Card className="bg-gradient-to-br from-success/20 to-success/10 border-success/50">
  <CardContent>Content</CardContent>
</Card>

// Después ✅
import { EditorialCard } from "@/components/system/editorial-card"

<EditorialCard variant="decision" decision="go">
  Content
</EditorialCard>
```

## Estructura de Carpetas

```
components/
├── ui/                    # shadcn base (NO TOCAR)
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── system/                # Componentes de dominio Editorial
│   ├── editorial-card.tsx
│   ├── status-chip.tsx
│   ├── gradient-button.tsx
│   └── data-table.tsx
└── features/              # Componentes específicos de features
    ├── proposals/
    ├── streams/
    └── ...
```

## Reglas de Oro

1. **Nunca importar directamente de `lucide-react`** - Usar el iconLibrary configurado (tabler)
2. **Nunca usar colores Tailwind directos** (emerald-500, amber-500, etc.) - Usar tokens
3. **Nunca usar `space-y-*`** - Usar `flex flex-col gap-*`
4. **Nunca usar `w-* h-*` juntos** - Usar `size-*`
5. **Siempre usar componentes de sistema** para patrones repetidos

## Comandos Útiles

```bash
# Buscar colores hardcodeados en el código
grep -r "bg-\(emerald\|amber\|violet\|purple\|cyan\|pink\)-[0-9]" components/

# Buscar space-y (anti-patrón)
grep -r "space-y-" components/

# Buscar w-* h-* (debería ser size-*)
grep -r "w-.*h-" components/ | grep -v "size-"
```

## Recursos

- [shadcn v4 Docs](https://ui.shadcn.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- Design.md (documento original de diseño)
