# Editorial Design System - Standardization Guide

> **Radius, Spacing & Component Consistency**

## 📐 Sistema de Radius

El Design System Editorial usa una escala de radius consistente basada en el token `--radius` (0.625rem = 10px).

### Escala de Radius

| Token | Valor | Uso | Ejemplo |
|-------|-------|-----|---------|
| `rounded-sm` | 6px | Chips, badges, inputs pequeños | StatusChip xs |
| `rounded-md` | 10px | Inputs, botones default | Button, Input |
| `rounded-lg` | 16px | Cards, modales, paneles | EditorialCard |
| `rounded-xl` | 24px | Macrocards, secciones | Hero cards |
| `rounded-2xl` | 32px | Contenedores grandes | Page sections |
| `rounded-full` | 9999px | Elementos circulares | Avatars, status pills |

### Reglas de Radius

```tsx
// ✅ CORRECTO: Usar tokens de radius consistentes
<Button className="rounded-md">          // 10px - default
<Card className="rounded-lg">            // 16px - cards
<StatusChip className="rounded-full">    // Pills
<Input className="rounded-md">           // 10px - same as buttons

// ❌ INCORRECTO: Mezclar radius arbitrarios
<Button className="rounded-xl">          // Too rounded for buttons
<Card className="rounded-sm">            // Too square for cards
<Badge className="rounded-lg">           // Should be pill or sm
```

---

## 📏 Sistema de Spacing

El Design System usa una escala de spacing basada en `0.25rem` (4px) con valores semánticos.

### Escala de Spacing

| Token | Valor | Uso | Ejemplo |
|-------|-------|-----|---------|
| `gap-1` | 4px | Micro spacing | Icon + text inline |
| `gap-2` | 8px | Tight spacing | Button icons, inline elements |
| `gap-3` | 12px | Default spacing | Form rows, list items |
| `gap-4` | 16px | Comfortable | Card sections, form groups |
| `gap-6` | 24px | Spacious | Page sections, major groups |
| `gap-8` | 32px | Large breaks | Major layout divisions |
| `gap-10` | 40px | Section breaks | Between major sections |
| `gap-12` | 48px | Layout breaks | Page level spacing |

### Padding Consistente

| Contexto | Padding | Ejemplo |
|----------|---------|---------|
| Micro elements | `p-2` (8px) | Small buttons, badges |
| Default elements | `p-4` (16px) | Cards, inputs |
| Spacious elements | `p-6` (24px) | Large cards, modales |
| Section containers | `p-8` (32px) | Page sections, hero |

### Reglas de Spacing

```tsx
// ✅ CORRECTO: Usar gap en lugar de space-y/space-x
<div className="flex flex-col gap-4">     // Vertical stack
<div className="flex items-center gap-2"> // Horizontal inline
<div className="grid gap-6">              // Grid spacing

// ❌ INCORRECTO: Anti-patrón space-y
<div className="space-y-4">              // Deprecated
<div className="space-x-2">              // Deprecated
```

---

## 🎨 Sistema de Colores

### Tokens Semánticos Obligatorios

| Token | Uso | NUNCA usar |
|-------|-----|-----------|
| `bg-primary` | Acciones principales, brand | `bg-blue-500`, `bg-violet-500` |
| `bg-success` | Éxito, completado, GO | `bg-emerald-500`, `bg-green-500` |
| `bg-warning` | Advertencia, investigar | `bg-amber-500`, `bg-yellow-500` |
| `bg-destructive` | Error, peligro, NO-GO | `bg-red-500`, `bg-rose-500` |
| `bg-info` | Información, neutral | `bg-cyan-500`, `bg-blue-400` |
| `bg-muted` | Fondos secundarios | `bg-gray-100`, `bg-slate-100` |
| `bg-card` | Superficies elevadas | `bg-white`, `bg-zinc-50` |

### Variantes de Background

```tsx
// Fondo sólido (para acciones principales)
bg-primary text-primary-foreground
bg-success text-success-foreground
bg-destructive text-destructive-foreground

// Fondo sutil (para estados, badges)
bg-primary/10 text-primary      // 10% opacidad
bg-success/10 text-success      // 10% opacidad
bg-warning/15 text-warning      // 15% opacidad
bg-destructive/10 text-destructive

// Fondo glass (para elementos flotantes)
bg-card/70 backdrop-blur-xl     // Glassmorphism
```

---

## 📋 Component Styling Reference

### Buttons

```tsx
// Primary action
<Button className="bg-primary text-primary-foreground rounded-md">

// Secondary action
<Button variant="secondary" className="rounded-md">

// Danger action
<Button className="bg-destructive text-destructive-foreground rounded-md">

// Ghost/tertiary
<Button variant="ghost" className="rounded-md">
```

### Cards

```tsx
// Default card
<Card className="rounded-lg border border-border/40 shadow-sm">

// Elevated card
<Card className="rounded-lg border-0 shadow-lg">

// Glass card
<Card className="rounded-lg bg-card/70 backdrop-blur-xl border-border/30">

// Decision states
<Card className="rounded-lg border-2 border-success/50 bg-success/5">     // GO
<Card className="rounded-lg border-2 border-warning/50 bg-warning/5">   // INVESTIGATE
<Card className="rounded-lg border-2 border-destructive/50 bg-destructive/5"> // NO-GO
```

### Inputs

```tsx
// Default input
<Input className="rounded-md border-border bg-background">

// Focus state (automático via CSS)
focus:ring-2 focus:ring-ring focus:border-primary
```

### Badges/Status Chips

```tsx
// Filled (para estados activos)
<Badge className="bg-success text-success-foreground rounded-full">

// Subtle (para mostrar estado sin destacar)
<Badge className="bg-success/10 text-success rounded-full border-0">

// Outline (para estados pendientes)
<Badge variant="outline" className="rounded-full">
```

---

## 🚫 Anti-Patrones Prohibidos

### 1. Colores Tailwind Directos

```tsx
// ❌ NUNCA
bg-emerald-500, text-emerald-700
bg-amber-500, text-amber-700
bg-red-500, text-red-700
bg-violet-500, text-violet-700
bg-cyan-500, text-cyan-700

// ✅ SIEMPRE
bg-success, text-success
bg-warning, text-warning
bg-destructive, text-destructive
bg-primary, text-primary
bg-info, text-info
```

### 2. Spacing Anti-Patrón

```tsx
// ❌ NUNCA
space-y-4, space-y-2, space-x-3

// ✅ SIEMPRE
flex flex-col gap-4
flex items-center gap-2
flex gap-3
```

### 3. Sizing Anti-Patrón

```tsx
// ❌ NUNCA
w-10 h-10
w-5 h-5
w-8 h-8

// ✅ SIEMPRE
size-10
size-5
size-8
```

### 4. Bordes para Separar

```tsx
// ❌ NUNCA (No-Line Rule)
border-b border-gray-200
border-t border-slate-100
<hr className="my-4">

// ✅ SIEMPRE
bg-card p-6                    // Background shift
flex flex-col gap-4            // Spacing
```

---

## 🔧 Tokens CSS Disponibles

### Colores Base

```css
--background          /* Fondo de página */
--foreground          /* Texto principal */
--card                /* Fondo de cards */
--card-foreground     /* Texto en cards */
--primary             /* Color primario (brand) */
--primary-foreground  /* Texto sobre primario */
--secondary           /* Fondo secundario */
--secondary-foreground /* Texto secundario */
--muted               /* Fondo sutil */
--muted-foreground    /* Texto sutil */
--accent              /* Acento (hover states) */
--accent-foreground   /* Texto sobre acento */
--destructive         /* Rojo (errores) */
--destructive-foreground /* Texto sobre destructivo */
--success             /* Verde (éxito) */
--success-foreground  /* Texto sobre éxito */
--warning             /* Ámbar (advertencias) */
--warning-foreground  /* Texto sobre warning */
--info                /* Azul (información) */
--info-foreground     /* Texto sobre info */
--border              /* Bordes */
--input               /* Inputs */
--ring                /* Focus rings */
```

### Radius

```css
--radius: 0.625rem        /* 10px - base */
--radius-sm: 0.375rem     /* 6px */
--radius-md: 0.625rem     /* 10px */
--radius-lg: 1rem         /* 16px */
--radius-xl: 1.5rem       /* 24px */
```

### Spacing (Custom Properties)

```css
--space-xs: 0.375rem      /* 6px */
--space-sm: 0.75rem       /* 12px */
--space-md: 1rem          /* 16px */
--space-lg: 1.5rem        /* 24px */
--space-xl: 2rem          /* 32px */
--space-2xl: 3rem         /* 48px */
```

---

## 📊 Checklist de Consistencia

Cuando crees o migres un componente, verificá:

- [ ] **Colores**: ¿Usa tokens semánticos (`bg-success`) o hardcodeados (`bg-emerald-500`)?
- [ ] **Radius**: ¿Usa la escala estándar (`rounded-lg` para cards)?
- [ ] **Spacing**: ¿Usa `gap-*` en lugar de `space-y-*`?
- [ ] **Sizing**: ¿Usa `size-*` en lugar de `w-* h-*`?
- [ ] **Bordes**: ¿Evita bordes para separar secciones (No-Line Rule)?
- [ ] **Glass**: ¿Usa `backdrop-blur` con opacidad sutil para elementos flotantes?

---

## 🛠️ Comandos de Verificación

```bash
# Buscar colores hardcodeados
grep -r "bg-\(emerald\|amber\|red\|rose\|violet\|purple\|cyan\|blue\)-[0-9]" \
  components/ --include="*.tsx"

# Buscar space-y (anti-patrón)
grep -r "space-y-" components/ --include="*.tsx"

# Buscar w-* h-* (debería ser size-*)
grep -rE "w-[0-9]+.*h-[0-9]+" components/ --include="*.tsx" | grep -v "size-"

# Buscar bordes para separar
grep -r "border-b\|border-t" components/ --include="*.tsx"
```

---

**Last updated:** 2026-04-01  
**Maintained by:** Frontend Team
