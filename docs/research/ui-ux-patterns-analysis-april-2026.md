# Análisis de Patrones UI/UX: AI-Native Artifact-First & Review-First
## Productos Analizados - Abril 2026

**Para:** SecondStream Platform  
**Fecha:** Abril 14, 2026  
**Objetivo:** Identificar patrones accionables para diseño de oportunidades → AI proposals → compliance gates → CRM/Marketplace sync

---

## 1. LINEAR

### Patrones Visuales Accionables para SecondStream

**1.1 "Calm UI" - Reducción de Carga Cognitiva**
- **Gradientes de información:** Solo mostrar lo necesario en cada momento. En SecondStream: oportunidades muestran metadata esencial (nombre, status, owner) y revelan detalles on-hover o click.
- **Espaciado generoso:** Linear usa 24-32px entre elementos clave. Aplicar a cards de oportunidades para "respiración visual".
- **Color semántico sutil:** Los estados de review no son badges llamativos, son indicadores de color de 4px en el borde izquierdo.

**1.2 Estados de Review como First-Class Citizens**
- **El patrón "Inbox":** Todo lo que necesita atención humana fluye a un inbox unificado. SecondStream necesita un "Review Hub" donde convergen:
  - Proposals pendientes de aprobación
  - Compliance gates bloqueados
  - AI suggestions que necesitan validación humana
- **Indicadores de confianza:** Linear usa "Triage Intelligence" con sugerencias de labels. SecondStream puede usar "Confidence Score" visual (barra de 1-5) en cada proposal.

**1.3 Representación de Evidence/Decisiones**
- **"Activity Feed" como timeline vertical:** Las decisiones se muestran cronológicamente con:
  - Quién/Qué (agente o humano)
  - Timestamp relativo ("2m ago")
  - Icono de acción (cambio de estado, comentario, AI action)
- **Diffs visuales:** Linear muestra cambios de código con before/after. SecondStream puede mostrar "diffs de proposals" - qué cambió entre versiones de AI.

### Cómo Manejan el Artifact Central
- **El "Issue" como nodo central:** Todo orbita alrededor del issue - comments, commits, PRs, agent actions.
- **Contexto persistente:** Cuando entras a un issue, ves TODO el contexto sin navegación adicional.
- **SecondStream aplicación:** La "Oportunidad" debe ser el nodo central. Desde ella: ver proposal actual, historial de versions, compliance status, sync status a CRM.

### Cómo Manejan Evidence/Sources
- **"Connected by" metadata:** Cada item muestra su fuente (Slack, email, agent, manual).
- **Hover-to-reveal:** Los sources no ocupan espacio hasta que se necesitan.
- **SecondStream aplicación:** Mostrar "sources" de cada proposal (documentos analizados, emails, CRM data) en un panel colapsable lateral.

### Cómo Manejan Review/Aprobación Humana
- **Async-first:** Los reviews no requieren reunión. Se hacen en el flujo de trabajo.
- **Estados explícitos:** Todo tiene estado claro (Backlog → Todo → In Progress → In Review → Done).
- **Assignees claros:** Siempre hay un owner humano, incluso cuando agentes participan.
- **SecondStream aplicación:** 
  - Estados de compliance: Draft → Pending Review → Changes Requested → Approved → Synced
  - Assignment automático basado en tipo de oportunidad

### Cómo Representan al Agente sin ser Chat
- **Avatar + Nombre:** "Codex" tiene avatar distintivo (logo de agente) y nombre propio.
- **Participación en threads:** Los agentes comentan como cualquier usuario, pero con indicador sutil de "AI".
- **Acciones declarativas:** "Codex moved from Todo to In Progress" - no es conversación, es acción.
- **SecondStream aplicación:** 
  - El "Proposal Agent" debe tener identidad visual clara
  - Sus acciones aparecen en el activity feed como "ProposalAgent generated v3 - Confidence: 0.87"
  - No hay chat window - solo acciones en contexto

### Qué Patrones EVITAR de Linear
- ❌ **Keyboard-first extremo:** Linear es muy keyboard-centric. SecondStream debe ser mouse-friendly para usuarios de negocio.
- ❌ **Over-automation:** Linear asume que todo puede ser automático. Compliance requiere control humano explícito.

---

## 2. CLAUDE (Anthropic) - Artifacts Pattern

### Patrones Visuales Accionables para SecondStream

**2.1 "Artifacts" como Centro de Gravedad**
- **El Artifact es el contenido, no la conversación:** Claude genera un artifact (documento, código, visualización) que se renderiza en el centro, mientras el chat queda lateral o colapsado.
- **Visualización in-context:** Los artifacts se muestran donde se necesitan, no en ventanas separadas.
- **SecondStream aplicación:** 
  - El "Proposal" es el artifact central
  - Se renderiza como documento rico (no solo texto)
  - El chat con el AI es secundario o inline (comentarios en el proposal)

**2.2 Modos de Interacción Claros**
- **Ask vs Build vs Research:** Claude tiene modos distintos de interacción:
  - Ask: Conversación tradicional
  - Build: Generación de artifacts
  - Research: Deep analysis con sources
- **SecondStream aplicación:** 
  - Modo "Review": Focus en compliance y aprobación
  - Modo "Build": Generación de proposals
  - Modo "Sync": Conexión con CRM/Marketplace

**2.3 Provenance y Evidence**
- **"Based on" indicators:** Cada artifact muestra de qué documentos/inputs se generó.
- **Sources panel:** Sidebar colapsable con links a fuentes originales.
- **SecondStream aplicación:** 
  - Panel "Evidence" en cada proposal mostrando:
    - Documentos analizados (con links)
    - Emails procesados
    - CRM data consultada
    - Web research hecha

### Cómo Manejan el Artifact Central
- **Artifacts son first-class:** Tienen su propia URL, se pueden compartir, versionar, y editar.
- **No son mensajes de chat:** Son entidades persistentes y estructuradas.
- **SecondStream aplicación:** 
  - Cada proposal tiene URL única `/opportunities/[id]/proposals/[version]`
  - Versionado explícito (v1, v2, v3)
  - Estado persistente (no se pierde al cerrar sesión)

### Cómo Manejan Evidence/Sources
- **Inline citations:** Los artifacts pueden incluir citas [1], [2] que linkean a sources.
- **Hover cards:** Hover sobre una cita muestra preview del source.
- **SecondStream aplicación:** 
  - Citas inline en proposals: "Basado en el requerimiento del cliente [1] y las capabilities de [2]..."
  - [1] → Email del cliente
  - [2] → Internal capability database

### Cómo Manejan Review/Aprobación Humana
- **Human-in-the-loop:** Los artifacts grandes requieren aprobación antes de publicarse.
- **Draft mode:** Los artifacts pueden estar en draft antes de compartirse.
- **SecondStream aplicación:** 
  - Estado "Draft" para proposals - solo visible para el creador
  - "Submit for Review" - transición explícita
  - Aprovers designados por tipo de oportunidad

### Cómo Representan al Agente sin ser Chat
- **Claude no es un "chatbot":** Es un "thinking partner" que colabora en artifacts.
- **Acciones sobre el artifact:** "Improve writing", "Add section", "Make it shorter" - son acciones, no conversación.
- **SecondStream aplicación:** 
  - El ProposalAgent se representa como colaborador en el documento
  - Acciones rápidas: "Improve proposal", "Add compliance section", "Adjust pricing"
  - Feedback contextual: seleccionar texto y pedir cambios

### Qué Patrones EVITAR de Claude
- ❌ **Sobre-reliance en artifacts:** No todo debe ser un artifact completo. A veces solo se necesita una respuesta rápida.
- ❌ **Chat como default:** Aunque Claude reduce el chat, aún está presente. SecondStream puede eliminarlo completamente para ciertos flujos.

---

## 3. NOTION AI

### Patrones Visuales Accionables para SecondStream

**3.1 AI que respeta el Document-First**
- **AI es "inline":** Aparece donde se necesita, no en ventanas separadas.
- **No rompe el flujo:** El usuario continúa trabajando en su documento mientras el AI opera.
- **SecondStream aplicación:** 
  - AI suggestions aparecen como "highlights" o "comments" en el proposal
  - No interrumpen la lectura del documento
  - Aceptar/Rechazar sin salir del flujo

**3.2 "Agents" como Entidades Configurables**
- **Custom Agents:** Notion permite crear agents especializados con triggers específicos.
- **Credits system:** Uso de AI medido en credits, no unlimited.
- **SecondStream aplicación:** 
  - Agents configurables por tipo de oportunidad:
    - "Enterprise Agent" para deals grandes
    - "SMB Agent" para deals pequeños
  - Quota de AI por usuario/equipo

**3.3 "Enterprise Search" con Permissions**
- **Search across apps:** Glean integra búsqueda en Slack, Drive, GitHub, etc.
- **Permissions-respecting:** Solo muestra resultados a los que el usuario tiene acceso.
- **SecondStream aplicación:** 
  - Búsqueda unificada: CRM, Email, Documents, Past Proposals
  - Si un usuario no tiene acceso al CRM, no ve ese data

### Cómo Manejan el Artifact Central
- **Página como unidad:** Todo vive en páginas que pueden contener cualquier cosa.
- **Bases de datos con vistas:** Múltiples vistas del mismo data (table, board, calendar).
- **SecondStream aplicación:** 
  - La oportunidad es una "página" rica
  - Múltiples vistas: Pipeline view, Detail view, Review view

### Cómo Manejan Evidence/Sources
- **AI citations con badges:** "Verified" badge para páginas verificadas.
- **Appears in AI citations:** Indicador de que una página fue usada por AI.
- **SecondStream aplicación:** 
  - Badge "Used in Proposal" para documentos fuente
  - Indicador de "Last updated" para freshness

### Cómo Manejan Review/Aprobación Humana
- **Comments as threads:** Los comentarios son conversaciones, no solo anotaciones.
- **@mentions:** Llamar la atención de reviewers específicos.
- **SecondStream aplicación:** 
  - Thread-based commenting en proposals
  - @mentions aprobadores automáticos
  - Estados de review por sección (no solo documento completo)

### Cómo Representan al Agente sin ser Chat
- **Agents como "teammates":** "Notion Agent", "Custom Agents" aparecen como usuarios.
- **Avatares distintivos:** Icons diferentes para diferentes agents.
- **SecondStream aplicación:** 
  - ProposalAgent con avatar consistente
  - ComplianceAgent separado (diferente responsabilidad)
  - SyncAgent para CRM/Marketplace

### Qué Patrones EVITAR de Notion
- ❌ **Flexibility overload:** Notion da demasiada flexibilidad. SecondStream necesita opinionated workflows para compliance.
- ❌ **AI en todas partes:** Notion tiene AI en cada esquina. SecondStream debe ser más intencional.

---

## 4. HARVEY (Legal AI)

### Patrones Visuales Accionables para SecondStream

**4.1 Domain-Specific Language**
- **Lenguaje del usuario:** Harvey usa terminología legal ("Due Diligence", "Contract Analysis").
- **No generic AI:** El producto se siente como herramienta legal, no como chatbot legal.
- **SecondStream aplicación:** 
  - Lenguaje de negocio: "Deal Flow", "Proposal", "Compliance Gate"
  - No decir "AI generated" sino "Proposal crafted" o "Analysis completed"

**4.2 "Vault" - Document Management Seguro**
- **Almacenamiento de documents como asset:** Los documents subidos son first-class citizens.
- **Bulk analysis:** Análisis de múltiples documents simultáneamente.
- **SecondStream aplicación:** 
  - "Document Vault" para cada oportunidad
  - Drag & drop de RFPs, emails, attachments
  - Análisis automático al subir

**4.3 "Workflow Agents" - Agents Especializados**
- **Pre-built workflows:** Agents configurados para tareas específicas de legal.
- **Custom workflows:** Crear agents personalizados.
- **SecondStream aplicación:** 
  - Workflow "RFP to Proposal" - RFP entra, proposal sale
  - Workflow "Compliance Check" - Proposal entra, approval/rejection sale
  - Workflow "CRM Sync" - Proposal approved, CRM updated

### Cómo Manejan el Artifact Central
- **El documento legal es el centro:** Todo análisis, comparación, y draft apunta al documento.
- **Versioning crítico:** Los documents legales tienen version history completo.
- **SecondStream aplicación:** 
  - Versionado de proposals obligatorio
  - Comparación side-by-side de versiones
  - "Revert to v2" capability

### Cómo Manejan Evidence/Sources
- **Grounding en sources de confianza:** Las respuestas se basan en documents de la firma.
- **Citations a precedentes:** Referencias a casos/documentos previos.
- **SecondStream aplicación:** 
  - Proposals basados SOLO en documents de la oportunidad
  - Citations a proposals históricas similares
  - "Based on your CRM data..."

### Cómo Manejan Review/Aprobación Humana
- **Human review gates:** Los outputs de AI pasan por review humano antes de usar.
- **Confidence thresholds:** Si confidence es bajo, requiere más review.
- **SecondStream aplicación:** 
  - Auto-approval si confidence > 0.9 y cumple todas las reglas
  - Human review required si confidence < 0.9 o hay alertas de compliance
  - Escalation paths claros

### Cómo Representan al Agente sin ser Chat
- **AI es "copilot", no piloto:** El lawyer siempre tiene control.
- **Suggestive, no prescriptive:** El AI sugiere, el humano decide.
- **SecondStream aplicación:** 
  - ProposalAgent propone, Account Executive aprueba
  - ComplianceAgent detecta riesgos, Compliance Officer decide
  - Nunca auto-sync a CRM sin aprobación explícita

### Qué Patrones EVITAR de Harvey
- ❌ **UI tradicional corporativo:** Harvey es muy "enterprise". SecondStream puede ser más moderno/clean.
- ❌ **Complejidad legal:** No replicar la complejidad de workflows legales en SecondStream.

---

## 5. GLEAN (Enterprise AI Search)

### Patrones Visuales Accionables para SecondStream

**5.1 "Enterprise Graph" - Conexiones Visibles**
- **Visualización de relaciones:** Quién trabajó en qué, qué documents están relacionados.
- **Personal Graph:** Cada usuario tiene su propio contexto.
- **SecondStream aplicación:** 
  - "Related Opportunities" - deals similares o relacionados
  - "People involved" - stakeholders identificados
  - "Document web" - visualización de qué documents se relacionan

**5.2 "Provenance" - Dónde viene la información**
- **Source badges:** Cada resultado de búsqueda muestra su fuente.
- **Freshness indicators:** "Updated 2d ago" para saber si la info es reciente.
- **SecondStream aplicación:** 
  - Cada dato en un proposal muestra su source
  - "Data freshness" score para el proposal completo
  - Alertas si el source data es muy viejo

**5.3 "Deep Research" - Investigación Profunda**
- **AI que investiga across sources:** No solo busca, sino que sintetiza.
- **Research reports:** Outputs estructurados como reporte.
- **SecondStream aplicación:** 
  - "Deep Research" mode para oportunidades complejas
  - Reporte de inteligencia de competencia
  - Análisis de customer fit

### Cómo Manejan Evidence/Sources
- **100+ connectors:** Integraciones nativas con todo el stack empresarial.
- **Permissions enforcement:** Respeta los permisos de las apps conectadas.
- **SecondStream aplicación:** 
  - Conectores a CRM (Salesforce/HubSpot), Email (Gmail/Outlook), Documents (Drive/SharePoint)
  - Si un doc es privado en Drive, es privado en SecondStream

### Cómo Manejan Review/Aprobación Humana
- **Answer verification:** Los usuarios pueden verificar/corregir respuestas de AI.
- **Feedback loops:** "Was this helpful?" para mejorar el AI.
- **SecondStream aplicación:** 
  - "Approve sources" - verificar que los documents usados son correctos
  - "Mark as reviewed" para compliance
  - Feedback loop en proposal quality

### Cómo Representan al Agente sin ser Chat
- **"Assistant" como capability, no como persona:** Glean Assistant es una función.
- **Results first, agent second:** El focus está en la información, no en el AI.
- **SecondStream aplicación:** 
  - El AI es invisible cuando todo funciona bien
  - Solo aparece cuando hay acción requerida o pregunta
  - "Magic" que sucede en background

### Qué Patrones EVITAR de Glean
- ❌ **Search-centric:** Glean es principalmente search. SecondStream es workflow-driven.
- ❌ **Overwhelming connectors:** Demasiadas integraciones pueden confundir. Focus en core: CRM + Email + Docs.

---

## 6. PERPLEXITY

### Patrones Visuales Accionables para SecondStream

**6.1 "Answer" + "Sources" Side-by-Side**
- **Layout de dos paneles:** La respuesta a la izquierda, las fuentes a la derecha.
- **Citations numeradas:** [1], [2], [3] en la respuesta linkean a fuentes.
- **SecondStream aplicación:** 
  - Proposal a la izquierda, Evidence Panel a la derecha
  - Citations clickeables a documents/email originales
  - Sources verificables al instante

**6.2 "Pro Search" - Investigación Multi-paso**
- **Iteración visible:** El usuario ve los pasos que el AI está tomando.
- **Progress indicators:** "Searching...", "Analyzing...", "Synthesizing..."
- **SecondStream aplicación:** 
  - "Research Mode" para oportunidades complejas
  - Visible steps: "Scanning documents...", "Analyzing requirements...", "Matching capabilities...", "Drafting proposal..."
  - Cancel/Modify durante cualquier step

**6.3 "Related Questions" - Exploración**
- **Follow-ups sugeridos:** El AI sugiere las siguientes preguntas naturales.
- **SecondStream aplicación:** 
  - "Related actions" después de generar proposal:
    - "Add pricing details"
    - "Check compliance requirements"
    - "Compare with similar won deals"

### Cómo Manejan Evidence/Sources
- **Sources con previews:** Cada fuente tiene título, URL, y snippet.
- **Recency badges:** "1 week ago", "1 year ago" para contexto de freshness.
- **SecondStream aplicación:** 
  - Evidence panel con thumbnails/previews de documents
  - Date badges en cada source
  - "Source reliability" indicator

### Qué Patrones EVITAR de Perplexity
- ❌ **Chat-first:** Perplexity aún es muy chat-centric. SecondStream debe ser más document-centric.
- ❌ **Web search default:** Perplexity busca en web. SecondStream debe buscar SOLO en data interna.

---

## 7. CURSOR

### Patrones Visuales Accionables para SecondStream

**7.1 "Composer" - Workspace AI-Native**
- **IDE integrado:** El AI opera dentro del workspace, no en ventana separada.
- **Contexto implícito:** El AI "sabe" qué archivo está abierto sin decirlo.
- **SecondStream aplicación:** 
  - Proposal editor con AI integrado (no popup)
  - AI que conoce el contexto de la oportunidad
  - Suggestions contextuales inline

**7.2 "Agent Mode" vs "Ask Mode" vs "Tab Mode"**
- **Niveles de autonomía:** El usuario elige cuánto control ceder al AI.
  - Tab: Autocomplete (mínimo control)
  - Ask: Pregunta/respuesta (medio control)
  - Agent: Full task delegation (máximo control)
- **SecondStream aplicación:** 
  - "Suggest mode": AI sugiere cambios, usuario acepta/rechaza
  - "Draft mode": AI escribe proposal, usuario edita
  - "Auto mode": AI genera, revisa compliance, y prepara para sync (con aprobación humana final)

**7.3 "BugBot" - Review Automático**
- **Code review por AI:** El AI revisa PRs y encuentra bugs.
- **Inline comments:** Los hallazgos aparecen inline en el código.
- **SecondStream aplicación:** 
  - "ComplianceBot" que revisa proposals antes de human review
  - Inline alerts: "Este pricing no cumple con política de descuentos"
  - Pre-check antes de submit

### Cómo Manejan el Artifact Central
- **El código es el centro:** Todo (chat, errores, tests) orbita alrededor del archivo actual.
- **Side panels:** Chat, file tree, terminal son paneles laterales.
- **SecondStream aplicación:** 
  - Proposal document como centro
  - Chat/history como sidebar
  - Compliance status como bottom bar

### Cómo Manejan Evidence/Sources
- **Codebase indexing:** El AI indexa y entiende toda la codebase.
- **Semantic search:** Buscar por significado, no solo keywords.
- **SecondStream aplicación:** 
  - Indexado de CRM data, emails, documents históricos
  - Semantic search: "deals similares a este cliente en industria X"

### Cómo Manejan Review/Aprobación Humana
- **Diffs claros:** Antes de aplicar cambios, se muestra el diff.
- **Accept/Reject granular:** Puedes aceptar/rechazar cambios individuales.
- **SecondStream aplicación:** 
  - Diff view para versiones de proposals
  - Accept/Reject por sección
  - "Apply all" solo después de review completo

### Cómo Representan al Agente sin ser Chat
- **"Cursor" como entidad:** El agente tiene nombre propio y avatar.
- **Presencia en múltiples superficies:** IDE, Slack, GitHub, CLI.
- **SecondStream aplicación:** 
  - ProposalAgent presente en webapp, Slack, y email
  - Avatar consistente en todas las superficies
  - Contexto compartido entre surfaces

### Qué Patrones EVITAR de Cursor
- ❌ **Developer-centric:** Cursor es para devs. SecondStream es para business users.
- ❌ **Terminal/commands:** No usar CLI patterns para SecondStream.

---

## 8. V0 / BOLT / LOVABLE (AI App Builders)

### Patrones Visuales Accionables para SecondStream

**8.1 "Prompt. Build. Ship."**
- **Ciclo rápido:** Input simple → Output funcional → Deploy inmediato.
- **Iteración conversacional:** Cambios via chat, aplicados inmediatamente.
- **SecondStream aplicación:** 
  - "Describe la oportunidad" → Proposal generado → Listo para review
  - Iteración: "Agrega sección de pricing" → Se agrega inmediatamente

**8.2 "Design Systems" Integration**
- **Templates como punto de partida:** No empezar de cero.
- **Brand consistency:** Los outputs respetan el design system.
- **SecondStream aplicación:** 
  - Templates de proposals por tipo de deal
  - Branding consistente (colores, logos, fonts)
  - "Proposal library" como templates

**8.3 "Design Mode" - Fine-tuning Visual**
- **Controls visuales:** Sliders, pickers para ajustar sin código.
- **Live preview:** Cambios en tiempo real.
- **SecondStream aplicación:** 
  - "Adjust proposal tone": slider de formal ↔ casual
  - "Emphasis on pricing": toggle para expandir/contraer sección
  - Preview en tiempo real

### Qué Patrones EVITAR
- ❌ **Code-centric:** Estos tools generan código. SecondStream genera business proposals.
- ❌ **Demasiado creativo:** El output debe ser predecible y compliant, no "creativo".
- ❌ **Deploy to web:** SecondStream "deploys" a CRM/Marketplace, no a hosting web.

---

## SÍNTESIS: PATRONES CRÍTICOS PARA SECONDSTREAM

### 1. Artifact-First (de Claude/Linear)
- ✅ El proposal es el centro de gravedad
- ✅ Chat es secundario o invisible
- ✅ Versionado explícito

### 2. Evidence Visible (de Perplexity/Glean)
- ✅ Sources siempre visibles y verificables
- ✅ Citations inline clickeables
- ✅ Freshness indicators

### 3. Review Workflows (de Linear/Harvey)
- ✅ Estados claros de review
- ✅ Assignment automático
- ✅ Compliance gates explícitos

### 4. Agent como Colaborador (de Cursor/Notion)
- ✅ Identidad visual clara para agents
- ✅ Acciones declarativas, no conversación
- ✅ Presente en múltiples surfaces

### 5. Calm UI (de Linear)
- ✅ Minimalista, generoso espaciado
- ✅ Estados semánticos sutiles
- ✅ Reducción de carga cognitiva

### 6. Domain Language (de Harvey)
- ✅ Lenguaje de negocio, no de AI
- ✅ Workflows opinionated
- ✅ Security/compliance first-class

---

## RECOMENDACIONES DE IMPLEMENTACIÓN

### Para el MVP de SecondStream:

1. **Implementar Artifact-First:** El proposal debe ser el objeto central, con URL propia, versionado, y estado persistente.

2. **Evidence Panel:** Sidebar derecho siempre visible mostrando sources de la proposal actual.

3. **Review States:** Workflow claro: Draft → AI Generated → Under Review → Approved → Synced.

4. **Agent Identity:** ProposalAgent con avatar consistente, acciones en activity feed, nunca como chat.

5. **Calm UI:** Usar espaciado generoso (24-32px), estados sutiles (bordes no badges), gradiente de información.

6. **Compliance Integration:** Gates de compliance no son afterthought, son parte del workflow principal.

---

*Análisis realizado para SecondStream Platform - Abril 2026*
