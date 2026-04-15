Verdict
¿Vamos bien? PARCIALMENTE.
La dirección estratégica es correcta: artifact-first, review-first, evidence-grounded, no chat-first. Esto está bien y es coherente con lo que funcionan los productos AI-native premium en abril 2026.
El problema: La implementación UI actual es form-first con 31 preguntas densas, 4 fases, progreso en 5 lugares diferentes, y badges "AI" por todas partes. Esto es exactamente lo opuesto a la dirección acordada en los documentos de plan.
La UI actual se siente como un dashboard enterprise con AI pegada encima, no como un workspace artifact-first. Necesita una amputación mayor, no un refresh.
---
Strong Patterns to Adopt (from Linear, Claude, Notion, Harvey, etc.)
1. Artifact como centro de gravedad físico — El Discovery Brief debe ocupar visualmente el 60-70% del viewport por defecto, no ser un card entre otros cards. Como Claude Artifacts: el artefacto ES la interfaz.
2. Calm density de Linear — 24-32px spacing alrededor del artefacto principal, pero densidad ultra-alta (6px items) dentro del brief. Whitespace estratégico, no uniforme.
3. Estados como first-class citizens discretos — "Pending review" no es un badge verde brillante, es un indicador de 4px en el borde del punto + tooltip al hover. Linear usa bordes y opacidad, no badges.
4. Evidence side-by-side sin competir — Panel derecho de 320-400px que muestra fuentes vinculadas al punto seleccionado, no una galería de archivos genérica. Como Perplexity: cada claim tiene citation 1, hover muestra snippet.
5. Agent invisible por defecto — No avatares, no "AI is thinking...", no mascotas. El Discovery Completion Agent se representa como metadata sutil: "Brief refreshed 2m ago · Confidence: medium". Como Raycast: AI es capacidad, no personaje.
6. Actions como ghost text/contextual — "Accept/Mark incorrect/Needs verification" no son botones permanentes, aparecen al hover o focus del punto. Como Notion AI inline suggestions.
7. Warm monochrome palette — Fondos #FAFAFA o #F7F6F3 (grises cálidos), bordes rgba(0,0,0,0.06), acento índigo #5E6AD2 saturación 50%. Nunca azul corporativo #0066CC.
8. Typography como jerarquía principal — Inter 400/500/600, tamaños 11px (labels), 13px (metadata), 14px (body), 16px (lead). Nunca más de 3 pesos. Tracking -0.02em en headings.
9. Next Actions como propuestas, no botones — "Request fresh sample" con contexto de por qué, no un botón genérico "Complete Phase 3". Como Harvey: acciones opinionated por dominio.
10. Review explícito sin fricción — Cada punto del brief tiene semántica de review visible: confirmed (check sutil), needs review (dot ámbar), conflict (línea roja). Sin badges, sin banners.
11. Flat surfaces con bordes sutiles — Cards con border 1px rgba(0,0,0,0.08), sin sombras grandes, sin elevación material design. shadcn/ui + Radix como base.
12. Skeleton loading, no spinners — Shimmer effect en el brief mientras se genera, no "AI is analyzing..." con burbuja animada.
---
Anti-Patterns to Avoid (errores que la UI actual comete)
1. Form-first con 31 preguntas visibles — El usuario ve una matriz de campos, no un artefacto coherente. Esto mata el modelo mental artifact-first.
2. Progress indicators everywhere — Barra de progreso en header, en cada fase, en cada sección, en cada campo. Es visual noise masivo. Linear tiene cero barras de progreso visibles por defecto.
3. Badges "AI" prominentes — El sparkle icon y "AI suggestion ready" banners rompen la calma. El AI debe ser invisible cuando funciona bien.
4. Phase stepper heavy — 4 fases con descripciones, porcentajes, y navegación explícita. Esto es wizard mentality, no workspace mentality.
5. Dashboard density sin jerarquía — Stream title + breadcrumb + badges + owner selector + file button + contacts button + phase stepper + progress bar + 31 questions = cognitive overload total.
6. Section cards con iconos, progress, badges — Cada sección del form tiene un header visual completo: icono, título, "X of Y fields", progress bar, AI badge, Accept/Reject buttons. Esto es UI fighting itself.
7. Evidence como lista separada — El panel de "Files" es una navegación separada, no contextual al punto del brief. Evidence disconnect total.
8. Agent no representado / chat fallback — Si el agente no es visible en la UI, el usuario asume que no hay AI. Pero el agente actual (Quick Capture) aparece como card separada, no como parte del brief loop.
---
Audit of Current UI
❌ Qué está MAL (requiere cambio estructural)
- 31 preguntas visibles simultáneamente — Esto es inherentemente abrumador. El límite cognitivo humano es 4±1 elementos, no 31.
- StreamPhaseStepper prominente — Ocupa demasiado espacio visual para algo que debería ser navegación secundaria (o invisible en modelo artifact-first).
- Phase Summary Bar duplicado — "Phase X: Label · X of Y fields · Progress bar · %" — Esto es el mismo dato 3 veces.
- Badges "AI ready" en verde brillante — Rompen la calma visual. Deben ser indicadores de 4px, no banners.
- Accept/Reject buttons en cada campo — UI density excesiva. Las acciones de review deben ser hover/focus, no permanentes.
- "Complete Discovery" como CTA ciego — No hay readiness gate visible antes de completar. Violación de explicit consent.
⚠️ Qué está REGULAR (puede evolucionar o morir)
- Dos-column layout (70/30) — La estructura es correcta, pero el contenido actual (form en main, quick capture en sidebar) está invertido.
- Card-based sections — Los cards funcionan pero tienen demasiado adorno (iconos, borders, backgrounds).
- StreamWorkspaceForm como structured capture — Este componente tiene sentido como tab secundaria, pero no como default view.
- QuickCaptureCard en sidebar — Es útil pero debería integrarse al flujo de evidence, no ser un card separado.
✅ Qué va BIEN (mantener y expandir)
- Autosave pattern — "Saving... / All changes saved" es correcto y calm.
- Breadcrumb "Waste Streams › Discovery Workspace › Title" — Ayuda con orientación sin ocupar espacio excesivo.
- Owner assignment inline — No es un modal, no interrumpe flujo. Buen pattern.
- Navigation "Files / Contacts" outline buttons — Estilo correcto, aunque posiblemente deberían estar menos prominentes.
---
Recommended Direction for SecondStream
Layout
- Main: 65-70% — Discovery Brief como documento vivo, no form.
- Rail: 30-35% — Context panel con: Pending Review (top), Evidence Context (middle, bound to selection), Recent Updates + Agent Presence (bottom, compact).
- Structured Capture — Mueve el form actual a tab secundaria, no default. Cuando se abre, usar single-column con groups colapsables (uno expandido máximo).
Hierarchy
[Header quiet: Title + Status dot + Last updated]
[Executive Summary: 3 líneas máximo]
[Discovery Brief: sections tipadas]
  - What we know (Facts, Assumptions)
  - What is missing (Questions)
  - Conflicts (resaltado visual sutil)
  - Recommended next actions
[Open Questions: top 3-5, collapsible]
[Next Best Actions: max 3, con contexto de por qué]
Spacing
- Alrededor del brief: 24-32px (respiración)
- Dentro del brief: 12-16px entre secciones, 8px entre puntos
- Rail: 16px padding interno, 16px gap entre bloques
- Nunca mostrar 31 campos con 16px gap cada uno — eso es 496px de spacing puro.
Typography
- Inter (ya usan algo similar, mantener)
- Headings: 16-20px semibold (-0.02em tracking)
- Body brief: 14px normal (1.5 line-height)
- Metadata/source: 11px (color secondary)
- No más de 3 tamaños visibles simultáneamente
Surfaces
- Background: #FDFCFB (blanco cálido)
- Surface cards: #FFFFFF con border 1px rgba(0,0,0,0.06)
- Hover: rgba(0,0,0,0.03)
- Selected: rgba(91,103,210,0.06) + border índigo
- Borders: rgba(0,0,0,0.06) default, (0.12) strong
- Success/Warning/Error: usados solo para estados funcionales, nunca decorativos
Rails
- Pending Review: Lista de 2-4 items máximo, cada uno clickeable para foco en brief point.
- Evidence Context: Empty state sutil, o snippet de fuente vinculada al punto seleccionado.
- Recent Updates: 3 items máximo, timestamps relativos ("2m ago").
- Agent Presence: Compacto, tipo "Discovery Completion Agent · Run: 2m ago · What changed?"
States
- Skeleton shimmer mientras se genera/refresca brief
- Pending review: Dot ámbar de 6px al lado del punto
- Confirmed: Check verde de 14px, sutil
- Conflict: Borde rojo de 1px en el punto específico
- Stale brief: Timestamp en color warning + "Refresh" inline
Evidence/Provenance
- Inline citations — Cada claim en el brief tiene 1 superscript
- Hover — Preview de fuente con snippet
- Click — Abre fuente resaltando sección relevante
- Conflict view — Side-by-side en Evidence Context rail cuando hay discrepancia
Agent Representation
- Invisible por defecto — No avatares, no sparkles grandes, no chat bubbles.
- Visible como metadata — En rail inferior: freshness, confidence, acciones "What changed? / Why this?"
- No chat panel — Si existe chat, es side drawer secundario, no flujo principal.
Interaction Model
- Point selection — Click en punto del brief = selección + evidence context update
- Point actions — Hover/focus muestra: Accept · Mark incorrect · Needs verification · Add note
- Review saves immediately — No "Save changes" button, feedback sutil (estado cambia inline)
- Brief refresh — Non-blocking, skeleton shimmer, luego highlight sutil de puntos cambiados
- Complete Discovery — Siempre con readiness gate visible: "3 items pending review · 1 conflict unresolved"
---
5 Highest-Leverage Changes
1. Amputar el form-first: 31 → 0 preguntas visibles por defecto
El Discovery Brief reemplaza completamente el formulario como vista default. El form se mueve a tab "Structured Capture". Impacto: Transforma el modelo mental de "llenar campos" a "revisar comprensión".
2. Implementar el brief como documento vivo tipado
Secciones: What we know / What is missing / Conflicts / Next Actions. Cada punto tipado (Fact, Assumption, Conflict, Question, Recommendation) con indicadores de estado discretos. Impacto: El artefacto se convierte en el centro de gravedad.
3. Eliminar todos los progress indicators excepto uno
Quitar: phase stepper visual heavy, phase summary bar, section progress bars, field completion checks. Mantener: Un indicador sutil de "brief coverage" en header si es absolutamente necesario. Impacto: Reduce noise visual 70%.
4. Rail contextual: Evidence bound to selection
Reemplazar el sidebar actual (Quick Capture card) con: Pending Review (queue) + Evidence Context (bound to selected brief point) + Recent Updates. Impacto: Evidence-grounded de verdad, no evidence como lista separada.
5. Agent invisible + chat secundario (no default)
Eliminar badges "AI" prominentes, sparkles animados, "AI is ready" banners. Representar al agente como metadata fresca en rail. Chat disponible solo como "Ask about this" en puntos específicos, drawer lateral. Impacto: No se siente como chat app, se siente como tool premium.
---
Conclusión Directa
La dirección documentada es correcta. La implementación actual no lo cumple.
La UI actual es form-first con AI pegada encima. Para llegar a artifact-first review-first evidence-grounded, necesitas:
1. Matar el form-first — Default view debe ser brief, no campos
2. Reducir density 60% — 31 preguntas → 4-8 puntos tipados visibles
3. Eliminar progress theater — Barras de progreso everywhere → indicadores de estado discretos
4. Invertir la estructura — El brief es el centro, el form es secundario
5. Calm UI — Colores cálidos, bordes sutiles, tipografía fuerte, AI invisible
Si haces estos 5 cambios, pasas de "dashboard enterprise con AI" a "AI-native premium workspace".
