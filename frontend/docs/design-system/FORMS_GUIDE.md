# Formularios con Shadcn - Guía Completa

> **⚠️ REGLA DE ORO:** Todos los formularios DEBEN usar la composición de `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>` con **react-hook-form** y **Zod**.

---

## ❌ ANTI-PATRÓN (No usar)

```tsx
// ❌ MAL - Formulario manual con useState
export function AddClientDialog() {
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState({});
  
  const handleSubmit = async () => {
    // Validación manual de Zod
    const result = schema.safeParse(formData);
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }
    // ... submit logic
  };
  
  return (
    <Dialog>
      <Input 
        value={formData.companyName}
        onChange={(e) => setFormData({...formData, companyName: e.target.value})}
      />
      {errors.companyName && <span className="text-red-500">{errors.companyName}</span>}
    </Dialog>
  );
}
```

**Problemas:**
- Estados desordenados (useState por cada campo)
- Validación manual repetitiva
- Mensajes de error inconsistentes
- No accesible (falta aria-invalid, aria-describedby)
- Difícil de mantener

---

## ✅ PATRÓN CORRECTO (Shadcn Standard)

### 1. Instalación (ya está hecha)

```bash
# Ya instalado en el proyecto
npm install react-hook-form @hookform/resolvers zod
```

### 2. Schema de Validación (Zod)

```typescript
// lib/schemas/client-schema.ts
import { z } from "zod";

export const clientSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  industry: z.enum(["manufacturing", "healthcare", "oil_gas", "other"]),
  active: z.boolean().default(true),
});

export type ClientFormData = z.infer<typeof clientSchema>;
```

### 3. Componente de Formulario

```tsx
// components/features/clients/client-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui";
import { Input } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Switch } from "@/components/ui";
import { clientSchema, type ClientFormData } from "@/lib/schemas/client-schema";

interface ClientFormProps {
  defaultValues?: Partial<ClientFormData>;
  onSubmit: (data: ClientFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function ClientForm({ defaultValues, onSubmit, isSubmitting }: ClientFormProps) {
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: "",
      email: "",
      phone: "",
      industry: "manufacturing",
      active: true,
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Name */}
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corporation" {...field} />
              </FormControl>
              <FormDescription>
                Legal name of the company
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="contact@acme.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone (Optional) */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="+1 234 567 8900" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Industry Select */}
        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Industry</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="oil_gas">Oil & Gas</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Active Switch */}
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <FormDescription>
                  Client can access the platform
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Submit */}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Client"}
        </Button>
      </form>
    </Form>
  );
}
```

### 4. Uso en un Modal

```tsx
// components/features/clients/add-client-dialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import { ClientForm } from "./client-form";
import { toast } from "sonner";
import { clientsAPI } from "@/lib/api/clients";
import type { ClientFormData } from "@/lib/schemas/client-schema";

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: ClientFormData) {
    setIsSubmitting(true);
    try {
      await clientsAPI.create(data);
      toast.success("Client created successfully");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to create client");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="start" aria-hidden />
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Create a new client account. They will receive an invitation email.
          </DialogDescription>
        </DialogHeader>
        <ClientForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🧩 Composición de Componentes

### Estructura Estándar

```
<Form>              ← Provider de react-hook-form
  <form>
    <FormField>     ← Campo individual (conecta con RHF)
      <FormItem>    ← Container con spacing
        <FormLabel> ← Label (rojo si hay error)
        <FormControl> ← Wrapper del input (aria-invalid, aria-describedby)
          <Input />   ← El input real
        </FormControl>
        <FormDescription> ← Texto de ayuda
        <FormMessage>     ← Mensaje de error
      </FormItem>
    </FormField>
  </form>
</Form>
```

### Componentes Disponibles

| Componente | Props | Descripción |
|------------|-------|-------------|
| `<Form>` | `useForm` return | Provider principal |
| `<FormField>` | `name`, `control`, `render` | Conecta un campo con RHF |
| `<FormItem>` | - | Container con `space-y-2` |
| `<FormLabel>` | - | Label con estilo de error automático |
| `<FormControl>` | - | Wrapper que pasa `aria-invalid` y `aria-describedby` |
| `<FormDescription>` | - | Texto gris de ayuda |
| `<FormMessage>` | - | Mensaje de error (rojo) |

---

## 🎨 Estilos de Error

Los campos con error automáticamente:
1. **Label**: Cambia a color `text-destructive` (rojo)
2. **Input**: Recibe `aria-invalid="true"` (accesibilidad)
3. **Descripción**: Se conecta con `aria-describedby`
4. **Mensaje**: Aparece en rojo debajo del campo

---

## 🔧 Patrones Avanzados

### Array Fields (Campos Repetibles)

```tsx
import { useFieldArray } from "react-hook-form";

function ContactsForm() {
  const form = useForm();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  return (
    <Form {...form}>
      <form>
        {fields.map((field, index) => (
          <FormField
            key={field.id}
            control={form.control}
            name={`contacts.${index}.email`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact {index + 1}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <Button type="button" onClick={() => remove(index)}>
                  Remove
                </Button>
              </FormItem>
            )}
          />
        ))}
        <Button type="button" onClick={() => append({ email: "" })}>
          Add Contact
        </Button>
      </form>
    </Form>
  );
}
```

### Conditional Fields

```tsx
<FormField
  control={form.control}
  name="type"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Type</FormLabel>
      <Select onValueChange={field.onChange}>
        {/* options */}
      </Select>
    </FormItem>
  )}
/>

{form.watch("type") === "other" && (
  <FormField
    control={form.control}
    name="otherDescription"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Description</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
      </FormItem>
    )}
  />
)}
```

---

## 📋 Checklist de Migración

Para refactorizar un formulario manual:

- [ ] Crear schema de Zod con mensajes de error descriptivos
- [ ] Reemplazar `useState` por `useForm` con `zodResolver`
- [ ] Wrappear form con `<Form {...form}>`
- [ ] Reemplazar cada campo manual por `<FormField>` con `<FormItem>` composition
- [ ] Agregar `<FormLabel>`, `<FormControl>`, `<FormMessage>` a cada campo
- [ ] Mover validación de `onSubmit` manual a `resolver` de RHF
- [ ] Probar que los mensajes de error aparecen correctamente
- [ ] Verificar accesibilidad (tab navigation, aria-invalid)

---

## 🚨 Importante

**NO usar:**
- ❌ `useState` para cada campo del formulario
- ❌ Validación manual en el `onSubmit`
- ❌ Componentes de input propios sin pasar por `FormControl`
- ❌ Mensajes de error hardcodeados

**SIEMPRE usar:**
- ✅ `react-hook-form` con `zodResolver`
- ✅ Composición `<FormItem>` con `<FormLabel>`, `<FormControl>`, `<FormMessage>`
- ✅ Schemas de Zod con mensajes descriptivos
- ✅ Barrel export `@/components/ui` para imports limpios

---

## 📚 Recursos

- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Docs](https://zod.dev/)
- [Shadcn Form Component](https://ui.shadcn.com/docs/components/form)
