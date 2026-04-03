# Sistema de Familia - Design System Consistency

> **Principio:** Todos los componentes deben parecer hermanos, no primos lejanos.

---

## 🎯 REGLAS DE ORO

### Regla 1: Un Solo Componente por Patrón

**PROHIBIDO** crear componentes locales con el mismo nombre:

```tsx
// ❌ MAL - streams/page.tsx
function KpiCard() { ... }  // Local!

// ❌ MAL - admin/page.tsx  
function KpiCard() { ... }  // Otra implementación!
```

**OBLIGATORIO** usar el componente del patterns:

```tsx
// ✅ BIEN - TODAS las páginas
import { KpiCard } from "@/components/patterns";

<KpiCard ... />
```

**Si necesitas variaciones**, extiende el componente base:

```tsx
// En el componente patterns, no localmente
<KpiCard badge="New" badgeType="success" hasAction />
```

---

### Regla 2: Cards Siempre Iguales

**Estándar de familia para TODAS las cards:**

```tsx
className="rounded-xl bg-surface-container-lowest p-4 shadow-xs"
```

**NO permitido:**
- Glassmorphism en cards (`backdrop-blur`, `/80` opacidad)
- Gradientes diferentes por página
- Padding inconsistente (`p-4` vs `p-5` vs `p-6`)
- Bordes diferentes (`rounded-lg` vs `rounded-xl` vs `rounded-2xl`)

---

### Regla 3: Modales Siempre Iguales

**Estructura estándar de familia:**

```tsx
<Modal
  open={open}
  onOpenChange={setOpen}
  title="Modal Title"
  description="Modal description"
  size="default" // sm | default | lg | xl | full
>
  {/* Content */}
  <ModalFooter>
    <Button variant="outline" onClick={() => setOpen(false)}>
      Cancel
    </Button>
    <Button>Confirm</Button>
  </ModalFooter>
</Modal>
```

**NO permitido:**
- `bg-white/85 backdrop-blur-xl` (glassmorphism)
- `rounded-2xl` vs `rounded-xl` inconsistente
- `border-0` vs `border` inconsistente
- `p-0` en content (rompe el patrón)
- Headers sin `border-b`
- Footers sin `border-t`

---

### Regla 4: Badges Siempre Iguales

**Usar SOLO estas variantes:**

```tsx
// Éxito
<Badge variant="success-subtle">Active</Badge>

// Warning
<Badge variant="warning-subtle">Pending</Badge>

// Error
<Badge variant="destructive-subtle">Critical</Badge>

// Info/Primary
<Badge variant="primary-subtle">New</Badge>

// Neutral
<Badge variant="neutral-subtle">Draft</Badge>
```

**NO permitido:**
```tsx
// Hardcodeado inline
className="bg-[#dcfce7] text-[#166534]"  // ❌

// Opacidad baja
className="bg-success/15"  // ❌
```

---

### Regla 5: Animaciones Siempre Iguales

**Para Cards entrando:**

```tsx
<StaggerContainer staggerDelay={0.08}>
  <StaggerItem>
    <HoverLift>
      <Card>...</Card>
    </HoverLift>
  </StaggerItem>
</StaggerContainer>
```

**Para Botones:**

```tsx
<Pressable>
  <Button>...</Button>
</Pressable>
```

**NO permitido:**
- Animaciones diferentes por página
- Stagger delay de 0.1s en una página y 0.08s en otra
- Algunas cards con HoverLift y otras sin

---

## 📦 Componentes de la Familia

### KPI Cards

**Import:**
```tsx
import { KpiCard } from "@/components/patterns";
```

**Props soportadas:**
- `title` | `label`: Título de la card
- `value`: Valor principal (string, number, o null)
- `subtitle` | `subValue`: Texto secundario
- `icon`: Icono de lucide-react
- `variant`: "default" | "accent" | "success" | "warning" | "destructive" | "muted"
- `badge`: Texto del badge
- `badgeType`: "success" | "warning" | "destructive" | "primary" | "neutral"
- `isPrimary`: Destaca el valor en color primary
- `hasAction`: Muestra flecha de acción
- `loading`: Estado de carga

**Ejemplos:**

```tsx
// Simple
<KpiCard label="Active Streams" value={128} />

// Con badge
<KpiCard 
  label="Critical Alerts" 
  value={5} 
  badge="Action Needed"
  badgeType="destructive"
/>

// Con icono y valor primario
<KpiCard 
  title="Total Revenue"
  value="$124,500"
  icon={DollarSign}
  isPrimary
/>
```

---

### Modales

**Import:**
```tsx
import { Modal, ModalFooter, ConfirmModal } from "@/components/patterns";
```

**Modal básico:**

```tsx
<Modal
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Edit Client"
  description="Update client information"
  size="lg"
>
  <form>...</form>
  <ModalFooter>
    <Button variant="outline" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button>Save</Button>
  </ModalFooter>
</Modal>
```

**Modal de confirmación:**

```tsx
<ConfirmModal
  open={showConfirm}
  onOpenChange={setShowConfirm}
  title="Delete Item?"
  description="This action cannot be undone."
  confirmText="Delete"
  variant="destructive"
  onConfirm={handleDelete}
  loading={isDeleting}
/>
```

---

### Badges

**Import:**
```tsx
import { Badge } from "@/components/ui/badge";
```

**Variantes disponibles:**
- `success-subtle`: Verde claro con texto verde oscuro
- `warning-subtle`: Ámbar claro con texto ámbar oscuro
- `destructive-subtle`: Rojo claro con texto rojo oscuro
- `primary-subtle`: Teal claro con texto teal oscuro
- `neutral-subtle`: Gris claro con texto gris oscuro

---

### Headers

**Import:**
```tsx
import { PageHeader } from "@/components/patterns";
```

**Uso:**

```tsx
<PageHeader
  title="Clients"
  subtitle="Manage your client portfolio"
  icon={Users}
  badge="Admin"
  breadcrumbs={[
    { label: "Home", href: "/" },
    { label: "Clients" }
  ]}
  actions={<Button>Add Client</Button>}
/>
```

---

## ✅ Checklist de Consistencia

Antes de hacer push, verificar:

- [ ] ¿Usé `@/components/patterns` para cards, modales, headers?
- [ ] ¿No hay componentes locales con nombres duplicados?
- [ ] ¿Todas las cards usan el mismo estilo base?
- [ ] ¿Los modales siguen la estructura estándar?
- [ ] ¿Usé variantes de Badge aprobadas?
- [ ] ¿Las animaciones usan los mismos delays?
- [ ] ¿No hay glassmorphism en elementos principales?

---

## ❌ Anti-patrones Detectados y Arreglados

### Antes (Inconsistente):

```tsx
// streams/page.tsx - KpiCard local
function KpiCard({ label, value, badge }) {
  return (
    <div className="rounded-xl bg-surface-container-lowest p-4 shadow-xs card-lift">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
        {label}
      </p>
      {/* ... */}
    </div>
  );
}

// offers/page.tsx - KpiCard del patterns
import { KpiCard } from "@/components/patterns";
<KpiCard title="..." value="..." />
```

### Después (Consistente):

```tsx
// TODAS las páginas usan el mismo componente
import { KpiCard } from "@/components/patterns";

// Streams
<KpiCard label="Active Streams" value={128} />

// Offers
<KpiCard title="Total Revenue" value="$124,500" />

// Mismo estilo visual, misma animación, misma familia
```

---

## 🎨 Tokens Visuales Compartidos

### Colores de Superficie (Siempre usar estos)

```css
--surface-container-lowest: #ffffff
--surface-container-low: #f5f5f5
--surface-container: #ebebeb
--surface-container-high: #e0e0e0
--surface-container-highest: #e0e0e0
```

### Badges (Siempre usar estos)

```css
/* Success */
bg: #dcfce7
text: #166534
border: #86efac

/* Warning */
bg: #fef3c7
text: #92400e
border: #fcd34d

/* Destructive */
bg: #fee2e2
text: #991b1b
border: #fca5a5

/* Primary */
bg: #ccfbf1
text: #0f766e
border: #5eead4
```

### Espaciado (Siempre usar estos)

```css
gap-4: 16px (entre cards)
p-4: 16px (padding interno cards)
p-6: 24px (padding páginas)
gap-8: 32px (entre secciones)
```

---

## 🚀 Migración Completa

### Cambios Realizados:

1. ✅ **KpiCard unificado**: Eliminado KpiCard local de `streams/page.tsx`
2. ✅ **KpiCard extendido**: Agregadas props `label`, `badge`, `badgeType`, `isPrimary`, `hasAction`, `subValue`
3. ✅ **Modal estandarizado**: Creado componente `Modal` en patterns con estructura consistente
4. ✅ **Badge system**: Agregadas variantes `success-subtle`, `warning-subtle`, `destructive-subtle`, `primary-subtle`, `neutral-subtle`
5. ✅ **Documentación**: Creado este archivo de reglas

### Para hacer en el futuro:

- [ ] Migrar todos los modales existentes a usar `<Modal />`
- [ ] Reemplazar todos los badges inline por variantes del Badge
- [ ] Agregar más componentes a la familia (tables, forms, etc.)

---

**Recuerda:** La consistencia es más importante que la innovación visual. Un diseño aburrido pero consistente es mejor que uno excitante pero caótico.
