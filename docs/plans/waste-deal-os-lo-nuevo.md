# Waste Deal OS — Lo Nuevo y Cómo Funciona

**Lectura:** ~12 min | Para: Jose, Ricardo, Guillermo

Este documento explica solo lo que es nuevo — no lo que ya existe. Para cada feature, describe exactamente qué ve el usuario y qué hace el sistema por debajo.

El plan completo con contexto, arquitectura y fuentes está en `waste-deal-os-team-presentation.md`.

---

## Qué construimos y en qué orden

```
FASE 1 (Sem 1-4): Discovery
  → Missing Info Tracker
  → AI Questions
  → Evidence Graph
  → Outcome Ledger

FASE 2 (Sem 5-8): Document Intelligence
  → Inconsistency Detector
  → Document Freshness Engine
  → Material Passport completo

FASE 3 (Sem 9-12): Intelligence Layer
  → Compliance Copilot
  → Review Gate
  → Pricing Intelligence

FASE 4 (Sem 13+): Plataforma
  → Buyer Portal
  → SB253 Disclosure Pack
  → Red de brokers y buyers
```

---

## FASE 1 — Discovery

El objetivo de esta fase es resolver el pain más grande que Russ describió:

> "Esperar información domina el funnel. El deal se congela porque el contacto de EHS tiene que preguntarle a alguien más."

El field agent no sabe qué le falta, qué es urgente, ni cómo pedirlo. Fase 1 resuelve exactamente eso.

---

### 1. Missing Info Tracker — "¿Qué me falta y qué hago ahora?"

**El problema que resuelve:** El field agent captura datos del campo (fotos, voz, PDFs) y llega un momento donde el deal "está avanzado" pero sigue incompleto. No sabe si lo que falta es crítico o no. Manda emails genéricos al EHS. El deal se congela.

**Cómo funciona:**

1. Cada vez que el field agent guarda cambios en un deal, el sistema corre el tracker automáticamente.
2. El tracker escanea dos cosas:
   - **Campos vacíos o con baja confianza** en el Material Profile (ej: Water Content no fue capturado)
   - **Requisitos de outlets potenciales** (ej: Fuel Blender Alpha requiere Water Content < 5% — si no tenemos ese dato, no podemos enviarle el deal)
3. Genera una lista priorizada de blockers.
4. Para cada blocker, genera una acción concreta.

**Qué ve el field agent (Intelligence Panel, sidebar):**

```
MISSING INFO TRACKER
─────────────────────────────────────────────

🔴 Water Content test — faltante
   Por qué importa: Fuel Blender Alpha no acepta materiales
   sin este dato. Bloquea precio con el outlet de mayor valor.
   Qué hacer: [Enviar email a EHS →]    ← botón que abre draft

🔴 Umbrella Insurance $3M — faltante
   Por qué importa: El transporter no puede operar sin
   este seguro. El pickup está bloqueado.
   Qué hacer: [Subir documento de póliza →]

🟡 Placards (Class 3 Flammable) — no confirmados
   Por qué importa: Requerido antes del pickup.
   Qué hacer: Confirmar con el generador antes del día del pickup.

🟢 Densidad del material — vacía
   Por qué importa: Útil para calcular peso desde volumen.
   No bloquea el deal ahora.
```

**El draft de email generado:**

El field agent hace click en "Enviar email a EHS →" y el sistema abre esto:

```
Para: [EHS contact del generador]
Asunto: Información adicional requerida — [nombre del deal]

Hola [nombre],

Para avanzar con la cotización del material, necesitamos
confirmar los siguientes datos:

1. Water Content test — requerido por el comprador potencial
   (límite: menos de 5%). ¿Tienen un análisis reciente o
   podemos agendar una muestra?

2. Certificado de Umbrella Insurance por $3M mínimo para
   el transporter. ¿Pueden enviar la póliza vigente?

Si tienen alguna duda, con gusto coordino una llamada.

[firma del field agent]
```

El field agent puede editarlo o enviarlo tal cual. El sistema registra que el email fue enviado y espera respuesta.

---

### 2. AI Questions — "Preguntas que no sabías que tenías que hacer"

**El problema que resuelve:** Hay preguntas que no aparecen en ningún checklist porque dependen del contexto específico del material. El field agent no las hace porque no sabe que importan.

Russ lo describió exactamente: _"Si ingresas componente X, que salgan regulaciones y preguntas críticas que no sabías preguntar."_

**Cómo funciona:**

Un LLM lee el contexto completo del deal (material, proceso, composición parcial, documentos subidos) y genera preguntas que cambian el deal si la respuesta es sí o no.

**Ejemplos de AI Questions que el sistema genera:**

```
AI QUESTION — Alta prioridad
────────────────────────────────────────────────────────
"¿El proceso de limpieza de partes usó solvente clorado
(como tricloroetileno o percloroetileno)?"

Por qué importa: Si sí → la clasificación cambia de F003
(solvente no-clorado) a F001 (solvente clorado). F001 tiene
restricciones de outlet más estrictas y algunos compradores
no lo aceptan.

Si no → seguimos con F003. Confirmar esto ahora evita
rechazos tarde en el proceso.

[ Sí, hubo solvente clorado ]   [ No, solo solventes no-clorados ]
[ No sé — necesito preguntar ]
```

```
AI QUESTION — Media prioridad
────────────────────────────────────────────────────────
"¿Este material es crítico para la operación del generador?
(es decir, si no se mueve, se para producción)"

Por qué importa: Si sí → el sistema activa el modo
"Production Critical" que exige 2 outlets mínimo (uno
primario y uno de respaldo) para garantizar continuidad.

Si no → el deal puede avanzar con 1 outlet.

[ Sí, es crítico para producción ]   [ No, no es urgente ]
```

**La diferencia con un checklist normal:** Un checklist pregunta siempre lo mismo. Las AI Questions cambian según el material. Un deal de aceite de motor genera preguntas distintas que un deal de solvente industrial o de ácido. Las preguntas emergen del contexto.

---

### 3. Evidence Graph — "¿De dónde salió este dato?"

**El problema que resuelve:** Cuando el field agent captura datos de múltiples fuentes (SDS, nota de voz, foto, Lab Report), ¿cómo sabe el senior de dónde vino cada dato? Si el dato está mal, ¿en qué documento está el error?

**Cómo funciona:**

Cada dato en el Material Profile tiene un ícono de fuente. El field agent (o senior) puede hacer click para ver de dónde salió.

**Qué ve el field agent en el Material Profile:**

```
TECHNICAL SPECS
───────────────────────────────────────
Primary compound: MEK (90%)    [📄 SDS pg.1, 95% confianza]
Flash point: 16°F              [📄 SDS pg.4, 95% confianza]
Water content: 1.8%            [🔬 Lab_Oct.pdf, 98% confianza]
Volume: ~4 drums/month         [🎙️ Voice_Monday.mp3 2:15, 70% confianza]
Density: —                     [vacío]
```

Al hacer click en `[🎙️ Voice_Monday.mp3 2:15, 70% confianza]`:

```
Fuente: Voice_Monday.mp3
Minuto: 2:15
Transcripción: "Son como 4 tambores al mes, a veces 5,
               lo usan para limpiar las partes de la máquina"
Extraído por: Voice Interview Agent
Confianza: 70% (estimado verbal — el generador dijo "como")
Fecha de captura: 2026-10-10
```

**Por qué la confianza importa:** Un dato del Lab Report tiene 98% de confianza — es un número medido. Un dato de una nota de voz donde alguien dijo "como 4 tambores" tiene 70% — es una estimación. El senior que revisa sabe instantáneamente qué datos son duros y cuáles necesitan confirmación.

**Por qué es una tabla separada (no un campo suelto):** Los datos del deal cambian a medida que llega más información. El sistema guarda cada versión — si el water content era "desconocido", luego "~2% estimado", y finalmente "1.8% medido por lab", las tres versiones existen. Nunca se pierde el historial.

---

### 4. Outcome Ledger — "Lo que aprendimos de este deal"

**El problema que resuelve:** Cuando un deal cierra, todo el conocimiento (precio, outlet elegido, por qué ganaron o perdieron, cuánto costó el lab) se va a la cabeza del senior. El próximo deal similar empieza de cero.

**Cómo funciona:**

Cuando el field agent cierra un deal (Won o Lost), aparece un formulario obligatorio — no puede marcar el deal como cerrado sin llenarlo.

**El formulario al cerrar:**

```
CERRAR DEAL — Outcome Ledger
─────────────────────────────────────────────────────

Resultado:  ● Won    ○ Lost

Outlet elegido: Fuel Blender Alpha
Precio final: $ 0.12 / lb
Volumen total: 22 drums (~880 lbs)

Lab spend:
  [ Karl Fischer test ]   $ 150
  [ Full panel ]          $ ___    (si se pidió)

¿Por qué ganaron / perdieron?
  "El buyer requirió water content < 2%. El test de Karl
   Fischer confirmó 1.8%. Sin el test no hubiéramos podido
   cotizar con este outlet."

[ Guardar y cerrar deal ]
```

Estos datos no los verá el buyer ni el generador. Son datos internos del broker — su inteligencia de negocio, acumulada deal por deal.

**Por qué es obligatorio y no opcional:** Si es opcional, nadie lo llena cuando están ocupados. Al ser el paso final para cerrar el deal en el sistema, se llena naturalmente. En 6 meses, el equipo de Russ tiene un historial de pricing que no existe en ningún otro lado.

---

## FASE 2 — Document Intelligence

El objetivo de esta fase es hacer que la IA no solo extraiga datos, sino que evalúe la calidad y confiabilidad de esos datos.

---

### 5. Inconsistency Detector — "Esto se contradice aquí"

**El problema que resuelve:** El field agent sube varios documentos. El SDS dice una cosa, el Lab Report dice otra. Sin este detector, el error llega hasta el Review Gate (o peor, hasta el buyer).

**Cómo funciona:**

Cada vez que se procesa un nuevo documento, el sistema compara los campos extraídos contra los valores que ya existen en el Evidence Graph de otras fuentes.

**Ejemplo real — qué aparece en la pantalla:**

```
⚠️ INCONSISTENCIA DETECTADA
─────────────────────────────────────────────────────
Campo: Flash Point

  SDS_Solvent_2024.pdf (pg. 4):   16°F   [95% confianza]
  Lab_Analysis_Oct.pdf (pg. 2):   18°F   [98% confianza]

¿Por qué importa?
El flash point determina la clasificación DOT (Class 3
Flammable). Ambos valores clasifican como Class 3, pero
la discrepancia puede levantar preguntas del buyer.

¿Cuál es correcto? Los análisis de lab son más recientes
y específicos que el SDS (que es del fabricante del
solvente virgen, no del material gastado).

[ Usar Lab Report (18°F) ]   [ Marcar para revisar con Senior ]
[ Ignorar — son equivalentes para este caso ]
```

```
🔴 INCONSISTENCIA CRÍTICA
─────────────────────────────────────────────────────
Campo: Composición primaria

  SDS_Solvent_2024.pdf:     MEK 90%, agua 10%
  Voice_Monday.mp3 (2:48):  "como 60% MEK, creo que hay
                              tolueno también, como 30%"

¿Por qué es crítica?
Si hay tolueno al 30%, la clasificación RCRA cambia.
F003 cubre MEK puro. Una mezcla con tolueno puede requerir
análisis adicional para determinar el código correcto.

Acción requerida: Solicitar análisis completo de composición
antes de avanzar con la clasificación regulatoria.

[ Pedir análisis de composición ]   [ El generador confirma que es solo MEK ]
```

**La diferencia con detectar "campo vacío":** El campo NO está vacío — tiene valores en ambas fuentes. El problema es que los valores no coinciden. Esto no lo puede detectar ningún checklist estático.

---

### 6. Document Freshness Engine — "Este dato está viejo"

**El problema que resuelve:** Un Lab Report de hace 3 años técnicamente existe, pero el comprador lo va a rechazar. Sin este sistema, el field agent trabaja semanas en un deal y el buyer dice "estos análisis están vencidos".

**Cómo funciona:**

Cada documento tiene un semáforo según su tipo y antigüedad.

**Reglas por tipo de documento (configurables):**

| Tipo de doc | Verde (Fresh) | Amarillo (Aging) | Rojo (Stale) |
|---|---|---|---|
| Lab Analysis | < 6 meses | 6-12 meses | > 12 meses |
| SDS | < 3 años | 3-5 años | > 5 años |
| Waste Profile | < 1 año | 1-2 años | > 2 años |
| Manifest antiguo | < 2 años | 2-3 años | > 3 años |

**Qué ve el field agent en la sección de files:**

```
FILES & DOCUMENTS
──────────────────────────────────────────────────────
🟢 Lab_Analysis_Oct2025.pdf    Hace 14 días   Water content: 1.8%
🟡 SDS_Solvent_2022.pdf        3 años         Composición, Flash point
🔴 Lab_Analysis_Jan2022.pdf    4 años         [STALE — no usar para cotización]
🟢 Voice_Monday.mp3            Hace 2 días    Volumen, proceso
```

**En el Material Passport, solo los documentos 🟢 y 🟡 aparecen como evidencia.** Los documentos 🔴 quedan disponibles internamente pero no se presentan al buyer.

---

## FASE 3 — Intelligence Layer

---

### 7. Compliance Copilot — "Algo no está correcto en la regulación"

**El problema que resuelve:** La clasificación regulatoria (RCRA, DOT) es compleja. Depende del material, del proceso que lo generó, del estado donde está, y de si se va a reusar o desechar. Un error aquí = multa de $70,000 o rechazo del deal.

**IMPORTANTE: NO es un LLM que "busca en internet".** Es determinístico — trabaja con tablas de reglas conocidas. Las reglas no alucinan. Cuando no sabe, dice que no sabe.

**Cómo funciona — ejemplo paso a paso:**

El sistema tiene el siguiente dato del deal:
- CAS number: 78-93-3 (MEK)
- Proceso generador: "parts cleaning"
- Estado: Texas
- Ruta de salida: reuso como fuel blending

El Compliance Copilot hace 3 lookups en secuencia:

**Lookup 1 — RCRA:**
```
Tabla interna:
  CAS 78-93-3 + "parts cleaning" + "discarded" → F003 (87% match)
  (F003 = Spent non-halogenated solvents)

Resultado:
  [F003 Probable — 87% confianza]
  Motivo: MEK usado en limpieza de partes es F003 cuando
  se descarta. Si se reutiliza como combustible, aplica
  la "legitimate use exclusion" — podría no ser waste.

  ⚠️ Falta confirmar: ¿Es "discarded" o "legitimate reuse"?
  Esto cambia si necesita un manifest o no.
```

**Lookup 2 — State flags (Texas):**
```
Texas: Sin requisitos adicionales para F003 (TCEQ sigue EPA)
Sin flags especiales para este caso.
```

**Lookup 3 — DOT Transport:**
```
MEK (CAS 78-93-3) →
  UN Number:     UN1193
  Hazard Class:  Class 3 Flammable Liquid
  Packing Group: PG II (flash point < 73°F)
  Placards:      FLAMMABLE (obligatorio)
  Vehículo:      Vacuum truck con certificación hazmat
```

**Qué ve el field agent (sidebar, Compliance tab):**

```
COMPLIANCE COPILOT — ADVISORY
─────────────────────────────────────────────────────
⚠️ Todo output es Advisory. Un Senior lo valida en Review Gate.

RCRA CLASSIFICATION
  [F003 Probable — 87%]
  Spent non-halogenated solvent (MEK, parts cleaning)

  ❓ Pregunta abierta:
  "¿El material se va a reusar como combustible (fuel blending)
   o se va a desechar? Si es reuso legítimo, puede aplicar
   la 'legitimate use exclusion' y no necesitar manifest."

  [ Se reutiliza como combustible ]   [ Se desecha ]

STATE FLAGS (Texas)
  ✅ Sin requisitos adicionales para F003 en Texas.

DOT TRANSPORT
  UN1193 | Class 3 Flammable | PG II
  Placards: FLAMMABLE (obligatorio en el camión)
  Equipo requerido: Vacuum truck con certificación hazmat

  ✅ Loading dock confirmado (del generador)
  ❌ Placards no confirmados — agregar a Missing Info
```

**Cuando el sistema no sabe:**

```
COMPLIANCE COPILOT — ADVISORY
─────────────────────────────────────────────────────
RCRA CLASSIFICATION
  [Clasificación manual requerida]

  Por qué: La composición dice "60% MEK + 30% tolueno +
  10% desconocido". Las tablas de F-codes son para
  solventes puros o mezclas conocidas. Una mezcla con
  componente desconocido requiere análisis completo y
  revisión manual por un Senior.

  Pasos recomendados:
  1. Solicitar análisis de composición completo al generador
  2. Cuando tengamos la composición, el Copilot puede re-evaluar
  3. Si hay componentes clorados, la clasificación cambia a F001
```

**Cada corrección del Senior se guarda como aprendizaje:**

Cuando el Senior en el Review Gate corrige F003 → F005, el sistema pregunta por qué. Esa razón + contexto del deal se guarda internamente. Con el tiempo, estas correcciones mejoran las sugerencias del Copilot para casos similares.

---

### 8. Review Gate — El Senior valida antes de salir al buyer

**El problema que resuelve:** Un field agent junior puede tener un deal al 95% con datos incorrectos. Sin este gate, ese error llega al buyer.

**Cómo funciona:**

El field agent hace click en "Solicitar Review Senior". El deal pasa a la columna "Review Gate" en el Deal Board. El Senior (Steve, Lisa) recibe una notificación.

**Lo que ve el Senior:**

```
SENIOR REVIEW GATE
─────────────────────────────────────────────────────
Mike solicita aprobación para generar Material Passport.
Deal: Tanque Solvente - Texas | 14 días abierto

COMPLIANCE
  Sugerido: F003 (Advisory, 87%)
  [ Aprobar código ]   [ Corregir → _____ ]   [ Rechazar ]

  Si el Senior corrige: el sistema pregunta el motivo →
  se guarda como CorrectionEvent para mejorar el sistema.

RUTA & PRICING
  Plan de Mike: Fuel Blender Alpha a $0.12/lb (Primary)
               Recycler B a $0.08/lb (Backup)
  [ Aprobar ]   [ Agregar comentario ]

EVIDENCIA
  3 documentos vinculados | Todos Fresh (< 6 meses)
  [ Aprobar ]   [ Pedir más evidencia ]

─────────────────────────────────────────────────────
[ APROBAR → GENERAR MATERIAL PASSPORT ]
```

El Senior no reescribe nada — solo valida o corrige. El Material Passport se genera solo cuando el Senior aprueba.

---

### 9. Pricing Intelligence — "Deals similares se cerraron a este precio"

**El problema que resuelve:** El broker negocia "a ciegas". El pricing depende de la memoria de los veteranos. Sin historial documentado, cada deal empieza desde cero.

**Cómo funciona:**

1. El Outcome Ledger acumula datos de cada deal cerrado.
2. Cuando el field agent abre un deal nuevo, el sistema busca deals similares (mismo material, misma región, calidad similar).
3. Muestra el histórico como referencia.

**Qué ve el field agent (sidebar, Pricing tab):**

```
PRICING INTELLIGENCE
─────────────────────────────────────────────────────
Basado en deals similares en tu organización:
Material: Spent Solvent (MEK-based) | Región: Texas

DEALS SIMILARES
  Deal #147 — MEK 88%, TX, Oct 2025
    Outlet: Fuel Blender Alpha | $0.12/lb | ✅ Won
    Lab spend: $150 (Karl Fischer)

  Deal #203 — MEK 91%, TX, Mar 2025
    Outlet: Fuel Blender Alpha | $0.10/lb | ✅ Won
    Lab spend: $150 (Karl Fischer)

  Deal #156 — MEK 85%, TX, Nov 2024
    Outlet: Recycler B | $0.08/lb | ✅ Won
    Lab spend: $0 (buyer no requirió análisis)

RANGO OBSERVADO: $0.08 — $0.14/lb
  (deals en TX, MEK >85%, últimos 18 meses)

LAB INSIGHTS
  Karl Fischer ($150) fue decisivo en 3 deals similares.
  Full analytical panel ($1,500) nunca fue necesario
  para MEK > 85% en Texas.
  Recomendación: pedir Karl Fischer, no el panel completo.
```

**Día 1 del sistema:** Esta sección estará vacía hasta que se importen los deals históricos de Russ y se cierren los primeros deals nuevos. El sistema lo indica claramente: "Sin deals similares en el historial todavía."

**El moat:** En 12 meses, este historial no existe en ningún otro sistema. No es información pública. Es la inteligencia de negocio acumulada del broker — y vive en la plataforma.

---

## El Output Final — Material Passport

Cuando el Senior aprueba en el Review Gate, se genera el Material Passport. Es el documento que va al buyer — limpio, profesional, sin datos internos del broker (sin precios, sin notas de campo, sin historial de ediciones).

```
MATERIAL PASSPORT  WP-2026-8842
─────────────────────────────────────────────────────
Validado por: Steve M. | Oct 24, 2026

MATERIAL
  Clasificación: Spent non-halogenated solvent (MEK)
  Origen: Texas, USA | RCRA: F003 | DOT: Class 3, UN1193

ESPECIFICACIONES TÉCNICAS
  Methyl Ethyl Ketone: ~90%   Flash Point: 16°F (-9°C)
  Water Content: 1.8%         Density: 0.81 g/cm³

IMPACTO AMBIENTAL
  CO2 Evitado: 14.2 t/año (EPA WaRM v16)
  SDG: Objetivo 12 — Consumo Responsable

EVIDENCIA
  1. Lab_Oct2025.pdf   Fresh (14 días)   Water content
  2. Tank_photo.jpg    Visual / campo    Condición del tanque
  3. SDS_2024.pdf      Referencia        Composición, Flash point

  e-Manifest: [ Exportar datos ] → JSON/CSV mapeado a campos EPA
─────────────────────────────────────────────────────
```

El buyer recibe esto — no una propuesta con ideas de negocio. Especificaciones reales, evidencia verificada, compliance confirmado.

---

## Validación por Fase — Cómo sabemos que funciona

### Fase 1 (semana 3-4)
- Russ trabaja 1 deal real en el sistema
- El completeness score refleja su evaluación (si dice 62%, él cree que está al 62%)
- Los blockers identificados son los que él hubiera identificado manualmente
- Se generan 3 Material Passports con datos reales
- Se envía 1 passport a 1 buyer real por email (sin portal todavía — solo PDF)

### Fase 2 (semana 7-8)
- Se suben 5 documentos reales de Russ
- El Inconsistency Detector identifica correctamente las contradicciones que el equipo ya conoce
- El Freshness Engine coincide con la evaluación del equipo sobre qué documentos están "viejos"
- El buyer que recibió el PDF en Fase 1 da feedback sobre el formato

### Fase 3 (semana 11-12)
- Test end-to-end: deal nuevo desde field visit hasta passport compartido con buyer
- Medir tiempo total vs proceso anterior (la métrica clave es time-to-passport)
- El equipo de Russ usa el Review Gate sin fricción
- El Compliance Advisory coincide con la clasificación que Steve hubiera dado manualmente

---

## Preguntas sin responder (decisiones que el equipo necesita tomar)

1. **¿Russ está confirmado para semana 3-4?** Sin un deal real, la validación de Fase 1 es solo teórica.
2. **¿Tenemos acceso a 1 buyer para validar el formato del Passport?** El Passport vale solo si un comprador dice "esto me sirve".
3. **¿Podemos importar el historial de deals de Russ?** Aunque sea en CSV manual — para que el Outcome Ledger no arranque vacío.
4. **¿La IA Questions debería hacer preguntas directamente al EHS del generador o solo al field agent?** Cambiaría significativamente el flujo.
5. **¿La clasificación RCRA del MVP cubre solo F001-F005 o también K-codes y characteristic waste?** Definir scope del Compliance Copilot antes de construirlo.
