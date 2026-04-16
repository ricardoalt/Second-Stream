# SecondStream AI-Native Workspace v1  
## PRD — Discovery Brief central, Structured Capture secundaria, revisión humana obligatoria

### 1. Overview / Context

SecondStream existe para convertir descubrimiento industrial desordenado en una comprensión operativa clara, trazable y accionable. El producto hoy ya apunta en la dirección correcta: el problema no es “falta más AI”, sino que la comprensión del stream todavía vive demasiado en la cabeza del operador y en formularios pesados.

Este PRD formaliza la siguiente evolución: un workspace AI-native donde el centro visible es un **Discovery Brief** vivo, actualizado por un único agente visible (**Discovery Completion Agent**) y revisado por humanos. La experiencia debe ser real, de producción y basada en datos mock por ahora; no es un ejercicio de wireframe aislado.

### 2. Problem Statement

Hoy el operador debe reconstruir mentalmente:

- qué se sabe
- qué falta
- qué está en conflicto
- qué evidencia soporta cada afirmación
- qué hacer ahora

El resultado es fricción cognitiva, lentitud y riesgo. El formulario actual ayuda a capturar estructura, pero no sostiene una comprensión durable del caso. La AI ayuda, pero todavía no produce un artefacto operativo único, legible y gobernado.

### 3. Product Principles

- **Artifact-first**: el brief es el centro.
- **Review-first**: nada sensible entra sin revisión humana.
- **Evidence-grounded**: toda afirmación importante debe poder rastrearse.
- **Human-in-the-loop**: el sistema propone; la persona decide.
- **No chat-first**: la conversación no es el flujo principal.
- **No dashboard overload**: menos paneles, menos ruido, más claridad.
- **One visible agent**: un solo agente visible en v1.
- **Structured Capture matters**: secundaria, pero útil como base estructurada.
- **Calm premium UI**: simple, moderna, sobria, sin slop genérico.
- **Real product, not mock theater**: la UI debe sentirse implementable.

### 4. Core UX Thesis

El usuario no debe “hablar con un bot”; debe **gobernar una comprensión viva del stream**.

La interfaz principal debe responder siempre:

1. ¿Qué sabemos?
2. ¿Qué no sabemos?
3. ¿Qué está bloqueando?
4. ¿Qué hacemos ahora?

El Discovery Brief es el artefacto visible que traduce evidencia + contexto + memoria local en comprensión operativa. Structured Capture existe para completar precisión estructurada cuando haga falta, no para secuestrar la experiencia.

### 5. User Model and Roles

#### Usuario principal: Field Agent / Operador
- Ingiere evidencia
- Revisa el brief
- Corrige errores
- Marca incertidumbre
- Acepta o difiere sugerencias
- Completa campos estructurados cuando sea necesario

#### Usuario secundario: Org Admin / Supervisor
- Monitorea calidad del agente
- Revisa runs fallidos y briefs pendientes
- Observa feedback estructurado
- Supervisa gobernanza del harness

#### Sistema: Discovery Completion Agent
- Lee evidencia nueva
- Actualiza el brief
- Detecta conflictos y gaps
- Sugiere siguientes acciones
- Nunca escribe verdad canónica directamente

### 6. Primary Surfaces

1. **Overview**
2. **Structured Capture**
3. **Evidence**
4. **History**

Reglas:
- Overview es la landing por defecto.
- Structured Capture es secundaria.
- Evidence es exploratoria/contextual.
- History es trazabilidad y revisión.

### 7. Overview Surface (detailed)

La vista Overview debe ser el centro de gravedad. Diseño recomendado: **dos columnas**.

#### Columna principal
- Executive Summary
- Discovery Brief
- Open Questions
- Next Best Actions

#### Rail contextual
- Pending Review
- Evidence Context
- Recent Updates
- Agent presence, sutil

#### Header
Debe incluir:
- título del stream
- cuenta
- owner
- readiness
- estado del brief
- last updated
- acciones: `Refresh Brief`, `Complete Discovery`

#### Executive Summary
Debe resumir el caso en 3–5 líneas, para lectura en segundos.

#### Discovery Brief
Debe mostrar puntos tipados:
- Fact
- Assumption
- Conflict
- Question
- Recommendation

Cada punto debe mostrar:
- texto breve
- tipo
- estado
- pista de proveniencia

#### Labels v1 recomendados
Los labels visibles del brief deben mantenerse cortos, humanos y operativos.

**Estados de contenido**
- `Verificado`
- `Inferido`
- `En conflicto`
- `Sin confirmar`

**Estado de workflow**
- `Requiere revisión`

Regla:
- evitar labels técnicos o académicos en la UI principal
- no usar métricas o scores como etiqueta primaria del punto
- mostrar provenance mínima como una línea corta, por ejemplo:
  - `Verificado · Lab report · actualizada hace 12 min`

#### Estados visibles
- confirmed
- needs review
- missing
- conflict

Para la UI real en español, estos deben traducirse al set cerrado de v1:
- `Verificado`
- `Inferido`
- `En conflicto`
- `Sin confirmar`
- `Requiere revisión`

#### Acciones permitidas por punto
- Accept
- Mark incorrect
- Needs verification
- Add note

#### Open Questions
Top 3–5 preguntas abiertas. Deben decir:
- qué falta
- por qué importa
- prioridad
- sugerencia de resolución

#### Next Best Actions
Máximo 3. Deben sentirse como recomendaciones del brief, no como botones genéricos.

### 8. Structured Capture Surface (detailed)

Structured Capture sigue existiendo, pero pierde el protagonismo.

#### Propósito
- edición manual precisa
- respaldo estructurado
- completitud del coverage model
- base para suggestions futuras

#### Principios de UI
- una columna
- secciones agrupadas
- colapsar lo resuelto
- no mostrar 31 preguntas a la vez
- mucho menos ruido que el formulario actual

#### Grupos semánticos
Ejemplos:
- Material & composition
- Volume & frequency
- Handling & logistics
- Compliance & documentation

#### Estados de grupo
- complete
- needs review
- missing info

#### AI suggestions
Pueden existir inline, pero deben ser:
- sutiles
- revisables
- con fuente
- no dominantes

#### Recommended default strategy
- mostrar primero un conjunto pequeño de grupos núcleo estables
- usar campos sugeridos o emergentes solo cuando aporten estructura nueva relevante
- no convertir Structured Capture en un formulario expansivo por defecto

### 9. Evidence Surface

La evidencia debe ser inspectable, no archivística.

#### Debe permitir:
- listar fuentes
- filtrar por tipo
- abrir detalle
- ver qué puntos del brief soporta
- agregar nota humana
- ver conflictos asociados

#### Regla central
La evidencia debe explicar **por qué existe ese punto del brief**.

#### Anti-patrón
No debe parecer un file browser ni una galería pesada.

### 10. History / Versions Surface

History sirve para auditoría, cambios y revisión.

#### Debe mostrar:
- versiones del brief
- runs relevantes
- decisiones de review
- correcciones humanas
- change summaries

#### Debe evitar:
- chain-of-thought
- ruido excesivo
- timeline verboso sin estructura

### 11. Agent Interaction Model

El modelo de interacción es:

1. ingestión natural
2. revisión inline
3. Ask/Tell contextual opcional

#### Reglas recomendadas de interacción
- el agente visible debe actuar como **orquestador único** del workspace
- `Inferido` y `Requiere revisión` deben tratarse como conceptos distintos
- el usuario debe poder **preguntar** o **pedir actualización del brief** desde el mismo composer principal
- si una pregunta implica un cambio material en el brief, el sistema debe **responder primero** y luego ofrecer una **propuesta explícita de cambio**
- no se debe mutar silenciosamente el brief por una pregunta ambigua
- las tareas internas de especialistas pueden existir en el harness, pero no deben dominar la UI

#### No es:
- chat libre como centro
- control center multiagente
- asistente conversacional protagonista

#### Sí es:
- brief vivo
- evidencia clicable
- sugerencias revisables
- feedback estructurado de alta señal

#### Composer pattern
- un composer principal, persistente y global debe vivir en la pantalla como punto de entrada estable
- sobre ese composer deben existir acciones contextuales ligeras en puntos del brief o evidencia seleccionada
- evitar tanto el chat gigante dominante como el input únicamente contextual y disperso

### 12. Artifact Update Loop

Flujo esperado:

1. entra nueva evidencia
2. el agente procesa contexto
3. genera o actualiza el Discovery Brief
4. detecta gaps/conflictos
5. emite suggestions reviewables
6. el operador revisa
7. el sistema persiste el nuevo estado
8. el brief se versiona

La idea clave: **el brief se actualiza con nueva información, pero no reemplaza la verdad canónica sin revisión humana**.

#### Refresh behavior
- el sistema puede refrescar automáticamente cuando entra evidencia o corrección relevante
- `Refresh Brief` debe seguir existiendo como acción manual visible
- la UI debe dejar claro cuándo el brief fue actualizado y qué cambió
- evitar tanto el modelo solo manual como el automático opaco

#### Regla de versión actual
- cada actualización del agente sobre el artefacto crea una nueva versión
- la nueva versión pasa a ser la **current working brief**
- los puntos afectados no se consideran automáticamente validados
- si un punto requiere atención humana, debe quedar marcado inline como `needs review` o `conflict`
- el sistema debe mantener **un solo brief visible** en la pantalla principal
- no se debe introducir por defecto un segundo brief paralelo tipo `candidate version`

#### Regla para cambios mayores
Cuando un cambio sea estructural, sensible o de alto impacto, la UI puede agruparlo como un `review bundle` o propuesta destacada, pero sin romper la regla de un solo artefacto central visible.

### 13. Versioning / Diff / Review Model

La experiencia de versiones debe ser clara pero silenciosa.

#### Reglas
- solo una versión puede ser current working brief
- cada versión debe explicar por qué existe
- cada cambio del agente sobre el brief crea una nueva versión
- la última versión pasa a ser la current working brief
- los cambios sin validar deben marcarse en el propio brief, no separarse en otra superficie principal
- los cambios materiales deben poder verse como diff
- los puntos sensibles requieren revisión explícita
- el silencio no equivale a aprobación

#### Qué debe verse
- qué cambió
- qué punto cambió
- por qué cambió
- si fue por evidencia nueva o corrección humana
- si quedó pending review
- si el cambio quedó marcado como `needs review` o `conflict`

#### Pending Review rule
- la cola visible de review debe incluir solo items de alta saliencia
- incluir conflictos, cambios de alto impacto, riesgo regulatorio, baja confianza en puntos críticos o bloqueos operativos
- dejar fuera inferencias menores, cambios cosméticos o actualizaciones que no requieren un `sí` humano

#### Qué no debe verse
- granularidad técnica excesiva
- ruido de prompt
- columnas infinitas de estado

### 14. Wireframes (embedded markdown/ascii, multiple if useful)

#### 14.1 Overview
```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ SecondStream  Streams  Accounts  Evidence                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Acme Paint Sludge — Houston                                                 │
│ Acme Industrial · Owner · Pending review · 11:42 AM                         │
│ [Refresh Brief] [Complete Discovery]                                        │
│ Tabs: Overview | Structured Capture | Evidence | History                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ MAIN (70%)                              │ CONTEXT (30%)                     │
│                                        │                                   │
│ Executive Summary                      │ Pending Review                    │
│ - current state                        │ - conflict                         │
│ - blocker                              │ - assumption                       │
│ - implication                          │ - recommendation                   │
│                                        │                                   │
│ Discovery Brief                         │ Evidence Context                  │
│ [What we know]                         │ [selected point sources]          │
│ - Fact [confirmed]                     │ - source title + extract           │
│ - Fact [needs review]                  │ - provenance                       │
│                                        │                                   │
│ [What is missing]                      │ Recent Updates                     │
│ - Question [missing]                   │ - brief refreshed                  │
│                                        │ - evidence added                   │
│ [Conflicts]                            │ - correction saved                 │
│ - Conflict [conflict]                  │                                   │
│                                        │ Agent                              │
│ [Recommended next actions]             │ Discovery Completion Agent        │
│ - Recommendation [pending]             │ subtle, not dominant               │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 14.2 Structured Capture
```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Structured Capture                                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ Material & composition   [Needs review] ▸                                  │
│   Material type          Paint sludge with absorbents                       │
│   Hazard class           Not yet determined                                 │
│   Solids %               18% — 32%   Conflict                               │
│   pH range               ~6.2–7.1   Inferred                                │
│                                                                              │
│ Volume & frequency       [Needs review] ▸                                  │
│   Monthly volume         42–50 tons                                          │
│   Pickup frequency       Weekly, Thursdays                                  │
│   Container type         Not yet determined                                 │
│                                                                              │
│ Handling & logistics     [Missing info] ▸                                  │
│   Current hauler         Not yet determined                                 │
│   Storage method         Not yet determined                                 │
│                                                                              │
│ Compliance & documentation [On file] ▸                                    │
│   Manifests              3 documents                                        │
│   Lab reports            1 document                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 14.3 Version / Diff
```text
Brief v4
- Updated: container type inferred from voice note
- Updated: dwell time marked as ~2 weeks
- Changed: confidence on pH lowered to unverified
- New: pending review item for storage method

Why:
- new field evidence
- human correction
```

### 15. Functional Requirements

1. El workspace debe mostrar un Discovery Brief como artefacto principal.
2. El brief debe actualizarse cuando entra nueva evidencia.
3. El brief debe versionarse.
4. Cada versión debe tener razón de cambio.
5. Cada actualización del agente sobre el brief debe crear una nueva versión.
6. La última versión debe convertirse en la current working brief.
7. Los puntos no validados deben marcarse inline como `needs review` o `conflict`.
8. El sistema debe exponer conflictos y gaps explícitamente.
9. El sistema debe soportar revisión humana por punto.
10. Structured Capture debe existir como surface secundaria.
11. Evidence debe mostrar fuentes, extractos y proveniencia.
12. History debe mostrar evolución del brief y decisiones relevantes.
13. Debe existir un único agente visible en v1.
14. Las sugerencias del agente deben ser revisables antes de afectar verdad canónica.
15. `Complete Discovery` debe requerir cobertura mínima de grupos/campos indispensables.
16. La UI debe evitar chat-first, dashboard overload y control center visible.
17. La interfaz debe mantenerse simple, calmada, premium e intuitiva.
18. `Inferido` y `Requiere revisión` deben modelarse como estados distintos.
19. `Pending Review` debe mostrar solo items que realmente requieren juicio humano visible.
20. El workspace debe usar composer global persistente más acciones contextuales ligeras.
21. El sistema debe soportar actualización automática no invasiva más refresh manual visible.
22. Si una pregunta implica cambiar el brief, primero debe responder y luego proponer el cambio explícitamente.

### 16. Non-Goals / Out of Scope

- chat como workflow principal
- dashboard de misión multiagente
- agente visible como personaje protagonista
- ejecución automática de acciones externas
- escritura automática de verdad canónica
- reemplazo del modelo transaccional actual
- expansión AI-native a toda la plataforma
- control center global
- evidence graph completo
- automation profunda de pricing/logistics/regulatory en v1
- eliminación total del formulario estructurado

### 17. Success Criteria

- Un operador entiende qué sabe el sistema en <10 segundos.
- Un operador entiende qué falta y qué bloquea el caso.
- El brief se percibe como un artefacto vivo, no como una tabla o formulario.
- Las evidencias están ligadas a puntos concretos.
- Las revisiones humanas son visibles y naturales.
- La última versión del brief siempre es visible como current working brief sin crear dos artefactos competidores.
- Los cambios pendientes de validación se entienden inline y no obligan a navegar a otra pantalla.
- Structured Capture no domina la experiencia.
- La UI se siente premium, sobria y de producción.
- No hay sensación de chat-bot ni de dashboard cargado.

### 18. Open Questions

1. ¿Qué nivel exacto de detalle debe tener el diff visible entre versiones más allá del resumen por punto?
2. ¿Qué grupos/campos mínimos deben gatear `Complete Discovery` en v1?
3. ¿Qué campos de Structured Capture deben mostrarse primero en streams vacíos?
4. ¿Cómo se priorizan exactamente los Pending Review items entre bloqueo operativo, riesgo regulatorio y baja confianza?
5. ¿Qué señales mínimas debe mostrar el agente visible para ser útil sin volverse ruidoso?
6. ¿Qué nivel de provenance debe verse por defecto y cuál debe quedar bajo demanda?
