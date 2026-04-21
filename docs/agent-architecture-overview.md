# Arquitectura de agentes IA

> Resumen técnico corto para producto / PM.

---

## 1. Stack actual

| Capa | Uso actual |
|---|---|
| Producto / API | FastAPI |
| Runtime de agentes | PydanticAI |
| Proveedor principal de modelos | AWS Bedrock |
| Modelo principal actual | Claude Sonnet 4.6 |
| Proveedor especializado adicional | OpenAI para transcripción (`gpt-4o-transcribe`) |

---

## 2. Idea central

La arquitectura no conecta el producto directo al modelo.

Conecta el producto a un **harness** que controla:

- contexto,
- instrucciones,
- dependencias,
- validación,
- errores,
- persistencia,
- tools futuras.

---

## 3. Flujo actual

```text
Producto / UI
    ↓
Backend define objetivo y contexto
    ↓
PydanticAI ejecuta el agente
    ↓
Bedrock resuelve el modelo configurado
    ↓
El modelo genera la respuesta
    ↓
La aplicación valida, normaliza y persiste
```

---

## 4. Qué hace cada capa

### Producto
- decide cuándo correr o re-correr un análisis,
- define el objetivo de negocio,
- nunca llama directo al modelo.

### Backend
- prepara contexto,
- controla permisos,
- inyecta dependencias,
- decide qué entra y qué se guarda.

### PydanticAI
- corre el agente,
- mantiene una interfaz consistente,
- pasa dependencias tipadas,
- valida outputs estructurados.

### Bedrock
- expone el modelo configurado,
- desacopla el acceso al proveedor,
- permite cambiar modelo por configuración.

### Modelo
- ejecuta la parte cognitiva,
- interpreta contexto,
- devuelve una respuesta dentro del contrato esperado.

---

## 5. Por qué el modelo está detrás del harness

Porque la capa importante no es el modelo aislado, sino el control del sistema.

El harness define:

- qué entra al modelo,
- qué sale del modelo,
- qué se considera válido,
- qué se persiste,
- qué herramientas puede usar.

Eso evita acoplar los flujos del producto a una API específica.

---

## 6. Por qué no depende de un solo modelo

La arquitectura depende de **contratos**, no de una personalidad específica del modelo.

Los contratos cubren:

- **entrada**: contexto y formato,
- **salida**: esquema esperado,
- **validación**: aceptación o rechazo,
- **routing**: modelo por tipo de tarea.

Resultado: texto, documentos, imágenes o audio pueden usar modelos distintos sin rehacer el flujo de producto.

---

## 7. Qué sí está definido por nosotros

No es un sistema “prehecho”.

Lo definido en la arquitectura es:

- capacidades del agente,
- reglas de ejecución,
- contratos de entrada/salida,
- guardrails,
- integración con negocio,
- observabilidad,
- evolución futura del harness.

Frameworks y modelos son piezas intercambiables. La lógica del sistema vive en la aplicación.

---

## 8. Cómo seguirá evolucionando

### Tools
El agente podrá delegar acciones a tools controladas en vez de resolver todo con texto libre.

Ejemplos:
- cálculos,
- compliance,
- pricing,
- generación documental,
- CRM / marketplace.

### Datos / base de datos
No se planea acceso libre del modelo a la BD.

Patrón:

```text
Agente
  → tool segura
    → servicio de aplicación
      → acceso controlado a datos
```

### MCPs / adaptadores
Se planean como capa estándar para conectar:

- sistemas externos,
- fuentes documentales,
- knowledge bases,
- herramientas operativas,
- conectores reutilizables.

---

## 9. Qué habilita esta arquitectura

- cambiar modelo sin rehacer flujos,
- cambiar proveedor con menos fricción,
- mezclar proveedores por capacidad,
- agregar tools sin rediseñar el sistema,
- mantener la lógica crítica fuera del LLM.

---

## 10. Resumen corto

La arquitectura actual usa **PydanticAI + Bedrock** como runtime y canal principal de modelos, pero el activo real es el **harness**.

Ese harness separa:

- producto,
- orquestación,
- modelo,
- tools,
- datos,
- integraciones.

Por eso la arquitectura puede mantenerse, extenderse o cambiar de proveedor sin reescribir el producto alrededor de un único modelo.
