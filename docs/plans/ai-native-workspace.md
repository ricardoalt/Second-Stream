PRD — AI-Native Stream Workspace + Discovery Completion Agent v1
Problem Statement
Hoy SecondStream ayuda al broker a capturar información, revisar extracciones AI y completar el workspace, pero la comprensión actual del stream sigue viviendo principalmente en la cabeza del operador.
El sistema actual tiene varias limitaciones:
- el workspace está demasiado centrado en un formulario largo y cognitivamente pesado
- la AI ayuda con extracción y sugerencias, pero no mantiene una comprensión operativa durable del caso
- el broker tiene que reconstruir mentalmente:
  - qué se sabe
  - qué falta
  - qué está en conflicto
  - qué evidencia soporta cada punto
  - qué debería hacerse ahora
- el sistema no expone todavía un artefacto único, claro y revisable que represente la comprensión actual del stream
- no existe todavía un harness explícito que trate al agente como un actor gobernado del producto con:
  - contexto
  - memoria
  - herramientas
  - runs
  - revisiones humanas
  - artefactos durables
Desde la perspectiva del usuario, el problema no es “faltan más features de AI”.  
El problema es:
SecondStream todavía no sostiene la comprensión viva del caso como artefacto del producto.
---
Solution
Introducir un nuevo AI-native Stream Workspace cuyo centro ya no sea el formulario, sino un Discovery Brief vivo generado por el Discovery Completion Agent.
Enfoque de producto
- el workspace se convierte en la surface principal donde el broker supervisa y corrige la comprensión actual del stream
- el Discovery Brief se convierte en el artefacto broker-facing principal
- el agente trabaja con:
  - nueva evidencia
  - contexto del stream
  - memoria local del caso
  - dossiers históricos relevantes
  - conocimiento aprobado de la organización
- el brief responde siempre:
  - qué sabemos
  - qué no sabemos
  - qué está bloqueando
  - qué deberíamos hacer ahora
- el brief puede emitir workspace suggestions, pero no escribe directamente la verdad canónica
- el broker sigue siendo el operador principal:
  - revisa
  - corrige
  - acepta
  - difiere
  - aprueba el brief actual
Simplificación clave de v1
El sistema visible para el usuario debe reducirse a pocas primitivas:
- Discovery Brief
- Pending Review
- Evidence
- Next Actions
El formulario actual no desaparece, pero pasa a una surface secundaria de Structured Capture.  
Los campos actuales siguen existiendo como estructura interna y coverage model, no como la experiencia principal.
Harness v1 para este alcance
El harness v1 de este PRD cubre solo el flujo de workspace/discovery:
- una AgentSession viva por stream mientras el contexto material siga siendo el mismo
- múltiples AgentRun dentro de esa session
- un artefacto principal: Discovery Brief
- memoria durable controlada por SecondStream
- herramientas/capabilities de dominio pequeñas y legibles
- revisión humana obligatoria para cambios sensibles
---
User Stories
1. Como broker, quiero ver una comprensión actual del stream en una sola vista, para no reconstruir mentalmente el caso cada vez.
2. Como broker, quiero que el sistema me diga claramente qué sabemos, para saber si ya tengo una base útil de trabajo.
3. Como broker, quiero ver qué información falta, para saber qué debo pedir o verificar.
4. Como broker, quiero ver qué está bloqueando el progreso, para priorizar mi trabajo.
5. Como broker, quiero ver la siguiente mejor acción sugerida, para avanzar el caso sin perder tiempo.
6. Como broker, quiero revisar un brief único y coherente, para no saltar entre formularios, archivos y sugerencias dispersas.
7. Como broker, quiero que los puntos importantes del brief estén tipados, para distinguir hechos, preguntas, conflictos y recomendaciones.
8. Como broker, quiero ver la evidencia que respalda cada punto importante, para confiar en el sistema.
9. Como broker, quiero poder marcar un punto como incorrecto, para corregir al agente sin editar todo el brief.
10. Como broker, quiero marcar un punto como needs verification, para expresar incertidumbre sin descartarlo por completo.
11. Como broker, quiero agregar una nota sobre un punto, para dejar contexto útil para futuras corridas del agente.
12. Como broker, quiero aceptar un punto correcto, para reforzar el conocimiento útil del sistema.
13. Como broker, quiero que las correcciones humanas queden registradas, para que el sistema mejore con el tiempo.
14. Como broker, quiero que el brief se refresque cuando entre evidencia nueva, para no trabajar sobre una visión vieja.
15. Como broker, quiero poder refrescar el brief manualmente, para controlar cuándo recalcular la comprensión actual.
16. Como broker, quiero ver si el brief actual está pendiente de revisión, para no asumir que ya está listo.
17. Como broker, quiero aprobar un current working brief, para fijar una base operativa de trabajo.
18. Como broker, quiero que el sistema no tome mi silencio como aprobación, para mantener control real.
19. Como broker, quiero que el sistema muestre conflictos entre fuentes, para no esconder discrepancias importantes.
20. Como broker, quiero que una fuente histórica sirva como analogía, no como verdad automática, para evitar contaminación de casos.
21. Como broker, quiero que las sugerencias al workspace sean revisables, para que la verdad canónica no cambie sola.
22. Como broker, quiero ver una cola de Pending Review, para saber qué requiere mi atención humana.
23. Como broker, quiero abrir la evidencia relevante desde el punto del brief, para entender rápidamente por qué el agente cree algo.
24. Como broker, quiero una vista de Structured Capture, para editar manualmente información estructurada cuando haga falta.
25. Como broker, quiero que Structured Capture sea más liviana y enfocada, para no volver a una experiencia abrumadora.
26. Como broker, quiero que la captura de voz, notas, mensajes y archivos alimenten el mismo modelo de descubrimiento, para no trabajar en canales separados.
27. Como broker, quiero que el agente considere el contexto de la cuenta y ubicación, para producir mejores preguntas y recomendaciones.
28. Como broker, quiero que el sistema recuerde observaciones importantes del stream, para no repetir trabajo.
29. Como broker, quiero que las notas humanas importantes se traten como observaciones de primera clase, para que no se pierdan.
30. Como broker, quiero que la historia del brief tenga versiones, para ver cómo cambió la comprensión del caso.
31. Como broker, quiero entender por qué cambió una nueva versión del brief, para revisar solo lo importante.
32. Como broker, quiero que las recomendaciones tengan estados claros, para diferenciar lo aceptado ahora, lo diferido y lo rechazado.
33. Como field agent, quiero ver rápidamente qué información es suficientemente confiable y cuál no, para saber qué revisar en sitio.
34. Como field agent, quiero usar el workspace sin sentir que estoy llenando un formulario interminable, para capturar información de forma más natural.
35. Como field agent, quiero agregar evidencia rápidamente, para alimentar el caso sin fricción.
36. Como field agent, quiero ver las preguntas abiertas más importantes, para saber qué debo preguntar o comprobar.
37. Como org admin, quiero que el sistema use memoria y contexto controlados por SecondStream, para no depender de memoria propietaria del proveedor del modelo.
38. Como org admin, quiero que el agente use un conjunto acotado de herramientas de dominio, para que sea gobernable y mantenible.
39. Como org admin, quiero ver runs fallidos y briefs pendientes de revisión en una surface de supervisión, para monitorear el trabajo del agente.
40. Como org admin, quiero que el sistema capture feedback estructurado de alta señal, para construir aprendizaje útil con el tiempo.
41. Como org admin, quiero que patrones repetidos de error generen candidatos de revisión, para convertir correcciones en conocimiento reusable.
42. Como producto, quiero introducir una surface AI-native sin romper el modelo transaccional actual, para evolucionar incrementalmente.
43. Como producto, quiero mantener el formulario actual como estructura de fondo y soporte de coverage, para aprovechar lo que ya existe sin forzarlo como UI principal.
44. Como sistema, quiero persistir el Discovery Brief como artefacto durable, para auditoría, historial y futuro consumo por otros agentes.
45. Como sistema, quiero tratar al agente como un actor gobernado del producto, para preparar la expansión AI-native futura.
46. Como sistema, quiero separar memoria, artefactos y verdad canónica, para evitar que la AI corrompa el system of record.
47. Como futuro agente especialista, quiero poder consumir el Discovery Brief y observaciones del stream, para trabajar sobre artefactos compartidos y no solo prompt context.
---
Implementation Decisions
- El primer agente canónico sigue siendo el Discovery Completion Agent.
- El primer artefacto canónico sigue siendo el Discovery Brief.
- El workspace será la surface principal del brief.
- Chat seguirá siendo una surface secundaria de explicación/interrogación, no la principal.
- El nuevo workspace debe priorizar una experiencia artifact-first y review-first, no form-first.
- El formulario actual no desaparece, pero se mueve a una surface secundaria de Structured Capture.
- Los campos y preguntas actuales se mantienen como estructura de fondo, baseline de coverage y target de sugerencias estructuradas.
- El brief debe mostrar explícitamente puntos tipados, no solo prose libre.
- Los tipos iniciales visibles del brief serán:
  - Fact
  - Assumption
  - Conflict
  - Question
  - Recommendation
- El sistema visible se simplificará a pocas primitivas:
  - Discovery Brief
  - Pending Review
  - Evidence
  - Next Actions
- El brief no actualiza verdad canónica directamente.
- El brief puede emitir Workspace Suggestions reviewables.
- Las sugerencias aceptadas actualizan la verdad canónica por el path normal del producto.
- Se usará una AgentSession viva por stream mientras el contexto material siga siendo el mismo.
- Se crearán múltiples AgentRun dentro de una misma session según eventos relevantes.
- Triggers iniciales de run:
  - nueva evidencia
  - procesamiento completado
  - corrección del broker
  - refresh manual
  - cambio material del workspace
- El brief debe versionarse; solo una versión puede estar marcada como current working brief.
- Cada versión debe registrar por qué fue creada.
- Los puntos materiales del brief deben tener provenance explícita.
- Los conflictos entre fuentes deben exponerse, no resolverse silenciosamente.
- Las correcciones humanas sin soporte duro deben aceptarse, pero quedar marcadas como human-asserted.
- El sistema debe aprender principalmente de feedback estructurado de alta señal:
  - accept
  - mark incorrect
  - needs verification
  - add note
  - accept/reject suggestions
- El sistema no debe aprender principalmente de telemetría débil o comportamiento implícito.
- El agente debe usar contexto acotado:
  - stream local
  - same-stream history
  - company/location context
  - dossiers similares
  - approved org knowledge
- El agente no debe acceder por defecto a memoria organizacional amplia sin filtro.
- El conjunto de herramientas debe ser pequeño, estable y orientado a dominio.
- El harness debe ser propiedad de SecondStream y mantenerse model-agnostic.
- Toda memoria, sessions, artifacts y briefs deben persistirse en storage controlado por SecondStream.
- El alcance de este PRD se limita al flujo de workspace/discovery; la expansión AI-native al resto de la plataforma se deja para fases posteriores.
- La UI principal debe mantenerse simple, limpia y poco abrumadora, aunque el sistema subyacente tenga estructura suficiente para memoria, runs y aprendizaje.
---
Testing Decisions
- Una buena prueba debe validar comportamiento observable, no detalles internos de implementación.
- Debe probarse que:
  - el brief se genera/refresca con los triggers correctos
  - el brief no escribe verdad canónica directamente
  - las suggestions aceptadas sí fluyen a la verdad canónica
  - los puntos muestran provenance requerida
  - los conflictos no se resuelven silenciosamente
  - el silencio del usuario no se interpreta como aprobación
  - una nueva versión del brief reemplaza la versión activa sin perder historial
  - las correcciones humanas quedan persistidas con semántica correcta
- Módulos/áreas a probar:
  - lifecycle de AgentSession
  - lifecycle de AgentRun
  - generación/versionado de DiscoveryBrief
  - reglas de WorkspaceSuggestion
  - reglas de provenance/conflict/human-asserted
  - ensamblado de contexto del agente
  - transitions de review/approval
  - surfaces de UI del workspace overview y structured capture
- Prior art:
  - tests actuales de workspace
  - tests de offers
  - tests de discovery sessions / intake
  - tests de agentes existentes donde ya se mockea la ejecución AI
- Debe priorizarse testing en:
  - backend contracts
  - reglas de negocio
  - comportamiento de review
  - renderizado y estados principales de la UI
- No debe dependerse principalmente de tests sobre prompts exactos o strings completos del modelo.
---
Out of Scope
- expansión AI-native a toda la plataforma
- multi-agent workforce completa
- specialist agents adicionales beyond discovery
- mission control global como surface principal
- chat como workflow principal
- ejecución automática de acciones externas
- escritura automática de verdad canónica sin revisión
- sync automático a CRM/marketplace
- reemplazo del modelo transaccional actual
- reemplazo total del dominio Project/Proposal por Stream/Deal
- Evidence Graph completo
- Outcome Ledger completo
- knowledge promotion fully automated
- personalización profunda por tenant con forks del agente
- sandbox/mcp ecosystem amplio en v1
- eliminación total del formulario estructurado actual
---
Further Notes
- Este PRD debe leerse como el primer corte visible de la visión AI-native, no como la visión completa de plataforma.
- La intención no es “añadir AI al workspace”, sino hacer que SecondStream sostenga una comprensión durable y revisable del stream como artefacto del producto.
- La surface principal del v1 debe sentirse más como una working surface sobre un brief vivo que como un formulario o dashboard tradicional.
- La gran simplificación de producto en v1 es:
  - pocas primitivas visibles
  - estructura fuerte detrás
  - mucha claridad operativa arriba
- El formulario sigue siendo útil, pero deja de ser el centro de gravedad del flujo.
- Si el PRD evoluciona a issue formal, el título sugerido sería:
AI-native Stream Workspace v1: Discovery Brief + Discovery Completion Agent
