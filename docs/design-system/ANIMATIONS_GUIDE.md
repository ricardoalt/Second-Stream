# Animaciones Premium - Guía de Uso

## 🎨 Componentes de Animación Disponibles

### 1. **AnimatedNumber** - Contadores Animados

Anima números desde 0 hasta el valor final con física de resorte.

```tsx
import { AnimatedNumber } from "@/components/patterns";

// Ejemplo básico
<AnimatedNumber value={124500} prefix="$" />

// Con formateo compacto (1.2K)
<AnimatedNumber value={1200} compact suffix=" clients" />

// Con decimales
<AnimatedNumber value={85.5} suffix="%" decimals={1} />

// Duración personalizada
<AnimatedNumber value={1000} duration={2} />
```

**Props:**
- `value`: número objetivo
- `prefix`: prefijo ("$", "€")
- `suffix`: sufijo ("%", "K")
- `decimals`: decimales (default: 0)
- `duration`: duración en segundos (default: 1.5)
- `compact`: formatear como 1.2K

---

### 2. **FadeIn** - Entradas Suaves

Envuelve cualquier componente con una animación de entrada elegante.

```tsx
import { FadeIn } from "@/components/patterns";

// Fade in básico
<FadeIn>
  <Card>Contenido</Card>
</FadeIn>

// Dirección personalizada
<FadeIn direction="up" delay={0.2}>
  <KpiCard ... />
</FadeIn>

// Con efecto hover
<FadeIn hoverLift>
  <Card>Se eleva al pasar el mouse</Card>
</FadeIn>

<FadeIn hoverScale>
  <Card>Se escala al pasar el mouse</Card>
</FadeIn>
```

**Opciones de dirección:** `"up"` | `"down"` | `"left"` | `"right"` | `"none"`

---

### 3. **StaggerContainer + StaggerItem** - Animaciones Escalonadas

Para listas y grids que quieren entrar una a una.

```tsx
import { StaggerContainer, StaggerItem } from "@/components/patterns";

<StaggerContainer staggerDelay={0.1} initialDelay={0.2}>
  {items.map((item) => (
    <StaggerItem key={item.id}>
      <Card>{item.name}</Card>
    </StaggerItem>
  ))}
</StaggerContainer>
```

**Aplicado en:** Clients page (KPI cards)

---

### 4. **HoverLift** - Efecto de Elevación

Las cards se elevan suavemente al pasar el mouse.

```tsx
import { HoverLift } from "@/components/patterns";

<HoverLift>
  <KpiCard ... />
</HoverLift>

// Elevación personalizada
<HoverLift y={-8}>
  <Card>Se eleva 8px</Card>
</HoverLift>
```

---

### 5. **Pressable** - Efecto de Presión

Para botones que se sienten "presionables".

```tsx
import { Pressable } from "@/components/patterns";

<Pressable>
  <Button>Click me</Button>
</Pressable>

// Escala personalizada
<Pressable scale={0.95}>
  <Button size="lg">Presión más pronunciada</Button>
</Pressable>
```

---

## 🎯 Ejemplos Implementados

### Clients Page - KPI Cards Animados

```tsx
<StaggerContainer staggerDelay={0.1} initialDelay={0.2}>
  <StaggerItem>
    <HoverLift>
      <KpiCard
        title="Total Clients"
        value={companies.length}
        icon={Building2}
      />
    </HoverLift>
  </StaggerItem>
  <StaggerItem>
    <HoverLift>
      <KpiCard
        title="Visible Clients"
        value={filteredClients.length}
        icon={LayoutDashboard}
      />
    </HoverLift>
  </StaggerItem>
</StaggerContainer>
```

**Resultado:** Las cards entran una tras otra con 0.1s de delay, y se elevan al pasar el mouse.

---

## 📊 Beneficios de UX

1. **Percepción de Velocidad** - Las animaciones hacen que la app se sienta más rápida
2. **Jerarquía Visual** - Las entradas escalonadas guían la atención del usuario
3. **Feedback Táctil** - Los efectos hover y press dan feedback inmediato
4. **Premium Feel** - Las animaciones suaves transmiten calidad

---

## 🎨 Mejores Prácticas

### ✅ Hacer:
- Usar duraciones entre 0.2s y 0.5s para micro-interacciones
- Usar staggerDelay de 0.05s a 0.1s para listas
- Mantener consistencia en toda la app
- Usar hover effects en elementos interactivos

### ❌ Evitar:
- Animaciones que duran más de 1s (se sienten lentas)
- Demasiadas animaciones simultáneas (caos visual)
- Animaciones que bloquean la interacción
- Efectos exagerados que distraen

---

## 🔧 Personalización

### Easing Curves

El easing por defecto es: `[0.21, 0.47, 0.32, 0.98]`
- Suave al inicio
- Natural al final
- No robótico

### Variantes de Hover

```tsx
// Elevación sutil (recomendado)
<HoverLift y={-4} />

// Elevación prominente
<HoverLift y={-8} />

// Con sombra aumentada
<HoverLift>
  <Card className="transition-shadow hover:shadow-lg" />
</HoverLift>
```

---

## 🚀 Próximos Pasos Sugeridos

1. **Aplicar a más páginas:**
   - Dashboard (KPIs + charts)
   - Offers (pipeline stages)
   - Streams (boards)

2. **Page Transitions:**
   - Animar entre rutas
   - Slide transitions

3. **Scroll Animations:**
   - Parallax en headers
   - Reveal on scroll

---

*Implementado: Abril 2026*
*Librería: Framer Motion*
*Impacto: Premium UX*
