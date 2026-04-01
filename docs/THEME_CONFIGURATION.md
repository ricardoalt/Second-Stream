# Editorial Design System - Theme Configuration

> **Theme:** Luma (radix-luma)  
> **Base Color:** Neutral  
> **Icon Library:** Lucide  
> **Status:** Active

## 🎨 Configuration Overview

```json
{
  "style": "radix-luma",
  "baseColor": "neutral",
  "iconLibrary": "lucide",
  "tailwindVersion": "v4",
  "base": "radix"
}
```

---

## 🔤 Typography

### Font Families

| Role | Font | Usage |
|------|------|-------|
| **Display/Headings** | DM Sans / Manrope | H1-H6, page titles, metric values |
| **Body** | Inter | Paragraphs, labels, descriptions |
| **Mono** | JetBrains Mono | Code, technical data, timestamps |

### CSS Variables

```css
--font-sans: var(--font-inter), "Inter", system-ui, sans-serif;
--font-display: var(--font-dm-sans), "DM Sans", var(--font-manrope), "Manrope", sans-serif;
--font-heading: var(--font-dm-sans), "DM Sans", var(--font-manrope), "Manrope", sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", monospace;
```

### Usage in Components

```tsx
// Headings automatically use font-heading
<h1 className="text-3xl font-semibold tracking-tight">Title</h1>

// Body uses font-sans by default (set in body CSS)
<p>Body text</p>

// Technical data uses mono
<code className="font-mono">API_KEY</code>
```

---

## 📐 Radius Scale

Luma uses a slightly more rounded, modern feel:

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 8px (0.5rem) | Chips, badges, small buttons |
| `rounded-md` | 10px (0.625rem) | **Default** - Buttons, inputs |
| `rounded-lg` | 16px (1rem) | Cards, modals, panels |
| `rounded-xl` | 24px (1.5rem) | Large cards, sections |
| `rounded-2xl` | 32px (2rem) | Page containers, hero |
| `rounded-full` | 9999px | Pills, avatars, status indicators |

### Standard Patterns

```tsx
// Buttons: rounded-md (10px)
<Button className="rounded-md">Save</Button>

// Cards: rounded-lg (16px)
<Card className="rounded-lg">

// Status chips: rounded-full (pills)
<Badge className="rounded-full">

// Large sections: rounded-xl (24px)
<div className="rounded-xl">
```

---

## 🎨 Color System

### Primary Colors (OKLCH - Perceptually Uniform)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `primary` | oklch(0.205 0 0) | oklch(0.985 0 0) | Brand color, CTAs |
| `primary-foreground` | oklch(0.985 0 0) | oklch(0.205 0 0) | Text on primary |
| `secondary` | oklch(0.97 0 0) | oklch(0.269 0 0) | Secondary surfaces |
| `muted` | oklch(0.97 0 0) | oklch(0.269 0 0) | Subtle backgrounds |
| `accent` | oklch(0.97 0 0) | oklch(0.269 0 0) | Hover states |

### Status Colors (Vibrant - Luma Style)

| Token | Value | Hex Fallback | Usage |
|-------|-------|--------------|-------|
| `success` | oklch(0.65 0.18 145) | #16a34a | Success, GO decisions |
| `warning` | oklch(0.75 0.18 85) | #ea580c | Warnings, INVESTIGATE |
| `destructive` | oklch(0.577 0.245 27.325) | #dc2626 | Errors, NO-GO |
| `info` | oklch(0.65 0.15 235) | #2563eb | Information |

### Surface Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `background` | oklch(1 0 0) | oklch(0.145 0 0) | Page background |
| `card` | oklch(1 0 0) | oklch(0.205 0 0) | Card backgrounds |
| `popover` | oklch(1 0 0) | oklch(0.205 0 0) | Dropdowns, popovers |
| `border` | oklch(0.922 0 0) | oklch(1 0 0 / 10%) | Borders |
| `input` | oklch(0.922 0 0) | oklch(1 0 0 / 15%) | Input borders |
| `ring` | oklch(0.708 0 0) | oklch(0.556 0 0) | Focus rings |

### Semantic Variants (Background + Text)

```css
/* Success variants */
bg-success                    /* Solid background */
bg-success/10                 /* 10% opacity background */
text-success                  /* Text color */
border-success                /* Border color */
border-success/30             /* 30% opacity border */

/* Same pattern for: warning, destructive, info, primary */
```

---

## 📏 Spacing System

### Base Unit: 4px (0.25rem)

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` | 4px | Micro spacing |
| `gap-2` | 8px | Tight spacing (icons + text) |
| `gap-3` | 12px | Default inline spacing |
| `gap-4` | 16px | Component internal spacing |
| `gap-6` | 24px | Section spacing |
| `gap-8` | 32px | Major divisions |
| `gap-10` | 40px | Layout breaks |
| `gap-12` | 48px | Page-level spacing |

### Padding Patterns

```tsx
// Small elements: p-2 (8px)
<Badge className="p-2">

// Default: p-4 (16px)
<Card className="p-4">

// Spacious: p-6 (24px)
<Modal className="p-6">

// Large: p-8 (32px)
<Hero className="p-8">
```

---

## 🌑 Shadows (Luma Style)

Luma uses softer, more diffused shadows:

| Token | Value |
|-------|-------|
| `shadow-2xs` | 0 1px 2px hsl(220 14% 90% / 0.5) |
| `shadow-xs` | 0 1px 3px hsl(220 14% 80% / 0.4) |
| `shadow-sm` | 0 2px 4px hsl(220 14% 60% / 0.1) |
| `shadow` | 0 4px 8px hsl(220 14% 46% / 0.1) |
| `shadow-md` | 0 8px 16px hsl(220 14% 46% / 0.1) |
| `shadow-lg` | 0 16px 32px hsl(220 14% 46% / 0.12) |
| `shadow-xl` | 0 24px 48px hsl(220 14% 46% / 0.14) |

### Usage Patterns

```tsx
// Cards: shadow-sm
<Card className="shadow-sm hover:shadow-md">

// Modals: shadow-lg
<Dialog className="shadow-lg">

// Floating elements: shadow-xl
<Tooltip className="shadow-xl">
```

---

## ⚡ Animations

### Durations

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | 150ms | Hover states, micro-interactions |
| `--transition-base` | 200ms | Default transitions |
| `--transition-slow` | 300ms | Page transitions, modals |

### Easing

```css
/* Standard easing */
cubic-bezier(0.4, 0, 0.2, 1)    /* ease-out - most transitions */
cubic-bezier(0, 0, 0.2, 1)      /* decelerate - enter animations */
cubic-bezier(0.4, 0, 1, 1)      /* accelerate - exit animations */
```

---

## 🎯 Component Patterns

### Button Standard

```tsx
// Primary
<Button className="bg-primary text-primary-foreground rounded-md h-10 px-4">

// Secondary
<Button variant="secondary" className="rounded-md h-10 px-4">

// Ghost
<Button variant="ghost" className="rounded-md h-10 px-4">

// Destructive
<Button className="bg-destructive text-destructive-foreground rounded-md h-10 px-4">

// With icon
<Button className="gap-2 rounded-md h-10 px-4">
  <Icon className="size-4" />
  Label
</Button>
```

### Card Standard

```tsx
// Default card
<Card className="rounded-lg border border-border/40 bg-card shadow-sm p-4">

// Elevated card
<Card className="rounded-lg border-0 bg-card shadow-lg p-4">

// Glass card
<Card className="rounded-lg border border-border/30 bg-card/70 backdrop-blur-xl p-4">

// Decision states
<Card className="rounded-lg border-2 border-success/50 bg-success/5 p-4">  {/* GO */}
<Card className="rounded-lg border-2 border-warning/50 bg-warning/5 p-4">  {/* INVESTIGATE */}
<Card className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4">  {/* NO-GO */}
```

### Input Standard

```tsx
<Input className="rounded-md border border-input bg-background h-10 px-3" />
```

### Badge/Chip Standard

```tsx
// Status chip (pill)
<Badge className="rounded-full bg-success/10 text-success border-0 px-2.5 py-0.5">

// Filled badge
<Badge className="rounded-full bg-success text-success-foreground border-0 px-2.5 py-0.5">

// Outline badge
<Badge variant="outline" className="rounded-full px-2.5 py-0.5">
```

---

## 🎨 Icons (Lucide)

**Library:** `lucide-react`  
**Import pattern:**

```tsx
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Info,
  Archive,
  Trash2,
  // ... etc
} from "lucide-react";

// Usage
<CheckCircle className="size-4" />
<AlertTriangle className="size-5 text-warning" />
```

### Icon Sizes

| Size | Usage |
|------|-------|
| `size-3` (12px) | Inline with text, small badges |
| `size-4` (16px) | Buttons, form inputs |
| `size-5` (20px) | Cards, navigation |
| `size-6` (24px) | Empty states, large buttons |
| `size-8` (32px) | Feature icons, hero |

---

## 📱 Responsive Breakpoints

```css
/* Tailwind defaults (mobile-first) */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Container Patterns

```tsx
// Page container
<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">

// Content section
<div className="max-w-4xl mx-auto px-4 sm:px-6">

// Full-width with padding
<div className="w-full px-4 sm:px-6 lg:px-8">
```

---

## 🔧 Configuration Files

### components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "radix-luma",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### layout.tsx (Font Configuration)

```tsx
import { Inter, DM_Sans } from "next/font/google";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({ children }) {
  return (
    <html className={`${inter.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

---

## ✅ Checklist for New Components

When creating a component, verify:

- [ ] **Style:** Uses `radix-luma` preset
- [ ] **Colors:** OKLCH tokens (not HEX hardcoded)
- [ ] **Icons:** Lucide library only
- [ ] **Radius:** 
  - Buttons: `rounded-md` (10px)
  - Cards: `rounded-lg` (16px)
  - Chips: `rounded-full` (pills)
- [ ] **Spacing:** `gap-*` (not `space-y-*`)
- [ ] **Sizing:** `size-*` (not `w-* h-*`)
- [ ] **Shadows:** Use shadow scale (not arbitrary values)
- [ ] **Typography:** 
  - Headings: DM Sans (font-heading)
  - Body: Inter (default)
  - Mono: JetBrains Mono (code)

---

## 🚫 Anti-Patterns (NEVER)

```tsx
// ❌ Colores hardcodeados
<div className="bg-emerald-500">
<div className="text-amber-700">

// ❌ Iconos de otras librerías
import { SomeIcon } from "@tabler/icons-react";  // NO!

// ❌ Space anti-pattern
<div className="space-y-4">

// ❌ Sizing anti-pattern  
<div className="w-10 h-10">

// ❌ Radius inconsistente
<Button className="rounded-xl">  // Too rounded!
<Card className="rounded-sm">      // Too square!
```

---

**Version:** 1.0.0  
**Last Updated:** 2026-04-01  
**Maintained by:** Frontend Team
