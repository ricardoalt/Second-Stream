# Google Workspace x SecondStream

Base de investigación para planear una integración realista y útil  
Fecha: abril 2026

---

## 1. Objetivo de este documento

Este documento consolida la investigación hecha sobre Google Workspace para usarla como **base de planificación real** en SecondStream.

La idea NO es vender humo ni crear expectativas falsas. La idea es responder con claridad:

- qué sí se puede hacer,
- qué no conviene prometer,
- cómo debería conectarse técnicamente,
- qué productos de Google Workspace tienen más sentido para SecondStream,
- qué patrones usan otras startups,
- y cuál debería ser nuestro roadmap.

---

## 2. Resumen ejecutivo

### Conclusión principal

Sí, **SecondStream puede integrarse de forma seria con Google Workspace**.

Pero la estrategia correcta NO es:

> “darle acceso total de Workspace a los agentes de IA”.

La estrategia correcta es:

> **Google Workspace APIs → Connector Layer → Datos normalizados en SecondStream → Tools internas → Agentes de IA**

### Qué significa eso

- **Google Chat** encaja mejor para comunicación operativa por stream.
- **Gmail** encaja mejor como fuente de señales, contexto y evidencia documental.
- **Drive** encaja muy bien para archivos, compliance y documentación.
- **Directory/Admin SDK** encaja para identidad, estructura del tenant y permisos.
- **Events API + Gmail watch/history** encajan para sincronización reactiva.

### Recomendación estratégica

1. **Chat primero** para colaboración viva por stream.
2. **Drive** para evidencias y documentos.
3. **Gmail metadata-first** para señales y clasificación.
4. Después, **RAG / retrieval / tools internas para agentes**.

---

## 3. Qué necesita el negocio

La visión planteada por clientes es algo como esto:

- Dentro de un **stream detail** debe existir comunicación entre **org-admin** y **field-agent**.
- Idealmente esa comunicación debería estar respaldada por **Google Workspace**.
- La plataforma debería poder estar conectada al Workspace del cliente.
- Los agentes de IA deberían poder usar esa información para:
  - detectar oportunidades,
  - crear o sugerir waste streams,
  - identificar clients/contacts/locations,
  - analizar correos,
  - resumir conversaciones,
  - detectar riesgos o gaps de compliance.

### Traducción realista

Esto no significa “la IA ve todo Workspace”.  
Significa:

- conectar fuentes autorizadas,
- sincronizar datos relevantes,
- normalizarlos al dominio de SecondStream,
- y exponerlos a los agentes mediante herramientas seguras y limitadas.

---

## 4. Qué ya existe en SecondStream y por qué esto importa

La investigación del repo mostró que SecondStream YA tiene una base muy buena para esto.

### Entidades y piezas clave del backend

- `Project`
- `Offer`
- `Company`
- `Location`
- `DiscoverySession`
- `ProjectFile`
- `IntakeNote`
- `ImportRun`
- `ImportItem`
- `project_data["workspace_v1"]` como espacio flexible para contexto agregado

### Servicios / capacidades ya presentes

- análisis AI de documentos
- análisis AI de notas
- ingesta/intake
- workspace insights
- offer insights
- bulk import / extracción

### Implicación clave

SecondStream NO necesita inventar otro core de IA.  
Lo que necesita es una **capa de conectores externos** que alimente bien el modelo de dominio actual.

---

## 5. Qué sí se puede hacer con Google Workspace

## 5.1 Google Chat

### Qué sí permite

- crear spaces,
- agregar miembros,
- enviar mensajes,
- listar mensajes,
- responder en threads,
- suscribirse a eventos,
- construir Chat apps,
- mostrar cards y flujos interactivos.

### Caso ideal para SecondStream

Usar Chat como canal de colaboración operativa por stream.

### Modelos posibles

#### Opción A — un space por cliente y un thread por stream

**Pros**
- menos espacios
- buena continuidad
- buena para operación diaria

**Contras**
- puede volverse ruidoso si hay muchos streams

#### Opción B — un space por stream

**Pros**
- aislamiento claro
- permisos más simples
- mejor trazabilidad por stream

**Contras**
- demasiados spaces si el volumen crece mucho

### Recomendación

- volumen moderado → **space por cliente + thread por stream**
- volumen alto o sensibilidad fuerte → **space por stream**

---

## 5.2 Gmail

### Qué sí permite

- leer mensajes,
- leer threads,
- leer metadata,
- leer labels,
- sincronización incremental,
- push notifications (`watch`),
- análisis de hilos,
- extracción de señales,
- asociación de emails a entidades del dominio.

### Qué sí podría hacer SecondStream con Gmail

- detectar oportunidades,
- detectar nuevos clients/contacts,
- asociar correos a `Project`, `Offer`, `Company`, `Location`,
- crear `IntakeNote`,
- guardar adjuntos como `ProjectFile`,
- resumir conversaciones,
- generar sugerencias de waste streams.

### Recomendación realista

#### Fase inicial: metadata-first

- from / to
- subject
- labels
- snippet
- thread structure
- participants

#### Fase posterior: body completo

Solo después de definir bien:

- scopes,
- retención,
- seguridad,
- política de uso,
- compliance.

### Limitaciones importantes

- Gmail NO usa Workspace Events API para esto; usa `watch` + `history.list`.
- `watch` expira y hay que renovarlo.
- si se pierde el `historyId`, puede requerir full resync.
- los scopes de Gmail pueden ser **sensibles o restringidos**.

---

## 5.3 Google Drive

### Qué sí permite

- listar archivos,
- leer metadatos,
- leer permisos,
- descargar contenido autorizado,
- sincronizar cambios,
- reaccionar a eventos.

### Encaje en SecondStream

Drive encaja muy bien con:

- `ProjectFile`
- documentación de compliance
- manifests
- proposals
- contratos
- fotos/evidencias
- archivos del cliente

### Recomendación

Drive debería ser de las primeras integraciones, junto con Chat.

---

## 5.4 Admin SDK / Directory

### Qué sí permite

- sincronizar usuarios,
- grupos,
- estructura organizacional,
- admins,
- datos del tenant.

### Encaje en SecondStream

Sirve para:

- mapear org-admin / field-agent,
- entender quién puede ver qué,
- facilitar invitaciones a Chat spaces,
- soportar permisos y colaboración multiusuario.

---

## 5.5 Events y sincronización reactiva

### Workspace Events API

Sirve para eventos de:

- Chat
- Drive
- Meet

### Gmail

Para Gmail hay que usar:

- `watch`
- `history.list`
- sync inicial + incremental

### Conclusión

No existe un solo mecanismo universal para todo Workspace.  
La arquitectura debe aceptar que:

- Chat/Drive/Meet usan un modelo,
- Gmail usa otro.

---

## 6. Qué NO conviene prometer

## 6.1 “La IA podrá ver todo su Google Workspace”

No es una promesa seria.

Lo correcto es decir:

> “La IA puede operar sobre fuentes de Google Workspace explícitamente conectadas, autorizadas y sincronizadas, con permisos controlados por tenant y usuario.”

---

## 6.2 “El thread del stream detail será un thread de Workspace”

Hay que precisar QUÉ producto de Workspace:

- si quieren email → Gmail thread
- si quieren colaboración viva → Chat thread / Chat space

No existe un thread “genérico” de Workspace.

---

## 6.3 “MCP resolverá la integración”

No.

### Realidad

- **APIs** = base de la integración productiva
- **MCP** = interfaz útil para tooling / agents / developer ergonomics
- **CLI** = útil para dev/ops, no para backbone del producto

---

## 6.4 “Podemos usar Vault o Email Audit como base del producto”

No es la estrategia correcta.

- **Vault** → eDiscovery / legal hold / compliance
- **Email Audit** → monitoreo / compliance / auditoría

No son la mejor base para la funcionalidad principal del producto.

---

## 7. Cómo deberían acceder los agentes de IA

## Respuesta corta

Sí, los agentes pueden usar contexto de Workspace.  
Pero NO deberían acceder directamente a Google con libertad total.

### Modelo recomendado

#### Nivel 1 — acceso indirecto y recomendado

El conector sincroniza datos y los transforma al dominio de SecondStream.  
Los agentes trabajan sobre esos datos ya normalizados.

#### Nivel 2 — tools internas controladas

Los agentes usan herramientas como:

- `get_project_workspace_summary(project_id)`
- `list_recent_chat_messages(project_id)`
- `find_related_email_threads(company_id)`
- `search_drive_evidence(project_id, query)`
- `detect_new_waste_stream_candidates(company_id)`

#### Nivel 3 — acceso directo a Google APIs

Técnicamente posible, pero NO recomendable como modelo principal.

### Por qué no conviene el acceso directo

- rompe trazabilidad,
- complica seguridad,
- complica permisos multi-tenant,
- hace más difícil el caching,
- aumenta el riesgo de análisis no reproducibles,
- hace más difícil gobernar costos y cumplimiento.

---

## 8. APIs vs MCP vs CLI

## 8.1 APIs

### Deben ser la base

Usar:

- Gmail API
- Google Chat API
- Drive API
- Admin SDK Directory API
- Workspace Events API

### Ventajas

- autenticación formal,
- scopes,
- estabilidad,
- observabilidad,
- control por tenant,
- integración productiva real.

### Veredicto

**Producción = APIs**

---

## 8.2 MCP

### Dónde sí tiene valor

Como interfaz de tools para agentes.

Ejemplo:

- `secondstream.workspace.search_chat`
- `secondstream.workspace.get_offer_context`
- `secondstream.workspace.find_related_threads`

### Dónde NO debe ser la base

No debería ser la capa principal de integración de datos con Google.

### Veredicto

**MCP = opcional y útil como agent interface, no como backbone de integración**

---

## 8.3 CLI

### Sí sirve para

- pruebas,
- debugging,
- desarrollo,
- operaciones internas.

### No sirve para

- backbone productivo,
- multi-tenant SaaS,
- seguridad fina,
- integración seria de agentes.

### Veredicto

**CLI = no para arquitectura principal del producto**

---

## 9. Patrones observados en otras startups/productos

La investigación comparativa mostró 4 patrones fuertes.

## 9.1 In-place collaboration

Productos:

- Hiver
- Front
- Superhuman
- Reclaim
- Grammarly

### Qué hacen

Operan dentro de Gmail / Calendar / Docs / Chat o muy cerca de esas superficies.

### Lección

Muy buena UX y adopción, pero no reemplaza una capa de datos/control propia.

---

## 9.2 Sync + Index + Search / RAG

Productos:

- Glean
- Notion Enterprise Search
- varias plataformas de enterprise AI

### Qué hacen

- conectan fuentes,
- indexan contenido,
- respetan permisos,
- exponen búsqueda y AI sobre ese contexto.

### Lección

Este es el patrón más fuerte para SecondStream si quiere agentes de IA útiles sobre Workspace.

---

## 9.3 Workflow automation

Productos:

- Zapier
- Clay
- productos de RevOps / ops automation

### Qué hacen

Usan Workspace como:

- trigger,
- source,
- action,
- destination.

### Lección

SecondStream puede usar Workspace tanto como:

- fuente de conocimiento,
- como fuente de automatización/eventos.

---

## 9.4 Contextual UI inside Google

Productos:

- Lucidchart
- Asana
- Grammarly
- Chat apps / add-ons

### Qué hacen

Se incrustan dentro del flujo del usuario con add-ons, extensiones o apps de Chat.

### Lección

Esto sirve como capa UX, pero no sustituye conectores, normalización y retrieval.

---

## 10. Productos analizados y qué nos enseñan

## 10.1 Hiver

### Qué hace

Shared inbox / support platform sobre Gmail.

### Qué enseña

- Gmail sí puede convertirse en espacio colaborativo,
- pero eso no significa que sea el mejor canal para colaboración operativa por stream.

---

## 10.2 Front

### Qué hace

Email colaborativo + omnichannel + workflows + AI.

### Qué enseña

- una comunicación externa puede enriquecerse con colaboración interna,
- pero el modelo está centrado en inbox/ops, no en dominio vertical como SecondStream.

---

## 10.3 Shortwave

### Qué hace

Cliente AI para Gmail.

### Qué enseña

- el valor del AI sobre correo está en resumir, clasificar, buscar y sugerir acciones,
- no necesariamente en reemplazar el dominio del producto.

---

## 10.4 Glean

### Qué hace

Enterprise search + agents + context layer.

### Qué enseña

- el patrón fuerte es **conector + índice + permisos + retrieval + agents**,
- no “agente con acceso libre a las apps”.

---

## 10.5 Notion

### Qué hace

Workspace + AI + enterprise search + agents.

### Qué enseña

- “bring your own context” funciona,
- el contexto conectado debe alimentar al AI layer, no reemplazar la arquitectura del producto.

---

## 10.6 Zapier

### Qué hace

Automatización entre apps.

### Qué enseña

- Workspace también debe verse como superficie de eventos y acciones,
- no solo como repositorio de conocimiento.

---

## 10.7 Clay

### Qué hace

Enrichment y automatización GTM.

### Qué enseña

- Workspace puede ser una superficie operativa, no necesariamente el centro del producto,
- lo importante es cómo los datos alimentan el workflow principal.

---

## 10.8 Lucidchart / Grammarly / Reclaim

### Qué enseñan

- add-ons y UX contextual tienen mucho valor,
- pero normalmente son una capa de experiencia encima de una integración API más base.

---

## 11. Arquitectura recomendada para SecondStream

```text
Google Workspace
  ├─ Gmail API
  ├─ Chat API
  ├─ Drive API
  ├─ Directory API
  ├─ Workspace Events API
  └─ Gmail watch/history

        ↓

Google Workspace Connector Layer
  ├─ auth / tenant connection
  ├─ token storage
  ├─ sync cursors
  ├─ event ingestion
  ├─ normalization
  └─ permission enforcement

        ↓

SecondStream Domain
  ├─ Project
  ├─ Offer
  ├─ Company
  ├─ Location
  ├─ DiscoverySession
  ├─ ProjectFile
  ├─ IntakeNote
  └─ project_data["workspace_v1"]

        ↓

Internal Tool Layer
  ├─ get_project_workspace_summary
  ├─ list_recent_chat_messages
  ├─ find_related_email_threads
  ├─ search_drive_evidence
  └─ detect_waste_stream_candidates

        ↓

AI Agents
  ├─ workspace insights
  ├─ offer insights
  ├─ intake analysis
  ├─ document analysis
  └─ future workspace-aware agents
```

---

## 12. Cómo mapear Google Workspace al dominio de SecondStream

## 12.1 Chat → dominio

- mensajes o threads → `IntakeNote` o timeline contextual
- relación stream/thread → `project_data["workspace_v1"]`
- participantes → usuarios / roles / collaborators

## 12.2 Gmail → dominio

- email thread → contexto de `Company`, `Project`, `Offer`, `Location`
- snippet / resumen → `IntakeNote`
- adjuntos → `ProjectFile`
- señales extraídas → discovery / candidate entities

## 12.3 Drive → dominio

- documentos → `ProjectFile`
- metadata → evidencias, compliance docs, attachments
- estructura relacionada → context linking a proyecto/oferta/company

## 12.4 Directory → dominio

- usuarios y grupos → access model / invitations / ownership
- admins / roles → colaboración y permisos

---

## 13. Qué herramientas deberían tener los agentes

## Recomendación

No exponer Google APIs crudas al agente.

### Tools sugeridas

- `get_stream_workspace_context(stream_id)`
- `get_offer_workspace_context(offer_id)`
- `list_recent_chat_messages(stream_id, limit)`
- `find_related_email_threads(company_id)`
- `search_drive_files(project_id, query)`
- `summarize_workspace_activity(project_id)`
- `extract_contacts_from_workspace(company_id)`
- `detect_new_waste_stream_candidates(company_id)`

### Beneficios

- control de permisos,
- mejor auditoría,
- menor riesgo,
- respuestas reproducibles,
- caché,
- menor complejidad para el runtime de agentes.

---

## 14. Seguridad, permisos y compliance

## Principios recomendados

### 1. mínimo privilegio

Pedir solo los scopes estrictamente necesarios.

### 2. metadata-first cuando sea posible

Especialmente con Gmail.

### 3. opt-in por tenant y por fuente

No asumir que conectar Workspace implica conectar todo.

### 4. trazabilidad

Registrar:

- qué se conectó,
- qué se sincronizó,
- qué agente usó qué fuente,
- qué se generó a partir de qué evidencia.

### 5. retención explícita

Definir si:

- se almacena body completo,
- se almacena solo metadata,
- se almacenan embeddings,
- se almacenan archivos,
- cuánto tiempo se retiene cada cosa.

### 6. límites claros para promesas de AI

Nunca implicar acceso universal o irrestricto.

---

## 15. Recomendación de roadmap

## Fase 1 — Foundations

- conectar Google OAuth / tenant connection
- sincronizar Directory básico
- modelo interno de conexión y tokens
- health/sync status básico

## Fase 2 — Collaboration

- integrar Google Chat
- mapear stream ↔ space/thread
- mostrar actividad reciente en stream detail
- resumen AI del hilo

## Fase 3 — Evidence

- integrar Drive
- ingest de archivos hacia `ProjectFile`
- clasificación y linking a proyecto/oferta/company

## Fase 4 — Gmail signals

- Gmail metadata-first
- thread association engine
- snippets, headers, labels, participants
- creación de `IntakeNote` y candidate entities

## Fase 5 — AI retrieval / tools

- internal tool layer
- retrieval contextual por project/offer/company
- summarization multi-fuente
- detección automática de waste stream candidates

## Fase 6 — UX contextual

- Chat app
- add-ons o surfaces contextuales si hay demanda real
- approvals / actions in-place

---

## 16. Prioridades recomendadas

## P0

- Connector Layer base
- Auth / tenant connection
- Directory básico
- Chat integration

## P1

- Drive integration
- Gmail metadata-first
- internal tools para agentes

## P2

- body completo de Gmail
- add-ons / UX in-place
- flows más complejos de automation

---

## 17. Decisiones recomendadas desde ya

## Decisión 1

**No diseñar “agentes con acceso libre a Workspace”.**  
Diseñar **agents con tools internas controladas**.

## Decisión 2

**Chat será el primer canal de colaboración por stream.**

## Decisión 3

**Gmail entrará como fuente documental/señales, empezando por metadata-first.**

## Decisión 4

**Drive será la fuente principal de evidencia/documentos.**

## Decisión 5

**La arquitectura principal será API-first, no MCP-first, ni CLI-first.**

---

## 18. Preguntas abiertas para la siguiente fase de planificación

Estas preguntas deben resolverse antes de pasar a diseño técnico detallado.

### Producto

- ¿el stream detail debe mostrar Chat embebido o solo resumen + actividad?
- ¿queremos colaboración “live” o solo sincronización de contexto?
- ¿el usuario debe escribir desde SecondStream hacia Chat/Gmail o solo leer?

### Permisos

- ¿qué rol puede conectar Workspace?
- ¿qué rol puede activar Gmail full-body?
- ¿los field-agents verán todo el contexto o una parte?

### Datos

- ¿qué guardamos persistido y qué solo consultamos on-demand?
- ¿guardaremos embeddings?
- ¿guardaremos body completo o solo resumen/snippet?

### Experiencia de IA

- ¿qué agentes concretos queremos primero?
- ¿queremos sugerencias o acciones automáticas?
- ¿qué grado de autonomía aceptamos?

### Go-to-market

- ¿la integración Workspace será feature premium / enterprise?
- ¿arrancamos con OAuth por usuario o diseño enterprise-first?

---

## 19. Recomendación final

La mejor lectura de toda la investigación es esta:

> SecondStream no debe intentar “ser Google Workspace”.  
> Debe usar Google Workspace como fuente de colaboración, evidencia y contexto para fortalecer su flujo principal de waste streams, offers, compliance y sync.

### Traducción práctica

SecondStream debería parecerse a:

- **Glean** en su capa de contexto/retrieval,
- **Zapier** en automatización/eventos,
- **Front/Hiver** en cierta colaboración sobre comunicación,
- pero aplicado de forma vertical al dominio de residuos, oportunidades y compliance.

---

## 20. Siguiente entregable recomendado

Con base en este documento, el siguiente paso útil sería crear una **matriz de planificación concreta** con:

- producto de Google Workspace,
- caso de uso,
- valor para usuario,
- complejidad técnica,
- riesgo de compliance,
- entidades del repo afectadas,
- servicios backend nuevos,
- tools para agentes,
- prioridad,
- y fase de roadmap.

Ese documento ya serviría para bajar esta investigación a un plan ejecutable.
